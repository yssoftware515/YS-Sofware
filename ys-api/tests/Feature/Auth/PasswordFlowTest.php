<?php

namespace Tests\Feature\Auth;

use App\Domains\Auth\Models\PasswordResetToken;
use App\Domains\Auth\Models\Role;
use App\Domains\Auth\Models\User;
use App\Mail\PasswordResetMailable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Mail;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * VULN-13: the platform had zero in-band password rotation — no
 * change-password endpoint, no reset flow, and changing a password
 * never revoked existing tokens. This suite pins the full rotation
 * lifecycle.
 */
class PasswordFlowTest extends TestCase
{
    use RefreshDatabase;

    private const NEW_PASSWORD = 'NewPassw0rd!Strong';

    private function createAdminUser(array $overrides = []): User
    {
        $role = Role::factory()->create([
            'slug' => 'pwflow_'.uniqid(),
            'permissions' => ['*'],
        ]);

        return User::factory()->create(array_merge([
            'role_id' => $role->id,
            'is_active' => true,
            'password' => 'Password123!',
        ], $overrides));
    }

    private function assertCanLogin(string $email, string $password): void
    {
        $this->postJson('/api/v1/auth/login', [
            'email' => $email,
            'password' => $password,
        ])->assertStatus(200);
    }

    private function assertCannotLogin(string $email, string $password): void
    {
        $this->postJson('/api/v1/auth/login', [
            'email' => $email,
            'password' => $password,
        ])->assertStatus(401);
    }

    // ── Change password ──────────────────────────────────────────────

    public function test_change_password_with_wrong_current_password_is_rejected(): void
    {
        $user = $this->createAdminUser();
        Sanctum::actingAs($user, ['admin']);

        $this->postJson('/api/v1/auth/change-password', [
            'current_password' => 'WrongCurrent!',
            'password' => self::NEW_PASSWORD,
            'password_confirmation' => self::NEW_PASSWORD,
        ])->assertStatus(422)
            ->assertJsonValidationErrors(['current_password']);
    }

    public function test_change_password_with_weak_new_password_is_rejected(): void
    {
        $user = $this->createAdminUser();
        Sanctum::actingAs($user, ['admin']);

        // 11 chars, lowercase-only — fails length and mixed-case rules.
        $this->postJson('/api/v1/auth/change-password', [
            'current_password' => 'Password123!',
            'password' => 'onlylowercase11',
            'password_confirmation' => 'onlylowercase11',
        ])->assertStatus(422)
            ->assertJsonValidationErrors(['password']);
    }

    public function test_change_password_with_same_as_current_is_rejected(): void
    {
        $user = $this->createAdminUser();
        Sanctum::actingAs($user, ['admin']);

        $this->postJson('/api/v1/auth/change-password', [
            'current_password' => 'Password123!',
            'password' => 'Password123!',
            'password_confirmation' => 'Password123!',
        ])->assertStatus(422)
            ->assertJsonValidationErrors(['password']);
    }

    public function test_change_password_requires_confirmation(): void
    {
        $user = $this->createAdminUser();
        Sanctum::actingAs($user, ['admin']);

        $this->postJson('/api/v1/auth/change-password', [
            'current_password' => 'Password123!',
            'password' => self::NEW_PASSWORD,
        ])->assertStatus(422)
            ->assertJsonValidationErrors(['password']);
    }

    public function test_change_password_revokes_all_tokens_and_audits(): void
    {
        $user = $this->createAdminUser();

        // Two live sessions on two devices.
        $tokenA = $user->createToken('device-a', ['admin'])->plainTextToken;
        $tokenB = $user->createToken('device-b', ['admin'])->plainTextToken;

        // Change password while authenticated as device B (real token —
        // Sanctum::actingAs would bypass token verification entirely).
        $this->withToken($tokenB)->postJson('/api/v1/auth/change-password', [
            'current_password' => 'Password123!',
            'password' => self::NEW_PASSWORD,
            'password_confirmation' => self::NEW_PASSWORD,
        ])->assertStatus(200)
            ->assertJsonPath('message', 'Password changed. Please log in again.');

        // ALL tokens gone — including the one used for this request.
        $this->assertSame(0, $user->tokens()->count());

        // Sanctum's RequestGuard caches the resolved user for the whole
        // test process (setRequest never clears it), so a revoked token
        // would otherwise "authenticate" via the stale cache. Forget the
        // guards to simulate the fresh container a real request gets.
        $this->app['auth']->forgetGuards();

        // Old tokens can no longer authenticate.
        $this->withToken($tokenA)->getJson('/api/v1/auth/me')->assertStatus(401);
        $this->withToken($tokenB)->getJson('/api/v1/auth/me')->assertStatus(401);

        // Old password dead, new password live.
        $this->assertCannotLogin($user->email, 'Password123!');
        $this->assertCanLogin($user->email, self::NEW_PASSWORD);

        $this->assertTrue(
            $user->fresh()->password_changed_at->isPast(),
            'password_changed_at must be stamped.'
        );

        $this->assertDatabaseHas('audit_logs', [
            'action' => 'auth.password_changed',
            'resource_id' => $user->id,
        ]);
    }

