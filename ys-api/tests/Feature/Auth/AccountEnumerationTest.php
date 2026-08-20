<?php

namespace Tests\Feature\Auth;

use App\Domains\Auth\Models\Role;
use App\Domains\Auth\Models\User;
use App\Domains\System\Models\AuditLog;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * VULN-12: wrong password returned 401 INVALID_CREDENTIALS while a
 * correct password on a disabled account returned 403 ACCOUNT_DISABLED
 * — a differential that revealed account existence AND state. Both
 * paths must now produce a byte-identical response; the real reason
 * lives only in the audit trail.
 */
class AccountEnumerationTest extends TestCase
{
    use RefreshDatabase;

    private function createUser(array $overrides = []): User
    {
        $role = Role::factory()->create([
            'slug' => 'enum_test_'.uniqid(),
            'permissions' => ['*'],
        ]);

        return User::factory()->create(array_merge([
            'role_id' => $role->id,
            'is_active' => true,
            'password' => 'Password123!',
        ], $overrides));
    }

    public function test_disabled_account_response_is_identical_to_wrong_password(): void
    {
        $disabled = $this->createUser(['is_active' => false]);
        $active = $this->createUser(['is_active' => true]);

        $wrongPassword = $this->postJson('/api/v1/auth/login', [
            'email' => $active->email,
            'password' => 'WrongPassword!',
        ])->assertStatus(401);

        $disabledAccount = $this->postJson('/api/v1/auth/login', [
            'email' => $disabled->email,
            'password' => 'Password123!',
        ])->assertStatus(401);

        // Byte-identical body: status, message and code must match — no
        // field, header or wording may hint at account existence/state.
        $this->assertSame($wrongPassword->getStatusCode(), $disabledAccount->getStatusCode());
        $this->assertSame($wrongPassword->json(), $disabledAccount->json());

        $this->assertSame('INVALID_CREDENTIALS', $disabledAccount->json('code'));
        $this->assertSame('INVALID_CREDENTIALS', $wrongPassword->json('code'));
    }

    public function test_disabled_account_login_is_audited_with_actual_reason(): void
    {
        $disabled = $this->createUser(['is_active' => false]);

        $this->postJson('/api/v1/auth/login', [
            'email' => $disabled->email,
            'password' => 'Password123!',
        ])->assertStatus(401);

        $log = AuditLog::where('action', 'auth.login_failed')
            ->where('resource_id', $disabled->id)
            ->latest()
            ->first();

        $this->assertNotNull($log, 'Disabled-account login must be audited.');
        $this->assertSame('account_disabled', $log->context['reason']);
        $this->assertSame($disabled->email, $log->context['email']);
    }

    public function test_wrong_password_login_is_audited_with_actual_reason(): void
    {
        $active = $this->createUser(['is_active' => true]);

        $this->postJson('/api/v1/auth/login', [
            'email' => $active->email,
            'password' => 'WrongPassword!',
        ])->assertStatus(401);

        $log = AuditLog::where('action', 'auth.login_failed')
            ->where('resource_id', $active->id)
            ->latest()
            ->first();

        $this->assertNotNull($log, 'Wrong-password login must be audited.');
        $this->assertSame('invalid_credentials', $log->context['reason']);
    }

    public function test_disabled_account_attempts_count_against_rate_limits(): void
    {
        // Uniform throttling: brute-forcing a disabled account must burn
        // the same budget as bad credentials — otherwise an attacker gets
        // unlimited guesses against a disabled account that may be
        // re-enabled later with a compromised password.
        $disabled = $this->createUser(['is_active' => false]);

        for ($i = 0; $i < 5; $i++) {
            $this->postJson('/api/v1/auth/login', [
                'email' => $disabled->email,
                'password' => 'Password123!',
            ])->assertStatus(401);
        }

        $this->postJson('/api/v1/auth/login', [
            'email' => $disabled->email,
            'password' => 'Password123!',
        ])->assertStatus(429);
    }
}
