<?php

namespace Tests\Feature\Localization;

use App\Domains\Product\Models\Product;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Verifies that the ResolveLocale middleware translates the Accept-Language
 * header into the application locale, so public resources localize their
 * output for API clients (ar, en) without ever accepting an unsupported
 * locale or failing on malformed headers.
 */
class LocaleMiddlewareTest extends TestCase
{
    use RefreshDatabase;

    private Product $product;

    protected function setUp(): void
    {
        parent::setUp();

        $this->product = Product::factory()->create([
            'name_en' => 'English Product Name',
            'name_ar' => 'اسم المنتج بالعربية',
            'short_desc_en' => 'English short description.',
            'short_desc_ar' => 'وصف قصير باللغة العربية.',
            'status' => 'active',
        ]);
    }

    public function test_defaults_to_english_without_header(): void
    {
        $response = $this->getJson('/api/v1/public/products');

        $response->assertStatus(200);
        $this->assertSame('English Product Name', $response->json('data.0.name'));
    }

    public function test_simple_arabic_header_localizes_response(): void
    {
        $response = $this->withHeader('Accept-Language', 'ar')
            ->getJson('/api/v1/public/products');

        $response->assertStatus(200);
        $this->assertSame('اسم المنتج بالعربية', $response->json('data.0.name'));
        $this->assertSame('وصف قصير باللغة العربية.', $response->json('data.0.short_desc'));
    }

    public function test_complex_header_picks_highest_quality_supported_range(): void
    {
        $response = $this->withHeader('Accept-Language', 'ar,en;q=0.8')
            ->getJson('/api/v1/public/products');

        $response->assertStatus(200);
        $this->assertSame('اسم المنتج بالعربية', $response->json('data.0.name'));
    }

    public function test_english_wins_over_arabic_when_quality_is_higher(): void
    {
        $response = $this->withHeader('Accept-Language', 'en;q=0.9,ar;q=0.5')
            ->getJson('/api/v1/public/products');

        $response->assertStatus(200);
        $this->assertSame('English Product Name', $response->json('data.0.name'));
    }

    public function test_region_variant_maps_to_base_language(): void
    {
        $response = $this->withHeader('Accept-Language', 'ar-EG')
            ->getJson('/api/v1/public/products');

        $response->assertStatus(200);
        $this->assertSame('اسم المنتج بالعربية', $response->json('data.0.name'));
    }

    public function test_unsupported_locale_falls_back_to_english(): void
    {
        $response = $this->withHeader('Accept-Language', 'fr-FR')
            ->getJson('/api/v1/public/products');

        $response->assertStatus(200);
        $this->assertSame('English Product Name', $response->json('data.0.name'));
    }

    public function test_wildcard_header_falls_back_to_english(): void
    {
        $response = $this->withHeader('Accept-Language', '*')
            ->getJson('/api/v1/public/products');

        $response->assertStatus(200);
        $this->assertSame('English Product Name', $response->json('data.0.name'));
    }

    public function test_malformed_header_falls_back_to_english(): void
    {
        $response = $this->withHeader('Accept-Language', ',,,;;')
            ->getJson('/api/v1/public/products');

        $response->assertStatus(200);
        $this->assertSame('English Product Name', $response->json('data.0.name'));
    }
}