    // ── Forgot password ──────────────────────────────────────────────

    public function test_forgot_password_stores_token_hash_and_sends_mail(): void
    {
        Mail::fake();

        $user = $this->createAdminUser();

        $this->postJson('/api/v1/auth/forgot-password', [
            'email' => $user->email,
        ])->assertStatus(200)
            ->assertJsonPath('message', 'If the email exists, a reset link has been sent.');

        $record = PasswordResetToken::where('email', $user->email)->first();
        $this->assertNotNull($record, 'A reset token record must be stored.');
        $this->assertSame(64, strlen($record->token_hash), 'Stored value must be a SHA-256 hex hash.');

        Mail::assertSent(PasswordResetMailable::class, function (PasswordResetMailable $mail) use ($user, $record) {
            $this->assertSame($user->email, $mail->to[0]['address']);
            // The mail carries the plaintext token — which is NOT what
            // is stored.
            $this->assertSame(64, strlen($mail->token));
            $this->assertNotSame($mail->token, $record->token_hash);
            $this->assertSame(hash('sha256', $mail->token), $record->token_hash);

            return true;
        });
    }

    public function test_forgot_password_returns_identical_response_for_unknown_email(): void
    {
        Mail::fake();

        $unknown = $this->postJson('/api/v1/auth/forgot-password', [
            'email' => 'nobody-'.uniqid().'@example.com',
        ])->assertStatus(200);

        // The unknown address must not have triggered any mail.
        Mail::assertNothingSent();

        $user = $this->createAdminUser();
        $known = $this->postJson('/api/v1/auth/forgot-password', [
            'email' => $user->email,
        ])->assertStatus(200);

        // Byte-identical: status + body — no enumeration oracle.
        $this->assertSame($unknown->json(), $known->json());
    }

    public function test_forgot_password_is_rate_limited_per_email(): void
    {
        $user = $this->createAdminUser();

        for ($i = 0; $i < 3; $i++) {
            $this->withServerVariables(['REMOTE_ADDR' => '10.9.0.'.($i + 1)])
                ->postJson('/api/v1/auth/forgot-password', [
                    'email' => $user->email,
                ])->assertStatus(200);
        }

        // 4th request, fresh IP — the per-email budget (3/hour) trips.
        $this->withServerVariables(['REMOTE_ADDR' => '10.9.0.99'])
            ->postJson('/api/v1/auth/forgot-password', [
                'email' => $user->email,
            ])->assertStatus(429)
            ->assertJsonPath('code', 'RATE_LIMIT_EXCEEDED');
    }

    // ── Reset password ───────────────────────────────────────────────

    public function test_reset_password_with_valid_token_updates_password(): void
    {
        $user = $this->createAdminUser();
        $token = bin2hex(random_bytes(32));

        PasswordResetToken::create([
            'email' => $user->email,
            'token_hash' => hash('sha256', $token),
            'created_at' => now(),
        ]);

        $this->postJson('/api/v1/auth/reset-password', [
            'email' => $user->email,
            'token' => $token,
            'password' => self::NEW_PASSWORD,
            'password_confirmation' => self::NEW_PASSWORD,
        ])->assertStatus(200)
            ->assertJsonPath('message', 'Password has been reset. Please log in again.');

        // Password rotated + stamped.
        $this->assertCannotLogin($user->email, 'Password123!');
        $this->assertCanLogin($user->email, self::NEW_PASSWORD);
        $this->assertTrue($user->fresh()->password_changed_at->isPast());

        $this->assertDatabaseHas('audit_logs', [
            'action' => 'auth.password_reset',
            'resource_id' => $user->id,
        ]);
    }

    public function test_reset_password_token_is_single_use(): void
    {
        $user = $this->createAdminUser();
        $token = bin2hex(random_bytes(32));

        PasswordResetToken::create([
            'email' => $user->email,
            'token_hash' => hash('sha256', $token),
            'created_at' => now(),
        ]);

        $this->postJson('/api/v1/auth/reset-password', [
            'email' => $user->email,
            'token' => $token,
            'password' => self::NEW_PASSWORD,
            'password_confirmation' => self::NEW_PASSWORD,
        ])->assertStatus(200);

        // The token row is gone — replaying it must fail.
        $this->assertDatabaseMissing('password_reset_tokens', [
            'email' => $user->email,
            'token_hash' => hash('sha256', $token),
        ]);

        $this->postJson('/api/v1/auth/reset-password', [
            'email' => $user->email,
            'token' => $token,
            'password' => self::NEW_PASSWORD,
            'password_confirmation' => self::NEW_PASSWORD,
        ])->assertStatus(403)
            ->assertJsonPath('code', 'INVALID_RESET_TOKEN');
    }

