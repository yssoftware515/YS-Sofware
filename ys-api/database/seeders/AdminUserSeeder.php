<?php

namespace Database\Seeders;

use App\Domains\Auth\Models\Role;
use App\Domains\Auth\Models\User;
use Illuminate\Database\Seeder;

/**
 * Bootstrap super admin.
 *
 * Credentials come EXCLUSIVELY from environment variables via
 * config/admin.php (ADMIN_NAME / ADMIN_EMAIL / ADMIN_PASSWORD) — never
 * hardcode secrets in source. An empty ADMIN_PASSWORD means the seeder
 * refuses to run (fail closed): no admin account is created or touched,
 * so a blank/deployed value can never write a known or unusable
 * credential into a fresh database.
 */
class AdminUserSeeder extends Seeder
{
    public function run(): void
    {
        $password = (string) config('admin.credentials.password');

        if ($password === '') {
            $this->command->warn('⚠ ADMIN_PASSWORD is not set — skipping super admin bootstrap. Set ADMIN_PASSWORD in the environment and re-run to create the initial admin.');

            return;
        }

        $superAdminRole = Role::where('slug', 'super_admin')->firstOrFail();

        User::updateOrCreate(
            ['email' => (string) config('admin.credentials.email', 'admin@ys-systems.com')],
            [
                'name' => (string) config('admin.credentials.name', 'YS Admin'),
                'password' => $password, // hashed by model cast
                'role_id' => $superAdminRole->id,
                'is_active' => true,
            ]
        );

        $this->command->info('✓ Super admin created from environment configuration.');
        $this->command->warn('⚠ Change the admin password immediately after first login!');
    }
}
