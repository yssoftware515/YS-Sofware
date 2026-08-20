<?php

namespace Tests\Feature\Admin;

use App\Domains\Product\Models\Product;
use App\Domains\System\Models\Media;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProductTest extends TestCase
{
    use RefreshDatabase;

    // ── Index ────────────────────────────────────────────────────────

    public function test_super_admin_can_list_products(): void
    {
        $this->actingAsSuperAdmin();
        Product::factory()->count(3)->create();

        $response = $this->getJson('/api/v1/admin/products');

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonStructure(['data', 'meta']);
    }

    public function test_unauthenticated_user_cannot_list_products(): void
    {
        $response = $this->getJson('/api/v1/admin/products');
        $response->assertStatus(401);
    }

    // ── Create ───────────────────────────────────────────────────────

    public function test_super_admin_can_create_product(): void
    {
        $this->actingAsSuperAdmin();

        $response = $this->postJson('/api/v1/admin/products', [
            'slug' => 'ys-matrix',
            'name_en' => 'YS-Matrix',
            'name_ar' => 'واي إس ماتريكس',
            'status' => 'active',
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.slug', 'ys-matrix');

        $this->assertDatabaseHas('products', ['slug' => 'ys-matrix']);
    }

    public function test_duplicate_slug_is_rejected(): void
    {
        $this->actingAsSuperAdmin();
        Product::factory()->create(['slug' => 'ys-matrix']);

        $response = $this->postJson('/api/v1/admin/products', [
            'slug' => 'ys-matrix',
            'name_en' => 'Another Product',
            'name_ar' => 'منتج آخر',
        ]);

        $response->assertStatus(422);
    }

    public function test_product_requires_bilingual_names(): void
    {
        $this->actingAsSuperAdmin();

        $response = $this->postJson('/api/v1/admin/products', [
            'slug' => 'ys-test',
            'name_en' => 'Test Product',
            // name_ar missing
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['name_ar']);
    }

    // ── Update ───────────────────────────────────────────────────────

    public function test_super_admin_can_update_product(): void
    {
        $this->actingAsSuperAdmin();
        $product = Product::factory()->create(['status' => 'planned']);

        $response = $this->putJson("/api/v1/admin/products/{$product->id}", [
            'status' => 'beta',
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('data.status', 'beta');
    }

    // ── Delete ───────────────────────────────────────────────────────

    public function test_can_delete_planned_product(): void
    {
        $this->actingAsSuperAdmin();
        $product = Product::factory()->create(['status' => 'planned']);

        $response = $this->deleteJson("/api/v1/admin/products/{$product->id}");

        $response->assertStatus(200);
        $this->assertSoftDeleted('products', ['id' => $product->id]);
    }

    public function test_cannot_delete_active_product(): void
    {
        $this->actingAsSuperAdmin();
        $product = Product::factory()->create(['status' => 'active']);

        $response = $this->deleteJson("/api/v1/admin/products/{$product->id}");

        $response->assertStatus(422);
        $this->assertNotSoftDeleted('products', ['id' => $product->id]);
    }

    // ── Catalog children (features / pricing / media) ─────────────────

    public function test_can_create_product_with_features_pricing_and_media(): void
    {
        $this->actingAsSuperAdmin();
        $media = Media::create([
            'disk' => 'local',
            'path' => 'products/hero.png',
            'filename' => 'hero.png',
            'original_name' => 'hero.png',
            'mime_type' => 'image/png',
            'size' => 1024,
        ]);

        $response = $this->postJson('/api/v1/admin/products', [
            'slug' => 'ys-matrix',
            'name_en' => 'YS-Matrix',
            'name_ar' => 'واي إس ماتريكس',
            'status' => 'active',
            'product_url' => 'https://matrix.example.com',
            'features' => [
                ['title_en' => 'Feature One', 'title_ar' => 'ميزة واحدة', 'description_en' => 'Does things.'],
            ],
            'pricing_plans' => [
                ['name_en' => 'Pro', 'name_ar' => 'برو', 'pricing_type' => 'fixed', 'price' => '19.90', 'currency' => 'USD'],
            ],
            'media' => [
                ['media_id' => $media->id, 'kind' => 'hero'],
            ],
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.slug', 'ys-matrix')
            ->assertJsonPath('data.product_url', 'https://matrix.example.com')
            ->assertJsonCount(1, 'data.features')
            ->assertJsonCount(1, 'data.pricing_plans')
            ->assertJsonCount(1, 'data.media');

        $this->assertDatabaseHas('product_features', ['title_en' => 'Feature One']);
        $this->assertDatabaseHas('product_pricing_plans', ['price' => '19.90']);
        $this->assertDatabaseHas('product_media', ['media_id' => $media->id]);
    }

    public function test_update_with_empty_features_clears_the_list(): void
    {
        $this->actingAsSuperAdmin();
        $product = Product::factory()->create();

        $product->features()->create([
            'title_en' => 'Old Feature', 'title_ar' => 'ميزة قديمة',
        ]);

        $response = $this->putJson("/api/v1/admin/products/{$product->id}", [
            'features' => [],
        ]);

        $response->assertStatus(200)
            ->assertJsonCount(0, 'data.features');

        $this->assertDatabaseCount('product_features', 0);
    }

    public function test_invalid_destination_url_is_rejected(): void
    {
        $this->actingAsSuperAdmin();

        $response = $this->postJson('/api/v1/admin/products', [
            'slug' => 'ys-bad-url',
            'name_en' => 'Bad URL',
            'name_ar' => 'رابط خاطئ',
            'product_url' => 'not-a-url',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['product_url']);
    }
}
