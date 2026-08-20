<?php

namespace Tests\Feature\Admin;

use App\Domains\Auth\Models\Role;
use App\Domains\Auth\Models\User;
use App\Domains\Services\Models\Service;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ServiceTest extends TestCase
{
    use RefreshDatabase;

    // ── Index ────────────────────────────────────────────────────────

    public function test_admin_can_list_services(): void
    {
        $this->actingAsRole('admin');
        Service::factory()->count(3)->create();

        $response = $this->getJson('/api/v1/admin/services');

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonStructure(['data', 'meta']);
    }

    public function test_unauthenticated_user_cannot_list_services(): void
    {
        $response = $this->getJson('/api/v1/admin/services');
        $response->assertStatus(401);
    }

    // ── Authorization ────────────────────────────────────────────────

    public function test_user_without_manage_services_cannot_list_services(): void
    {
        // Deliberately NOT actingAsRole(): the helper grants ['*'], which
        // would make any role pass the permission check. Build a real
        // restricted role instead.
        $role = Role::factory()->create([
            'slug' => 'content_editor',
            'permissions' => ['view_products'],
        ]);
        $user = User::factory()->create([
            'role_id' => $role->id,
            'is_active' => true,
        ]);
        Sanctum::actingAs($user, ['admin']);

        $response = $this->getJson('/api/v1/admin/services');

        $response->assertStatus(403);
    }

    public function test_view_only_admin_can_read_but_not_write_services(): void
    {
        $role = Role::factory()->create([
            'slug' => 'services_viewer',
            'permissions' => ['view_services'],
        ]);
        $user = User::factory()->create([
            'role_id' => $role->id,
            'is_active' => true,
        ]);
        Sanctum::actingAs($user, ['admin']);

        Service::factory()->count(2)->create();

        $response = $this->getJson('/api/v1/admin/services');
        $response->assertStatus(200)->assertJsonCount(2, 'data');

        $this->getJson('/api/v1/admin/services/'.Service::first()->id)->assertStatus(200);

        $this->postJson('/api/v1/admin/services', [
            'slug' => 'forbidden',
            'name_en' => 'Forbidden',
            'name_ar' => 'ممنوع',
            'pricing_type' => 'custom_quote',
        ])->assertStatus(403);

        $this->putJson('/api/v1/admin/services/'.Service::first()->id, ['name_en' => 'Hacked'])
            ->assertStatus(403);
    }

    // ── Create ───────────────────────────────────────────────────────

    public function test_super_admin_can_create_service(): void
    {
        $this->actingAsSuperAdmin();

        $response = $this->postJson('/api/v1/admin/services', [
            'slug' => 'web-development',
            'name_en' => 'Web Development',
            'name_ar' => 'تطوير مواقع',
            'pricing_type' => 'starting_at',
            'starting_price' => '950.50',
            'currency' => 'usd',
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.slug', 'web-development')
            ->assertJsonPath('data.pricing_type', 'starting_at')
            // money is stored as 2-dp string, currency normalized to upper
            ->assertJsonPath('data.starting_price', '950.50')
            ->assertJsonPath('data.currency', 'USD');

        $this->assertDatabaseHas('services', ['slug' => 'web-development']);
    }

    public function test_duplicate_slug_is_rejected(): void
    {
        $this->actingAsSuperAdmin();
        Service::factory()->create(['slug' => 'web-development']);

        $response = $this->postJson('/api/v1/admin/services', [
            'slug' => 'web-development',
            'name_en' => 'Another',
            'name_ar' => 'آخر',
            'pricing_type' => 'custom_quote',
        ]);

        $response->assertStatus(422);
    }

    public function test_invalid_pricing_type_is_rejected(): void
    {
        $this->actingAsSuperAdmin();

        $response = $this->postJson('/api/v1/admin/services', [
            'slug' => 'bad-pricing',
            'name_en' => 'Pricing',
            'name_ar' => 'تسعير',
            'pricing_type' => 'per-session',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['pricing_type']);
    }

    // ── Update ───────────────────────────────────────────────────────

    public function test_can_update_service(): void
    {
        $this->actingAsSuperAdmin();
        $service = Service::factory()->create(['status' => 'inactive']);

        $response = $this->putJson("/api/v1/admin/services/{$service->id}", [
            'status' => 'active',
            'pricing_type' => 'fixed',
            'starting_price' => '99.99',
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('data.status', 'active')
            ->assertJsonPath('data.starting_price', '99.99');
    }

    // ── Delete ───────────────────────────────────────────────────────

    public function test_cannot_delete_active_service(): void
    {
        $this->actingAsSuperAdmin();
        $service = Service::factory()->active()->create();

        $response = $this->deleteJson("/api/v1/admin/services/{$service->id}");

        $response->assertStatus(422);
        $this->assertNotSoftDeleted('services', ['id' => $service->id]);
    }

    public function test_can_delete_inactive_service(): void
    {
        $this->actingAsSuperAdmin();
        $service = Service::factory()->create(['status' => 'inactive']);

        $response = $this->deleteJson("/api/v1/admin/services/{$service->id}");

        $response->assertStatus(200);
        $this->assertSoftDeleted('services', ['id' => $service->id]);
    }

    // ── Public visibility ────────────────────────────────────────────

    public function test_public_services_only_include_active(): void
    {
        Service::factory()->active()->create(['slug' => 'visible-service']);
        Service::factory()->create(['slug' => 'hidden-service', 'status' => 'inactive']);

        $response = $this->getJson('/api/v1/public/services');

        $response->assertStatus(200)
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.slug', 'visible-service')
            // admin-only fields never leak to the public API
            ->assertJsonMissingPath('data.0.created_at')
            ->assertJsonMissingPath('data.0.seo_meta')
            // business classification + operational flags stay internal
            ->assertJsonMissingPath('data.0.service_class')
            ->assertJsonMissingPath('data.0.status')
            ->assertJsonMissingPath('data.0.sort_order');
    }

    public function test_public_service_detail_is_localized_and_404s_for_inactive(): void
    {
        Service::factory()->active()->create([
            'slug' => 'web-development', 'name_en' => 'Web Development', 'name_ar' => 'تطوير مواقع',
        ]);

        $response = $this->getJson('/api/v1/public/services/web-development');

        $response->assertStatus(200)
            ->assertJsonPath('data.name', 'Web Development');

        $this->getJson('/api/v1/public/services/hidden-service')->assertStatus(404);
    }
}
