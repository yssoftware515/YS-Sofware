<?php

namespace Tests\Feature\Admin;

use App\Domains\Auth\Models\Role;
use App\Domains\Auth\Models\User;
use App\Domains\Content\Models\RoadmapItem;
use App\Domains\Content\Models\TimelineEntry;
use App\Domains\Content\Models\Update;
use App\Domains\Product\Models\Product;
use App\Domains\System\Models\FeatureFlag;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Product-scoping for content modules (roadmap / updates / timeline /
 * feature flags): a scoped admin may only read, create and mutate rows
 * attached to products they are explicitly granted — and global rows
 * (product_id null) stay visible to everyone.
 */
class ProductScopedContentTest extends TestCase
{
    use RefreshDatabase;

    private Product $productA;

    private Product $productB;

    private User $scopedAdmin;

    protected function setUp(): void
    {
        parent::setUp();

        $this->productA = Product::factory()->active()->create();
        $this->productB = Product::factory()->active()->create();

        $role = Role::factory()->create([
            'slug' => 'content_scoped_'.uniqid(),
            'permissions' => [
                'manage_roadmap',
                'manage_updates',
                'manage_timeline',
                'manage_feature_flags',
            ],
        ]);
        $this->scopedAdmin = User::factory()->create([
            'role_id' => $role->id,
            'is_active' => true,
        ]);
        $this->scopedAdmin->products()->attach($this->productA->id);

        Sanctum::actingAs($this->scopedAdmin, ['admin']);
    }

    // ── Roadmap ──────────────────────────────────────────────────────

    public function test_roadmap_index_hides_other_products_items_but_keeps_global_and_own(): void
    {
        RoadmapItem::factory()->create(['product_id' => $this->productA->id]);
        RoadmapItem::factory()->create(['product_id' => $this->productB->id]);
        RoadmapItem::factory()->create(['product_id' => null]);

        $response = $this->getJson('/api/v1/admin/roadmap');

        $response->assertOk();
        $ids = collect($response->json('data'))->pluck('id')->all();
        $this->assertCount(2, $ids, 'Scoped admin must see own + global items only.');
    }

    public function test_roadmap_store_rejects_other_products_product_id(): void
    {
        $response = $this->postJson('/api/v1/admin/roadmap', [
            'product_id' => $this->productB->id,
            'title_en' => 'Cross-product item',
            'title_ar' => 'عنصر',
        ]);

        $response->assertStatus(403);
        $this->assertDatabaseMissing('roadmap_items', ['title_en' => 'Cross-product item']);
    }

    public function test_roadmap_mutations_on_other_products_item_are_forbidden(): void
    {
        $item = RoadmapItem::factory()->create(['product_id' => $this->productB->id]);

        $this->getJson("/api/v1/admin/roadmap/{$item->id}")->assertStatus(403);
        $this->putJson("/api/v1/admin/roadmap/{$item->id}", ['title_en' => 'Hacked'])->assertStatus(403);
        $this->deleteJson("/api/v1/admin/roadmap/{$item->id}")->assertStatus(403);
        $this->assertDatabaseHas('roadmap_items', ['id' => $item->id]);
    }

    public function test_roadmap_mutations_on_own_products_item_succeed(): void
    {
        $item = RoadmapItem::factory()->create(['product_id' => $this->productA->id]);

        $this->getJson("/api/v1/admin/roadmap/{$item->id}")->assertOk();
        $this->putJson("/api/v1/admin/roadmap/{$item->id}", ['title_en' => 'Updated'])->assertOk();
        $this->deleteJson("/api/v1/admin/roadmap/{$item->id}")->assertOk();
    }

    // ── Updates ──────────────────────────────────────────────────────

    public function test_updates_index_hides_other_products_updates(): void
    {
        Update::factory()->create(['product_id' => $this->productA->id]);
        Update::factory()->create(['product_id' => $this->productB->id]);

        $response = $this->getJson('/api/v1/admin/updates');

        $response->assertOk();
        $this->assertCount(1, $response->json('data'));
    }

