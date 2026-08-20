<?php

namespace App\Domains\Auth\Actions;

use App\Domains\Auth\Models\PasswordResetToken;
use App\Domains\Auth\Models\User;
use App\Mail\PasswordResetMailable;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\RateLimiter;
use Symfony\Component\HttpKernel\Exception\TooManyRequestsHttpException;

class ForgotPasswordAction
{
    /**
     * @throws TooManyRequestsHttpException
     */
    public function execute(string $email): void
    {
        // VULN-13: per-email budget (3/hour) — an attacker rotating IPs
        // cannot hammer one mailbox with reset emails. Key is the SHA-256
        // of the normalized email, so no PII lands in the cache store.
        $key = 'forgot-email:'.hash('sha256', strtolower(trim($email)));
        $maxPerEmail = (int) config('security.rate_limits.forgot_per_email', 3);

        if (RateLimiter::tooManyAttempts($key, $maxPerEmail)) {
            throw new TooManyRequestsHttpException(
                RateLimiter::availableIn($key)
            );
        }

        // The budget is burned BEFORE the existence check so a nonexistent
        // address behaves identically — no enumeration, no oracle.
        RateLimiter::hit($key, 3600);

        $user = User::where('email', $email)->first();

        if ($user === null) {
            // Identical 200 — the caller must not learn whether the
            // address exists.
            return;
        }

        // 256-bit token; only its SHA-256 hash is stored. Plaintext
        // travels exclusively in the (non-queued) email.
        $token = bin2hex(random_bytes(32));

        PasswordResetToken::create([
            'email' => $email,
            'token_hash' => hash('sha256', $token),
            'created_at' => now(),
        ]);

        Mail::to($user->email, $user->name)->send(new PasswordResetMailable(
            user: $user,
            token: $token,
            expiresAt: now()->addHour(),
        ));
    }
}
