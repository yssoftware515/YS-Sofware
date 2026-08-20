<?php

namespace App\Domains\Auth\Actions;

use App\Domains\Auth\DTOs\LoginDTO;
use App\Domains\Auth\Models\User;
use App\Domains\Auth\Services\TurnstileService;
use App\Domains\System\Services\AuditService;
use App\Exceptions\Auth\InvalidCredentialsException;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Validation\ValidationException;

class LoginAction
{
    /**
     * Precomputed bcrypt hash (cost 12) of a throwaway secret — never
     * derived at runtime. When no user matches the email, Hash::check
     * still runs against this REAL hash so the response time is
     * indistinguishable from a wrong-password attempt on an existing
     * account (VULN-11 timing oracle).
     */
    public const DUMMY_PASSWORD_HASH = '$2y$12$DXHEre/.FvV7R1YQLh5qtedBUJrw0svX9CDT5CcCW.Vs/9S8Q42tC';

    public function __construct(
        private readonly AuditService $auditService,
        private readonly TurnstileService $turnstile,
    ) {}

    /**
     * @throws InvalidCredentialsException
     * @throws ValidationException
     */
    public function execute(LoginDTO $dto): array
    {
        // GAP-01: CAPTCHA verification precedes ALL authentication
        // logic — no user lookup, no bcrypt work, no rate-limit budget
        // burn for a request that fails the check. Disabled by default
        // (TURNSTILE_ENABLED=false), in which case this is a no-op and
        // the login flow is byte-for-byte unchanged.
        if (! $this->turnstile->verify($dto->turnstileToken, $dto->ipAddress)) {
            throw ValidationException::withMessages([
                'turnstile' => ['CAPTCHA verification failed. Please try again.'],
            ]);
        }

        $this->checkRateLimit($dto);

        $user = User::with('role')
            ->where('email', $dto->email)
            ->first();

        // VULN-03: a freshly created admin signs in once with the
        // one-time welcome token from their email (hash-compared in
        // constant time). The token is consumed on success; afterwards
        // only the account password works.
        $welcomeTokenValid = $user !== null
            && $user->welcome_token_hash !== null
            && $user->welcome_token_expires_at?->isFuture() === true
            && hash_equals($user->welcome_token_hash, hash('sha256', $dto->password));

        // VULN-11: Hash::check ALWAYS executes — against the stored
        // hash when a user exists, against the precomputed cost-12
        // dummy hash when it does not. The old `||` short-circuit let
        // a nonexistent email skip bcrypt entirely (~200 ms delta →
        // account enumeration).
        $passwordValid = Hash::check($dto->password, $user->password ?? self::DUMMY_PASSWORD_HASH);

        if (! $user || (! $welcomeTokenValid && ! $passwordValid)) {
            $this->hitRateLimits($dto, $user?->id);

            $this->auditService->log(
                action: 'auth.login_failed',
                resourceType: 'User',
                resourceId: $user?->id,
                context: ['email' => $dto->email, 'ip' => $dto->ipAddress, 'reason' => 'invalid_credentials'],
            );

            throw new InvalidCredentialsException;
        }

        // VULN-12: a disabled account must be indistinguishable from bad
        // credentials — identical 401 INVALID_CREDENTIALS body, same
        // rate-limit treatment, same timing profile (bcrypt already ran).
        // The real reason is recorded ONLY in the audit trail, never in
        // any client-facing response.
        if (! $user->isActive()) {
            $this->hitRateLimits($dto, $user->id);

            $this->auditService->log(
                action: 'auth.login_failed',
                resourceType: 'User',
                resourceId: $user->id,
                context: ['email' => $dto->email, 'ip' => $dto->ipAddress, 'reason' => 'account_disabled'],
            );

            throw new InvalidCredentialsException;
        }

        $this->clearRateLimits($dto);

        // Consume the one-time token — a used or expired token is dead.
        if ($welcomeTokenValid) {
            $user->update([
                'welcome_token_hash' => null,
                'welcome_token_expires_at' => null,
            ]);
        }

        // Update login metadata
        $user->update([
            'last_login_at' => now(),
            'last_login_ip' => $dto->ipAddress,
        ]);

        // Revoke previous tokens to enforce single-session policy
        $user->tokens()->delete();

        $token = $user->createToken(
            name: 'admin-session',
            abilities: ['admin'],
            expiresAt: $dto->remember ? now()->addDays(30) : now()->addHours(8),
        );

        $this->auditService->log(
            action: 'auth.login',
            resourceType: 'User',
            resourceId: $user->id,
            userId: $user->id,
        );

        return [
            'user' => $user,
            'token' => $token->plainTextToken,
            'expires_at' => $token->accessToken->expires_at,
        ];
    }

