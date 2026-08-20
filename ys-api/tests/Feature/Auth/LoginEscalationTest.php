<?php

namespace Tests\Feature\Auth;

use App\Domains\Auth\Models\Role;
use App\Domains\Auth\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\RateLimiter;
use Tests\TestCase;

/**
 * VULN-15: the per-email login limit escalates — a 24h failure counter
 * drives the lockout window (60s → 5m → 30m), tier crossings are
 * audited, and a successful login no longer resets the attacker-
 * controlled per-email budget (only the caller's per-IP budget).
 */
class LoginEscalationTest extends TestCase
{
    use RefreshDatabase;

    private function createUser(): User
    {
        $role = Role::factory()->create(['slug' => 'escalation_'.uniqid(), 'permissions' => ['*']]);
        $user = User::factory()->create(['role_id' => $role->id, 'is_active' => true, 'password' => 'Password123!']);

        return $user;
    }

    private function emailKey(string $email): string
    {
        return 'login-email:'.hash('sha256', strtolower(trim($email)));
    }

    private function escalationKey(string $email): string
    {
        return 'login-email-escalation:'.hash('sha256', strtolower(trim($email)));
    }

    private function failLogin(string $email, int $ipSuffix): void
    {
        $this->withServerVariables(['REMOTE_ADDR' => '10.9.0.'.$ipSuffix])
            ->postJson('/api/v1/auth/login', [
                'email' => $email,
                'password' => 'WrongPassword!',
            ])->assertStatus(401);
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    public function test_lockout_window_starts_at_sixty_seconds_and_escalates_within_burst(): void
    {
        $user = $this->createUser();

        for ($i = 1; $i <= 5; $i++) {
            $this->failLogin($user->email, $i);
        }

        // First five failures: the block key decays with the 60s tier.
        $this->assertLessThanOrEqual(60, RateLimiter::availableIn($this->emailKey($user->email)));

        $this->failLogin($user->email, 6);

        // The 6th failure (24h counter 6) re-arms the window at 5 minutes.
        $this->assertGreaterThanOrEqual(295, RateLimiter::availableIn($this->emailKey($user->email)));
    }

    public function test_repeat_offender_within_24h_gets_thirty_minute_windows(): void
    {
        $user = $this->createUser();

        // Prime the 24h counter as a repeat offender (11+ failures in the
        // rolling window — e.g. previous bursts).
        for ($i = 0; $i < 11; $i++) {
            RateLimiter::hit($this->escalationKey($user->email), 86400);
        }

        for ($i = 1; $i <= 10; $i++) {
            $this->failLogin($user->email, $i);
        }

        $this->assertGreaterThanOrEqual(1790, RateLimiter::availableIn($this->emailKey($user->email)));
    }

    public function test_tier_crossings_are_audited(): void
    {
        $user = $this->createUser();

        for ($i = 1; $i <= 5; $i++) {
            $this->failLogin($user->email, $i);
        }

        // No crossing yet: the 5th failure is still tier 1.
        $this->assertDatabaseMissing('audit_logs', [
            'action' => 'auth.login_lockout_escalated',
            'resource_id' => $user->id,
        ]);

        // 6th failure crosses into tier 2 (300s).
        $this->failLogin($user->email, 6);

        $this->assertDatabaseHas('audit_logs', [
            'action' => 'auth.login_lockout_escalated',
            'resource_id' => $user->id,
        ]);
        $this->assertDatabaseHas('audit_logs', [
            'action' => 'auth.login_lockout_escalated',
            'context' => json_encode([
                'email' => $user->email,
                'ip' => '10.9.0.6',
                'failures_24h' => 6,
                'window_seconds' => 300,
            ]),
        ]);

        // Burst gate tripped (10 failures) — the 11th request is blocked.
        for ($i = 7; $i <= 10; $i++) {
            $this->failLogin($user->email, $i);
        }
        $this->withServerVariables(['REMOTE_ADDR' => '10.9.0.99'])
            ->postJson('/api/v1/auth/login', [
                'email' => $user->email,
                'password' => 'WrongPassword!',
            ])->assertStatus(429);

        // Let the 5-minute window lapse; the 24h counter persists, so the
        // next failure crosses into tier 3 (1800s) and is audited again.
        Carbon::setTestNow(now()->addMinutes(6));
        $this->failLogin($user->email, 100);

        $this->assertDatabaseHas('audit_logs', [
            'action' => 'auth.login_lockout_escalated',
            'context' => json_encode([
                'email' => $user->email,
                'ip' => '10.9.0.100',
                'failures_24h' => 11,
                'window_seconds' => 1800,
            ]),
        ]);
        $this->assertGreaterThanOrEqual(1790, RateLimiter::availableIn($this->emailKey($user->email)));
    }

    public function test_successful_login_clears_only_the_per_ip_budget(): void
    {
        $user = $this->createUser();

        for ($i = 1; $i <= 9; $i++) {
            $this->failLogin($user->email, $i);
        }

        // 9 failures on the email key; a success from a fresh IP must NOT
        // reset the attacker-controlled budget.
        $this->assertSame(9, RateLimiter::attempts($this->emailKey($user->email)));

        $this->withServerVariables(['REMOTE_ADDR' => '10.9.0.50'])
            ->postJson('/api/v1/auth/login', [
                'email' => $user->email,
                'password' => 'Password123!',
            ])->assertStatus(200);

        $this->assertSame(9, RateLimiter::attempts($this->emailKey($user->email)));
        $this->assertSame(9, RateLimiter::attempts($this->escalationKey($user->email)));
        // The caller's own per-IP budget is still cleared.
        $this->assertSame(0, RateLimiter::attempts('login-ip:'.hash('sha256', '10.9.0.50')));

        // The burnt budget still trips the gate: 1 more failure reaches
        // the 10-per-burst threshold, and the next request is blocked.
        $this->failLogin($user->email, 51);
        $this->withServerVariables(['REMOTE_ADDR' => '10.9.0.52'])
            ->postJson('/api/v1/auth/login', [
                'email' => $user->email,
                'password' => 'WrongPassword!',
            ])->assertStatus(429);
    }
}
