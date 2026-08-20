<?php

namespace Tests;

use App\Domains\Auth\Models\Role;
use App\Domains\Auth\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Laravel\Sanctum\Sanctum;

abstract class TestCase extends BaseTestCase
{
    use RefreshDatabase;

    /**
     * Create a user with a given role slug and authenticate them.
     */
    protected function actingAsRole(string $roleSlug): User
    {
        $role = Role::factory()->create(['slug' => $roleSlug, 'permissions' => ['*']]);
        $user = User::factory()->create(['role_id' => $role->id, 'is_active' => true]);
        Sanctum::actingAs($user, ['admin']);

        return $user;
    }

    /**
     * Create a super admin and authenticate.
     */
    protected function actingAsSuperAdmin(): User
    {
        return $this->actingAsRole('super_admin');
    }

    /**
     * Assert the standard API success response shape.
     */
    protected function assertApiSuccess($response, int $status = 200): void
    {
        $response->assertStatus($status)
            ->assertJsonStructure(['success', 'data'])
            ->assertJson(['success' => true]);
    }

    /**
     * Assert the standard API error response shape.
     */
    protected function assertApiError($response, int $status): void
    {
        $response->assertStatus($status)
            ->assertJsonStructure(['success', 'message', 'code'])
            ->assertJson(['success' => false]);
    }
}