    public function test_reset_password_with_expired_token_is_rejected(): void
    {
        $user = $this->createAdminUser();
        $token = bin2hex(random_bytes(32));

        PasswordResetToken::create([
            'email' => $user->email,
            'token_hash' => hash('sha256', $token),
            'created_at' => now()->subHours(2),
        ]);

        $this->postJson('/api/v1/auth/reset-password', [
            'email' => $user->email,
            'token' => $token,
            'password' => self::NEW_PASSWORD,
            'password_confirmation' => self::NEW_PASSWORD,
        ])->assertStatus(403)
            ->assertJsonPath('code', 'INVALID_RESET_TOKEN');

        // Password untouched.
        $this->assertCanLogin($user->email, 'Password123!');
    }

    public function test_reset_password_with_wrong_token_is_rejected(): void
    {
        $user = $this->createAdminUser();

        PasswordResetToken::create([
            'email' => $user->email,
            'token_hash' => hash('sha256', bin2hex(random_bytes(32))),
            'created_at' => now(),
        ]);

        $this->postJson('/api/v1/auth/reset-password', [
            'email' => $user->email,
            'token' => str_repeat('0', 64),
            'password' => self::NEW_PASSWORD,
            'password_confirmation' => self::NEW_PASSWORD,
        ])->assertStatus(403)
            ->assertJsonPath('code', 'INVALID_RESET_TOKEN');
    }

    public function test_reset_password_revokes_all_existing_tokens(): void
    {
        $user = $this->createAdminUser();
        $token = bin2hex(random_bytes(32));
        $liveToken = $user->createToken('device-a', ['admin'])->plainTextToken;

        PasswordResetToken::create([
            'email' => $user->email,
            'token_hash' => hash('sha256', $token),
            'created_at' => now(),
        ]);

        $this->postJson('/api/v1/auth/reset-password', [
            'email' => $user->email,
            'token' => $token,
            'password' => self::NEW_PASSWORD,
            'password_confirmation' => self::NEW_PASSWORD,
        ])->assertStatus(200);

        $this->assertSame(0, $user->tokens()->count());
        $this->withToken($liveToken)->getJson('/api/v1/auth/me')->assertStatus(401);
    }

    public function test_reset_password_weak_new_password_is_rejected(): void
    {
        $user = $this->createAdminUser();
        $token = bin2hex(random_bytes(32));

        PasswordResetToken::create([
            'email' => $user->email,
            'token_hash' => hash('sha256', $token),
            'created_at' => now(),
        ]);

        $this->postJson('/api/v1/auth/reset-password', [
            'email' => $user->email,
            'token' => $token,
            'password' => 'weak',
            'password_confirmation' => 'weak',
        ])->assertStatus(422)
            ->assertJsonValidationErrors(['password']);

        // Token still alive — a failed reset must not burn it.
        $this->assertDatabaseHas('password_reset_tokens', [
            'email' => $user->email,
            'token_hash' => hash('sha256', $token),
        ]);
    }

    public function test_forgot_password_burns_budget_but_does_not_leak_existence_through_rate_limit(): void
    {
        // Both a known and an unknown address get the SAME 200 responses
        // up to the budget, then the same 429 — the rate limiter is keyed
        // on the (hashed) email in both cases.
        $unknownEmail = 'ghost-'.uniqid().'@example.com';

        for ($i = 0; $i < 3; $i++) {
            $this->withServerVariables(['REMOTE_ADDR' => '10.7.0.'.($i + 1)])
                ->postJson('/api/v1/auth/forgot-password', [
                    'email' => $unknownEmail,
                ])->assertStatus(200);
        }

        $this->withServerVariables(['REMOTE_ADDR' => '10.7.0.99'])
            ->postJson('/api/v1/auth/forgot-password', [
                'email' => $unknownEmail,
            ])->assertStatus(429);
    }

    public function test_reset_password_tokens_expire_exactly_one_hour_after_creation(): void
    {
        Carbon::setTestNow('2026-08-16 10:00:00');

        $user = $this->createAdminUser();
        $token = bin2hex(random_bytes(32));

        PasswordResetToken::create([
            'email' => $user->email,
            'token_hash' => hash('sha256', $token),
            'created_at' => now(),
        ]);

        try {
            // 59 minutes later: valid.
            Carbon::setTestNow('2026-08-16 10:59:00');
            $this->postJson('/api/v1/auth/reset-password', [
                'email' => $user->email,
                'token' => $token,
                'password' => self::NEW_PASSWORD,
                'password_confirmation' => self::NEW_PASSWORD,
            ])->assertStatus(200);
        } finally {
            Carbon::setTestNow();
        }
    }
}