    /**
     * Two independent windows protect the login endpoint:
     *
     * 1. per-IP   — limits a single source spraying many accounts;
     * 2. per-email — limits credential stuffing against ONE account
     *    even when the attacker rotates IPs (or shares one NAT egress).
     *
     * Keys are SHA-256 hashes of the raw values so no PII (IP, email)
     * is ever written into the cache store.
     */
    private function checkRateLimit(LoginDTO $dto): void
    {
        $maxAttempts = (int) config('security.rate_limits.auth_attempts', 5);
        $maxPerEmail = (int) config('security.rate_limits.auth_per_email', 10);

        if (RateLimiter::tooManyAttempts($this->ipKey($dto), $maxAttempts)
            || RateLimiter::tooManyAttempts($this->emailKey($dto), $maxPerEmail)) {
            $seconds = min(
                RateLimiter::availableIn($this->ipKey($dto)),
                RateLimiter::availableIn($this->emailKey($dto))
            );
            throw new InvalidCredentialsException(
                "Too many login attempts. Try again in {$seconds} seconds.",
                429
            );
        }
    }

    private function hitRateLimits(LoginDTO $dto, ?string $userId = null): void
    {
        RateLimiter::hit($this->ipKey($dto));

        // VULN-15: the per-email lockout window escalates with the 24h
        // failure counter — 60s, then 5m, then 30m. RateLimiter::hit()
        // only sets the :timer on the FIRST hit of a burst, so the
        // window must be re-armed explicitly with the escalated tier.
        $failures24h = RateLimiter::attempts($this->emailEscalationKey($dto)) + 1;
        $tier = $this->lockoutTier($failures24h);
        $previousTier = $this->lockoutTier($failures24h - 1);

        RateLimiter::hit($this->emailKey($dto), $tier['window_seconds']);
        Cache::put(
            $this->emailKey($dto).':timer',
            now()->getTimestamp() + $tier['window_seconds'],
            $tier['window_seconds']
        );
        RateLimiter::hit($this->emailEscalationKey($dto), $this->escalationWindowSeconds());

        if ($tier['level'] > $previousTier['level']) {
            $this->auditService->log(
                action: 'auth.login_lockout_escalated',
                resourceType: 'User',
                resourceId: $userId,
                context: [
                    'email' => $dto->email,
                    'ip' => $dto->ipAddress,
                    'failures_24h' => $failures24h,
                    'window_seconds' => $tier['window_seconds'],
                ],
            );
        }
    }

    private function clearRateLimits(LoginDTO $dto): void
    {
        // VULN-15: only the caller's own per-IP budget is cleared on
        // success. The per-email counters are attacker-controlled — a
        // legitimate success must not reset the budget an attacker just
        // burned, or targeted lockout churn becomes trivial to repeat.
        RateLimiter::clear($this->ipKey($dto));
    }

    /**
     * Lockout window (seconds) for a given 24h failure count.
     */
    private function lockoutTier(int $failures24h): array
    {
        $tiers = (array) config('security.auth_lockout.tiers', []);

        foreach (array_values($tiers) as $level => $tier) {
            if ($failures24h <= (int) $tier['failures']) {
                return [
                    'level' => $level + 1,
                    'window_seconds' => (int) $tier['window_seconds'],
                ];
            }
        }

        $last = end($tiers);

        return [
            'level' => count($tiers),
            'window_seconds' => (int) $last['window_seconds'],
        ];
    }

    private function escalationWindowSeconds(): int
    {
        return (int) config('security.auth_lockout.escalation_window_hours', 24) * 3600;
    }

    private function ipKey(LoginDTO $dto): string
    {
        return 'login-ip:'.hash('sha256', $dto->ipAddress);
    }

    private function emailKey(LoginDTO $dto): string
    {
        return 'login-email:'.hash('sha256', strtolower(trim($dto->email)));
    }

    private function emailEscalationKey(LoginDTO $dto): string
    {
        return 'login-email-escalation:'.hash('sha256', strtolower(trim($dto->email)));
    }
}
