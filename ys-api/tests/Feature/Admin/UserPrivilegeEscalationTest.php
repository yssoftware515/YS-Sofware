<?php

namespace Tests\Feature\Admin;

use App\Domains\Auth\Models\Role;
use App\Domains\Auth\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * VULN-01 regression tests — UserController::update() must enforce the
 * same escalation guards as store(): a non-super-admin may neither
 * assign the super_admin role nor assign a role whose permission set
 * is not a subset of their own.
 */
class UserPrivilegeEscalationTest extends TestCase
{
    use RefreshDatabase;

    private function makeUserWith(Role $role): User
    {
        return User::factory()->create(['role_id' => $role->id, 'is_active' => true]);
    }

    private function makeRole(string $slug, array $permissions): Role
    {
        return Role::factory()->create(['slug' => $slug, 'permissions' => $permissions]);
    }

    private function superAdminUser(): User
    {
        return $this->makeUserWith($this->makeRole('super_admin', ['*']));
    }

    public function test_manage_users_admin_cannot_promote_user_to_super_admin(): void
    {
        $actor = $this->makeUserWith($this->makeRole('user_manager', ['manage_users']));
        $target = $this->makeUserWith($this->makeRole('peon', ['view_products']));
        $superAdminRole = $this->makeRole('super_admin', ['*']);
        Sanctum::actingAs($actor, ['admin']);

        $this->putJson("/api/v1/admin/users/{$target->id}", [
            'role_id' => $superAdminRole->id,
        ])->assertStatus(403);

        $this->assertSame('peon', $target->fresh()->role->slug);
    }

    public function test_manage_users_admin_cannot_assign_role_with_permissions_they_do_not_hold(): void
    {
        $actor = $this->makeUserWith($this->makeRole('user_manager', ['manage_users']));
        $target = $this->makeUserWith($this->makeRole('peon', ['view_products']));
        $adminRole = $this->makeRole('admin', ['manage_settings', 'manage_users', 'view_audit_logs']);
        Sanctum::actingAs($actor, ['admin']);

        $this->putJson("/api/v1/admin/users/{$target->id}", [
            'role_id' => $adminRole->id,
        ])->assertStatus(403);

        $this->assertSame('peon', $target->fresh()->role->slug);
    }

    public function test_manage_users_admin_cannot_assign_wildcard_role_without_super_admin_slug(): void
    {
        $actor = $this->makeUserWith($this->makeRole('user_manager', ['manage_users']));
        $target = $this->makeUserWith($this->makeRole('peon', ['view_products']));
        $wildcardRole = $this->makeRole('god_mode', ['*']);
        Sanctum::actingAs($actor, ['admin']);

        $this->putJson("/api/v1/admin/users/{$target->id}", [
            'role_id' => $wildcardRole->id,
        ])->assertStatus(403);
    }

    public function test_manage_users_admin_can_assign_role_with_subset_permissions(): void
    {
        $actor = $this->makeUserWith($this->makeRole('user_manager', ['manage_users', 'manage_media']));
        $target = $this->makeUserWith($this->makeRole('peon', ['view_products']));
        $subsetRole = $this->makeRole('media_editor', ['manage_media']);
        Sanctum::actingAs($actor, ['admin']);

        $this->putJson("/api/v1/admin/users/{$target->id}", [
            'role_id' => $subsetRole->id,
        ])->assertOk()->assertJson(['success' => true]);

        $this->assertSame('media_editor', $target->fresh()->role->slug);
    }

    public function test_super_admin_can_assign_any_role(): void
    {
        $actor = $this->superAdminUser();
        $target = $this->makeUserWith($this->makeRole('peon', ['view_products']));
        $adminRole = $this->makeRole('admin', ['manage_settings', 'manage_users', 'view_audit_logs']);
        Sanctum::actingAs($actor, ['admin']);

        $this->putJson("/api/v1/admin/users/{$target->id}", [
            'role_id' => $adminRole->id,
        ])->assertOk()->assertJson(['success' => true]);

        $this->assertSame('admin', $target->fresh()->role->slug);
    }

    public function test_super_admin_can_promote_user_to_super_admin(): void
    {
        $actor = $this->superAdminUser();
        $target = $this->makeUserWith($this->makeRole('peon', ['view_products']));
        Sanctum::actingAs($actor, ['admin']);

        $this->putJson("/api/v1/admin/users/{$target->id}", [
            'role_id' => $actor->role_id,
        ])->assertOk();

        $this->assertSame('super_admin', $target->fresh()->role->slug);
    }

