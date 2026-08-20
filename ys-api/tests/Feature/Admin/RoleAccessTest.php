<?php

namespace Tests\Feature\Admin;

use App\Domains\Auth\Models\Role;
use App\Domains\Auth\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * K-30 regression — Roles page read/mutate permission boundary.
 *
 * The navigation now exposes Roles & Permissions to anyone the backend
 * lets read it (manage_users), while every mutation stays gated by
 * manage_admins. These tests pin that contract end to end.
 */
class RoleAccessTest extends TestCase
{
    use RefreshDatabase;

    private function actAsUserWith(array $permissions, string $slug = 'test_role'): User
    {
        $role = Role::factory()->create(['slug' => $slug, 'permissions' => $permissions]);
        $user = User::factory()->create(['role_id' => $role->id, 'is_active' => true]);
        Sanctum::actingAs($user, ['admin']);

        return $user;
    }

    public function test_manage_users_user_can_read_roles(): void
    {
        $this->actAsUserWith(['manage_users']);

        $this->getJson('/api/v1/admin/roles')
            ->assertStatus(200)
            ->assertJson(['success' => true])
            ->assertJsonStructure(['data']);
    }

    public function test_manage_users_user_cannot_mutate_roles(): void
    {
        $this->actAsUserWith(['manage_users']);
        $target = Role::factory()->create(['slug' => 'ordinary', 'permissions' => ['manage_media']]);

        $this->postJson('/api/v1/admin/roles', [
            'name' => 'Escalated',
            'slug' => 'escalated',
            'permissions' => ['manage_admins'],
        ])->assertStatus(403);

        $this->putJson("/api/v1/admin/roles/{$target->id}", [
            'name' => 'Escalated',
        ])->assertStatus(403);

        $this->deleteJson("/api/v1/admin/roles/{$target->id}")
            ->assertStatus(403);
    }

    public function test_manage_users_user_can_never_grant_themselves_admins_permission(): void
    {
        $this->actAsUserWith(['manage_users']);
        $target = Role::factory()->create(['slug' => 'peon', 'permissions' => ['manage_media']]);

        $this->putJson("/api/v1/admin/roles/{$target->id}", [
            'permissions' => ['manage_users', 'manage_admins'],
        ])->assertStatus(403);

        $this->assertSame(['manage_media'], $target->fresh()->permissions);
    }

    public function test_manage_admins_user_retains_full_functionality(): void
    {
        $this->actAsUserWith(['manage_users', 'manage_admins']);

        // Read
        $this->getJson('/api/v1/admin/roles')
            ->assertStatus(200)
            ->assertJson(['success' => true]);

        // Create — under the permission-subset rule a manage_admins holder
        // may only compose roles from permissions they hold themselves.
        $response = $this->postJson('/api/v1/admin/roles', [
            'name' => 'Support Admin',
            'slug' => 'support_admin',
            'permissions' => ['manage_users'],
        ]);
        $response->assertStatus(201)->assertJson(['success' => true]);
        $roleId = $response->json('data.id');

        // Update
        $this->putJson("/api/v1/admin/roles/{$roleId}", [
            'name' => 'Support Admin II',
            'permissions' => ['manage_users', 'manage_admins'],
        ])->assertStatus(200)->assertJson(['success' => true]);

        // Delete
        $this->deleteJson("/api/v1/admin/roles/{$roleId}")
            ->assertStatus(200)->assertJson(['success' => true]);

        $this->assertDatabaseMissing('roles', ['id' => $roleId]);
    }

    public function test_manage_admins_user_cannot_create_role_granting_permissions_they_do_not_hold(): void
    {
        $this->actAsUserWith(['manage_users', 'manage_admins']);

        $this->postJson('/api/v1/admin/roles', [
            'name' => 'Escalated',
            'slug' => 'escalated',
            'permissions' => ['manage_users', 'manage_admins', 'manage_settings'],
        ])->assertStatus(403);

        $this->assertDatabaseMissing('roles', ['slug' => 'escalated']);
    }

    public function test_manage_admins_user_cannot_extend_role_to_permissions_they_do_not_hold(): void
    {
        $this->actAsUserWith(['manage_users', 'manage_admins']);
        $target = Role::factory()->create(['slug' => 'peon', 'permissions' => ['manage_media']]);

        $this->putJson("/api/v1/admin/roles/{$target->id}", [
            'permissions' => ['manage_media', 'manage_settings'],
        ])->assertStatus(403);

        $this->assertSame(['manage_media'], $target->fresh()->permissions);
    }

    public function test_super_admin_can_compose_any_role(): void
    {
        $this->actingAsSuperAdmin();

        $response = $this->postJson('/api/v1/admin/roles', [
            'name' => 'Full Admin',
            'slug' => 'full_admin',
            'permissions' => ['manage_users', 'manage_settings', 'view_financials'],
        ])->assertStatus(201)->assertJson(['success' => true]);

        $this->assertSame(
            ['manage_users', 'manage_settings', 'view_financials'],
            Role::findOrFail($response->json('data.id'))->permissions,
        );
    }

    public function test_super_admin_role_slug_cannot_be_renamed_via_api(): void
    {
        $this->actingAsSuperAdmin();
        $role = Role::factory()->create(['slug' => 'root_role', 'permissions' => ['*']]);

        $this->putJson("/api/v1/admin/roles/{$role->id}", [
            'slug' => 'renamed_innocently',
        ])->assertStatus(422);

        $this->assertSame('root_role', $role->fresh()->slug);
    }

    public function test_authenticated_user_without_either_permission_is_blocked(): void
    {
        $this->actAsUserWith(['manage_products']);

        $this->getJson('/api/v1/admin/roles')->assertStatus(403);
    }

    public function test_unauthenticated_user_is_rejected(): void
    {
        $this->getJson('/api/v1/admin/roles')->assertStatus(401);
    }
}
