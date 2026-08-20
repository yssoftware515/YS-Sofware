<?php

namespace Tests\Feature\Auth;

use App\Domains\Auth\Models\Role;
use App\Domains\Auth\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Mockery;
use Tests\TestCase;

/**
 * VULN-11: the login flow used `||` short-circuiting — a nonexistent
 * email skipped Hash::check entirely, leaving a ~200 ms bcrypt timing
 * delta an attacker could measure to enumerate accounts. Hash::check
 * must ALWAYS run, against a real cost-12 hash when no user exists.
 */
class LoginTimingOracleTest extends TestCase
{
    use RefreshDatabase;

    private function createAdminUser(): User
    {
        $role = Role::factory()->create([
            'slug' => 'super_admin',
            'permissions' => ['*'],
        ]);

        // Real cost-12 bcrypt hash — the stock factory stores the
        // password in plain text, which makes Hash::check return in
        // microseconds and would defeat the timing measurement.
        return User::factory()->create([
            'role_id' => $role->id,
            'is_active' => true,
            'password' => Hash::make('Password123!', ['rounds' => 12]),
        ]);
    }

    public function test_hash_check_runs_against_a_real_bcrypt_hash_when_email_is_unknown(): void
    {
        // Structural proof: even with no matching user, Hash::check must
        // be invoked exactly once with a cost-12 bcrypt hash — never
        // short-circuited by the `! $user` branch.
        $spy = Hash::spy();

        $this->postJson('/api/v1/auth/login', [
            'email' => 'ghost-'.uniqid().'@example.com',
            'password' => 'WrongPassword!',
        ])->assertStatus(401);

        $spy->shouldHaveReceived('check')
            ->once()
            ->with(
                'WrongPassword!',
                Mockery::on(fn ($hash) => is_string($hash) && str_starts_with($hash, '$2y$12$'))
            );
    }

    public function test_unknown_email_and_wrong_password_take_comparable_time(): void
    {
        // phpunit.xml pins BCRYPT_ROUNDS=4 to keep the suite fast; this
        // test measures REAL bcrypt behaviour, so raise it to the
        // production cost (12) before any hasher is resolved — the
        // model's `hashed` cast verifies stored hashes against it.
        config(['hashing.bcrypt.rounds' => 12]);

        $user = $this->createAdminUser();

        // Median of 3 runs per branch; unique IP + unique email per run
        // so neither the per-IP nor the per-email rate limiter trips.
        $unknown = [];
        for ($i = 0; $i < 3; $i++) {
            $start = hrtime(true);
            $this->withServerVariables(['REMOTE_ADDR' => '10.1.0.'.($i + 1)])
                ->postJson('/api/v1/auth/login', [
                    'email' => 'ghost-'.uniqid().'@example.com',
                    'password' => 'WrongPassword!',
                ])->assertStatus(401);
            $unknown[] = (hrtime(true) - $start) / 1e6;
        }

        $wrong = [];
        for ($i = 0; $i < 3; $i++) {
            $start = hrtime(true);
            $this->withServerVariables(['REMOTE_ADDR' => '10.2.0.'.($i + 1)])
                ->postJson('/api/v1/auth/login', [
                    'email' => $user->email,
                    'password' => 'WrongPassword!',
                ])->assertStatus(401);
            $wrong[] = (hrtime(true) - $start) / 1e6;
        }

        $median = fn (array $samples): float => (float) (($samples[0] + $samples[1] + $samples[2]) / 3);

        $unknownMedian = $median($unknown);
        $wrongMedian = $median($wrong);

        // bcrypt cost-12 dominates both paths: the unknown-email branch
        // must still take real bcrypt time (>50 ms — a regression that
        // skips Hash::check drops this below ~15 ms)…
        $this->assertGreaterThan(
            50,
            $unknownMedian,
            "Unknown-email login took {$unknownMedian} ms — Hash::check was skipped (timing oracle)."
        );

        // …and both branches must be within ~200 ms of each other (the
        // old delta that enabled account enumeration).
        $this->assertLessThan(
            200,
            abs($unknownMedian - $wrongMedian),
            "Timing delta {$unknownMedian}ms vs {$wrongMedian}ms — unknown-email login is measurable."
        );
    }
}
