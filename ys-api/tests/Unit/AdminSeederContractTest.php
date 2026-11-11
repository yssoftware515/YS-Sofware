<?php

namespace Tests\Unit;

use Tests\TestCase;

/**
 * Bootstrap-admin credential contract (S-01 / A-1).
 *
 * Pins the fail-closed behaviour the deployment docs depend on: the
 * initial super admin credentials come exclusively from the environment
 * (config/admin.php) and the committed seeder source must never contain
 * a credential literal.
 */
class AdminSeederContractTest extends TestCase
{
    public function test_admin_credentials_are_an_explicit_env_config_contract(): void
    {
        $credentials = config('admin.credentials');

        $this->assertIsArray($credentials);
        $this->assertArrayHasKey('name', $credentials);
        $this->assertArrayHasKey('email', $credentials);
        $this->assertArrayHasKey('password', $credentials);

        // Fail-closed default: without ADMIN_PASSWORD in the environment
        // the seeder must refuse to bootstrap an admin account.
        $this->assertSame('', (string) $credentials['password']);
    }

    public function test_admin_user_seeder_source_contains_no_committed_credential(): void
    {
        $source = file_get_contents(database_path('seeders/AdminUserSeeder.php'));

        $this->assertIsString($source);

        // The seeder must consume the config contract rather than invent
        // its own values. The check is deliberately made WITHOUT quoting
        // any credential literal: this repository is public, so a "canary"
        // string would keep a known-bad password readable in the history
        // for no benefit - the credential it guarded has been rotated, and
        // a literal-free assertion covers every value, not just one.
        $this->assertStringContainsString("config('admin.credentials.password')", $source);
        $this->assertStringNotContainsString("'password' => '", $source);
        $this->assertStringNotContainsString('"password" => "', $source);
    }
}