    public function test_update_publish_and_mutations_on_other_products_update_are_forbidden(): void
    {
        $update = Update::factory()->create(['product_id' => $this->productB->id]);

        $this->getJson("/api/v1/admin/updates/{$update->id}")->assertStatus(403);
        $this->putJson("/api/v1/admin/updates/{$update->id}", ['title_en' => 'Hacked'])->assertStatus(403);
        $this->postJson("/api/v1/admin/updates/{$update->id}/publish")->assertStatus(403);
        $this->postJson("/api/v1/admin/updates/{$update->id}/unpublish")->assertStatus(403);
        $this->deleteJson("/api/v1/admin/updates/{$update->id}")->assertStatus(403);
    }

    public function test_update_store_rejects_other_products_product_id(): void
    {
        $this->postJson('/api/v1/admin/updates', [
            'product_id' => $this->productB->id,
            'title_en' => 'Cross-product update',
            'title_ar' => 'تحديث',
            'content_en' => 'Body',
            'content_ar' => 'نص',
        ])->assertStatus(403);
    }

    // ── Timeline ─────────────────────────────────────────────────────

    public function test_timeline_index_keeps_global_entries_but_hides_other_products_entries(): void
    {
        TimelineEntry::factory()->create(['product_id' => null]);
        TimelineEntry::factory()->create(['product_id' => $this->productA->id]);
        TimelineEntry::factory()->create(['product_id' => $this->productB->id]);

        $response = $this->getJson('/api/v1/admin/timeline');

        $response->assertOk();
        $this->assertCount(2, $response->json('data'));
    }

    public function test_timeline_store_rejects_other_products_product_id(): void
    {
        $this->postJson('/api/v1/admin/timeline', [
            'product_id' => $this->productB->id,
            'title_en' => 'Cross-product milestone',
            'title_ar' => 'مرحلة',
            'event_date' => '2026-01-01',
        ])->assertStatus(403);
    }

    public function test_timeline_mutations_on_other_products_entry_are_forbidden_but_global_allowed(): void
    {
        $otherEntry = TimelineEntry::factory()->create(['product_id' => $this->productB->id]);
        $globalEntry = TimelineEntry::factory()->create(['product_id' => null]);

        $this->putJson("/api/v1/admin/timeline/{$otherEntry->id}", ['title_en' => 'Hacked'])->assertStatus(403);
        $this->deleteJson("/api/v1/admin/timeline/{$otherEntry->id}")->assertStatus(403);

        $this->putJson("/api/v1/admin/timeline/{$globalEntry->id}", ['title_en' => 'Fine'])->assertOk();
        $this->deleteJson("/api/v1/admin/timeline/{$globalEntry->id}")->assertOk();
    }

    // ── Feature flags ────────────────────────────────────────────────

    public function test_feature_flag_index_hides_other_products_flags(): void
    {
        FeatureFlag::create(['key' => 'flag_a', 'product_id' => $this->productA->id]);
        FeatureFlag::create(['key' => 'flag_b', 'product_id' => $this->productB->id]);
        FeatureFlag::create(['key' => 'flag_global']);

        $response = $this->getJson('/api/v1/admin/feature-flags');

        $response->assertOk();
        $keys = collect($response->json('data'))->pluck('key')->all();
        $this->assertSame(['flag_a', 'flag_global'], $keys);
    }

    public function test_feature_flag_store_rejects_other_products_product_id(): void
    {
        $this->postJson('/api/v1/admin/feature-flags', [
            'key' => 'flag_cross',
            'product_id' => $this->productB->id,
        ])->assertStatus(403);
    }

    public function test_feature_flag_mutations_on_other_products_flag_are_forbidden(): void
    {
        $flag = FeatureFlag::create(['key' => 'flag_b', 'product_id' => $this->productB->id]);

        $this->putJson("/api/v1/admin/feature-flags/{$flag->id}", ['is_enabled' => true])->assertStatus(403);
        $this->deleteJson("/api/v1/admin/feature-flags/{$flag->id}")->assertStatus(403);
        $this->assertDatabaseHas('feature_flags', ['id' => $flag->id]);
    }
}
