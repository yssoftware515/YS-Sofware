<?php

namespace Tests\Feature\Admin;

use App\Domains\Auth\Models\Role;
use App\Domains\Auth\Models\User;
use App\Domains\Product\Models\Product;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Product-access pivots must survive both INSERT paths: the sync endpoint
 * (admin granting access) and the initial backfill. Eloquent's default
 * Pivot would insert a NULLed UUID id and error out — the pivot is a
 * first-class UUID-keyed model here.
 */
class AdminProductAccessTest extends TestCase
{
    use RefreshDatabase;

    private function actingAsScoped(array $permissions, array $productIds): User
    {
        $role = Role::factory()->create([
            'slug' => 'access_'.uniqid(),
            'permissions' => $permissions,
        ]);
        $user = User::factory()->create(['role_id' => $role->id, 'is_active' => true]);
        $user->products()->attach($productIds);
        Sanctum::actingAs($user, ['admin']);

        return $user;
    }

    public function test_attach_creates_a_row_with_a_uuid_primary_key(): void
    {
        $user = User::factory()->create();
        $product = Product::factory()->active()->create();

        $user->products()->attach($product->id);

        $this->assertDatabaseHas('admin_product_access', ['user_id' => $user->id, 'product_id' => $product->id]);
        $this->assertTrue($user->canAccessProduct($product->id), 'attach must grant product access');
    }

    public function test_sync_endpoint_grants_access_to_scoped_admin(): void
    {
        $superAdmin = User::factory()->create();
        $role = Role::factory()->create(['slug' => 'super_admin_sync', 'permissions' => ['*']]);
        $superAdmin->role_id = $role->id;
        $superAdmin->save();
        Sanctum::actingAs($superAdmin, ['admin']);

        $target = User::factory()->create();
        $product = Product::factory()->active()->create();

        $this->putJson("/api/v1/admin/users/{$target->id}/products", [
            'product_ids' => [$product->id],
        ])->assertOk();

        $this->assertDatabaseHas('admin_product_access', ['user_id' => $target->id, 'product_id' => $product->id]);
        $this->assertTrue($target->canAccessProduct($product->id));
    }
}
