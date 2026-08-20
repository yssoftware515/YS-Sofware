<?php

namespace Tests\Feature\Admin;

use App\Domains\Cms\Models\StaticPage;
use App\Domains\Product\Models\Product;
use App\Domains\Product\Models\ProductMedia;
use App\Domains\Services\Models\Service;
use App\Domains\System\Models\Media;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class MediaTest extends TestCase
{
    use RefreshDatabase;

    private function createMedia(): Media
    {
        return Media::create([
            'disk' => 'local',
            'path' => 'media/'.now()->format('Y/m').'/unused.png',
            'filename' => 'unused.png',
            'original_name' => 'unused.png',
            'mime_type' => 'image/png',
            'size' => 1024,
            'uploaded_by' => null,
        ]);
    }

    public function test_unused_media_can_be_deleted(): void
    {
        Storage::fake('local');
        $this->actingAsSuperAdmin();

        $media = $this->createMedia();

        $response = $this->deleteJson('/api/v1/admin/media/'.$media->id);

        $response->assertStatus(200)
            ->assertJsonPath('success', true);
        $this->assertSoftDeleted('media', ['id' => $media->id]);
    }

    public function test_media_used_as_product_cover_cannot_be_deleted(): void
    {
        Storage::fake('local');
        $this->actingAsSuperAdmin();

        $media = $this->createMedia();
        Product::factory()->create(['cover_image_id' => $media->id]);

        $response = $this->deleteJson('/api/v1/admin/media/'.$media->id);

        $response->assertStatus(422)
            ->assertJsonPath('success', false)
            ->assertJsonPath('errors.references.products', 1);
        $this->assertDatabaseHas('media', ['id' => $media->id]);
    }

    public function test_media_used_as_service_or_page_cover_cannot_be_deleted(): void
    {
        Storage::fake('local');
        $this->actingAsSuperAdmin();

        $media = $this->createMedia();
        Service::factory()->create(['cover_image_id' => $media->id]);
        StaticPage::factory()->create(['cover_media_id' => $media->id]);

        $response = $this->deleteJson('/api/v1/admin/media/'.$media->id);

        $response->assertStatus(422)
            ->assertJsonPath('errors.references.services', 1)
            ->assertJsonPath('errors.references.static_pages', 1);
        $this->assertDatabaseHas('media', ['id' => $media->id]);
    }

    public function test_media_used_in_product_gallery_cannot_be_deleted(): void
    {
        Storage::fake('local');
        $this->actingAsSuperAdmin();

        $media = $this->createMedia();
        $product = Product::factory()->create();
        ProductMedia::create([
            'product_id' => $product->id,
            'media_id' => $media->id,
        ]);

        $response = $this->deleteJson('/api/v1/admin/media/'.$media->id);

        $response->assertStatus(422)
            ->assertJsonPath('errors.references.product_media', 1);
        $this->assertDatabaseHas('media', ['id' => $media->id]);
    }

    public function test_unauthenticated_user_cannot_delete_media(): void
    {
        Storage::fake('local');
        $media = $this->createMedia();

        $response = $this->deleteJson('/api/v1/admin/media/'.$media->id);

        $response->assertStatus(401);
        $this->assertDatabaseHas('media', ['id' => $media->id]);
    }
}