    public function test_non_super_admin_still_cannot_modify_super_admin_account(): void
    {
        $actor = $this->makeUserWith($this->makeRole('user_manager', ['manage_users']));
        $superAdmin = $this->superAdminUser();
        Sanctum::actingAs($actor, ['admin']);

        $this->putJson("/api/v1/admin/users/{$superAdmin->id}", [
            'name' => 'Hijacked',
        ])->assertStatus(403);
    }

    // ── SEC-01: privilege follows the '*' permission, never the slug ──

    public function test_manage_users_admin_cannot_create_super_admin_account(): void
    {
        $actor = $this->makeUserWith($this->makeRole('user_manager', ['manage_users']));
        $superAdminRole = $this->makeRole('super_admin', ['*']);
        Sanctum::actingAs($actor, ['admin']);

        $this->postJson('/api/v1/admin/users', [
            'name' => 'Mallory',
            'email' => 'mallory@example.test',
            'password' => 'correct-horse-battery-staple',
            'password_confirmation' => 'correct-horse-battery-staple',
            'role_id' => $superAdminRole->id,
        ])->assertStatus(403);

        $this->assertDatabaseMissing('users', ['email' => 'mallory@example.test']);
    }

    public function test_manage_users_admin_cannot_create_user_with_role_permissions_they_do_not_hold(): void
    {
        $actor = $this->makeUserWith($this->makeRole('user_manager', ['manage_users']));
        $adminRole = $this->makeRole('admin', ['manage_settings', 'manage_users', 'view_audit_logs']);
        Sanctum::actingAs($actor, ['admin']);

        $this->postJson('/api/v1/admin/users', [
            'name' => 'Mallory',
            'email' => 'mallory@example.test',
            'password' => 'correct-horse-battery-staple',
            'password_confirmation' => 'correct-horse-battery-staple',
            'role_id' => $adminRole->id,
        ])->assertStatus(403);

        $this->assertDatabaseMissing('users', ['email' => 'mallory@example.test']);
    }

    public function test_manage_users_admin_can_create_user_with_subset_role(): void
    {
        $actor = $this->makeUserWith($this->makeRole('user_manager', ['manage_users', 'manage_media']));
        $subsetRole = $this->makeRole('media_editor', ['manage_media']);
        Sanctum::actingAs($actor, ['admin']);

        $this->postJson('/api/v1/admin/users', [
            'name' => 'Bob',
            'email' => 'bob@example.test',
            'password' => 'correct-horse-battery-staple',
            'password_confirmation' => 'correct-horse-battery-staple',
            'role_id' => $subsetRole->id,
        ])->assertStatus(201)->assertJson(['success' => true]);

        $this->assertDatabaseHas('users', ['email' => 'bob@example.test']);
    }

    public function test_super_admin_privilege_survives_slug_rename(): void
    {
        // Simulate the SEC-01 attack: the '*' role's slug is renamed to
        // something innocuous so slug-based guards no longer match.
        $superAdminRole = $this->makeRole('super_admin', ['*']);
        $superAdminRole->update(['slug' => 'harmless_looking_role']);

        $superAdmin = $this->makeUserWith($superAdminRole);
        $actor = $this->makeUserWith($this->makeRole('user_manager', ['manage_users']));
        $target = $this->makeUserWith($this->makeRole('peon', ['view_products']));
        Sanctum::actingAs($actor, ['admin']);

        // The renamed-super-admin account is still protected...
        $this->putJson("/api/v1/admin/users/{$superAdmin->id}", [
            'name' => 'Hijacked',
        ])->assertStatus(403);

        $this->deleteJson("/api/v1/admin/users/{$superAdmin->id}")
            ->assertStatus(403);

        // ...and it can still be granted (its privilege is the '*'
        // permission, and only another super admin can assign it).
        $this->putJson("/api/v1/admin/users/{$target->id}", [
            'role_id' => $superAdminRole->id,
        ])->assertStatus(403);

        // The actual super admin still assigns it fine.
        Sanctum::actingAs($superAdmin, ['admin']);
        $this->putJson("/api/v1/admin/users/{$target->id}", [
            'role_id' => $superAdminRole->id,
        ])->assertOk();

        $this->assertSame('harmless_looking_role', $target->fresh()->role->slug);
    }
}
