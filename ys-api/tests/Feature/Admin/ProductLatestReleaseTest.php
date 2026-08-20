<?php

namespace Tests\Feature\Admin;

use App\Domains\Product\Models\Product;
use App\Domains\Product\Models\ProductRelease;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * latestRelease is a hasOne relation (a single model, never a collection):
 * callers use ->latestRelease directly — not ->latestRelease->first() —
 * so a null result stays null instead of a fatal on a null collection.
 */
class ProductLatestReleaseTest extends TestCase
{
    use RefreshDatabase;

    public function test_latest_release_returns_the_most_recent_published_release(): void
    {
        $product = Product::factory()->create();
        ProductRelease::factory()->create([
            'product_id' => $product->id,
            'version' => '1.0.0',
            'release_date' => '2025-01-01',
        ]);
        $newest = ProductRelease::factory()->create([
            'product_id' => $product->id,
            'version' => '2.0.0',
            'release_date' => '2026-01-01',
        ]);

        $latest = $product->latestRelease()->first();

        $this->assertNotNull($latest);
        $this->assertSame($newest->id, $latest->id);
    }

    public function test_latest_release_ignores_unpublished_releases(): void
    {
        $product = Product::factory()->create();
        ProductRelease::factory()->draft()->create([
            'product_id' => $product->id,
            'version' => '9.9.9',
            'release_date' => '2026-06-01',
        ]);
        $published = ProductRelease::factory()->create([
            'product_id' => $product->id,
            'version' => '1.2.0',
            'release_date' => '2026-01-01',
        ]);

        $latest = $product->latestRelease()->first();

        $this->assertSame($published->id, $latest->id);
    }

    public function test_latest_release_relation_is_a_single_model_or_null(): void
    {
        $product = Product::factory()->create();

        // Lazy load — the relation resolves to null, never an empty collection.
        $this->assertNull($product->latestRelease);

        ProductRelease::factory()->create(['product_id' => $product->id]);

        $this->assertInstanceOf(ProductRelease::class, $product->fresh()->latestRelease);
    }
}
