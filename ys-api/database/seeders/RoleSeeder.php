<?php

namespace Database\Seeders;

use App\Domains\Auth\Models\Role;
use Illuminate\Database\Seeder;

class RoleSeeder extends Seeder
{
    public function run(): void
    {
        $roles = [
            [
                'name' => 'Super Admin',
                'slug' => 'super_admin',
                'description' => 'Full access to everything.',
                'permissions' => ['*'],
            ],
            [
                'name' => 'Admin',
                'slug' => 'admin',
                'description' => 'Full access except user management.',
                'permissions' => [
                    'manage_settings',
                    'manage_contact_requests',
                    'view_audit_logs',
                    'view_services',
                    'manage_services',
                    'view_customers',
                    'manage_customers',
                    'view_projects',
                    'manage_projects',
                    'view_financials',
                ],
            ],
            [
                'name' => 'Support',
                'slug' => 'support',
                'description' => 'Handle contact requests and resolve them into customers.',
                'permissions' => [
                    'manage_contact_requests',
                    'view_customers',
                    'manage_customers',
                ],
            ],
        ];

        foreach ($roles as $role) {
            Role::updateOrCreate(['slug' => $role['slug']], $role);
        }

        $this->command->info('✓ Roles seeded.');
    }
}
