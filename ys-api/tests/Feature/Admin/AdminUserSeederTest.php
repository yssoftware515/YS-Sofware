<?php

namespace Tests\Feature\Admin;

use App\Domains\Auth\Models\Role;
use App\Domains\Auth\Models\User;
use Database\Seeders\AdminUserSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

/**
 * AdminUserSeeder behaviour (S-01 / A-1 regression test).
 *
 * The seeder must fail closed when ADMIN_PASSWORD is blank and, when set,
 * create the bootstrap super admin exclusively from environment-driven
 * config — never from a committed literal.
 */
class AdminUserSeederTest extends TestCase
{
    use RefreshDatabase;

    protected function seededSuperAdminRole(): Role
    {
        return Role::factory()->create([
            'slug' => 'super_admin',
            'permissions' => ['*'],
        ]);
    }

    public function test_blank_password_fails_closed_without_creating_an_admin(): void
    {
        $this->seededSuperAdminRole();
        config(['admin.credentials.password' => '']);

        $this->seed(AdminUserSeeder::class);

        $this->assertDatabaseCount('users', 0);
    }

    public function test_admin_is_created_from_environment_config_when_password_is_set(): void
    {
        $this->seededSuperAdminRole();
        $password = 'N3w!EnvSecretPassword';

        config([
            'admin.credentials.name' => 'Bootstrap Admin',
            'admin.credentials.email' => 'bootstrap@ys-systems.com',
            'admin.credentials.password' => $password,
        ]);

        $this->seed(AdminUserSeeder::class);

        $user = User::where('email', 'bootstrap@ys-systems.com')->first();

        $this->assertNotNull($user);
        $this->assertSame('Bootstrap Admin', $user->name);
        $this->assertTrue(Hash::check($password, $user->password));
        $this->assertTrue($user->is_active);
        $this->assertTrue($user->isSuperAdmin());
    }

    public function test_seeding_twice_is_idempotent(): void
    {
        $this->seededSuperAdminRole();
        config([
            'admin.credentials.email' => 'bootstrap@ys-systems.com',
            'admin.credentials.password' => 'N3w!EnvSecretPassword',
        ]);

        $this->seed(AdminUserSeeder::class);
        $this->seed(AdminUserSeeder::class);

        $this->assertDatabaseCount('users', 1);
    }

    public function test_created_admin_can_log_in_with_the_configured_password(): void
    {
        $this->seededSuperAdminRole();
        $password = 'N3w!EnvSecretPassword';

        config([
            'admin.credentials.email' => 'bootstrap@ys-systems.com',
            'admin.credentials.password' => $password,
        ]);

        $this->seed(AdminUserSeeder::class);

        $this->postJson('/api/v1/auth/login', [
            'email' => 'bootstrap@ys-systems.com',
            'password' => $password,
        ])->assertStatus(200)->assertJson(['success' => true]);
    }
}
