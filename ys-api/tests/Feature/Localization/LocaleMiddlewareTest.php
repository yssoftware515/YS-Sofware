<?php

namespace Tests\Feature\Localization;

use App\Domains\Services\Models\Service;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Tests\TestCase;

/**
 * Verifies that the ResolveLocale middleware translates the Accept-Language
 * header into the application locale, so public resources localize their
 * output for API clients (ar, en) without ever accepting an unsupported
 * locale or failing on malformed headers.
 *
 * Uses the public services endpoint — the products endpoint this test
 * originally exercised was removed with the Product domain (Group A).
 */
class LocaleMiddlewareTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        // The public services list is cached (5 min) — flush between
        // tests so each one sees the service created in its own setUp.
        Cache::flush();

        Service::factory()->create([
            'slug' => 'localized-service',
            'name_en' => 'English Service Name',
            'name_ar' => 'اسم الخدمة بالعربية',
            'short_desc_en' => 'English short description.',
            'short_desc_ar' => 'وصف قصير باللغة العربية.',
            'status' => Service::STATUS_ACTIVE,
        ]);
    }

    public function test_defaults_to_english_without_header(): void
    {
        $response = $this->getJson('/api/v1/public/services');

        $response->assertStatus(200);
        $this->assertSame('English Service Name', $response->json('data.0.name'));
    }

    public function test_simple_arabic_header_localizes_response(): void
    {
        $response = $this->withHeader('Accept-Language', 'ar')
            ->getJson('/api/v1/public/services');

        $response->assertStatus(200);
        $this->assertSame('اسم الخدمة بالعربية', $response->json('data.0.name'));
        $this->assertSame('وصف قصير باللغة العربية.', $response->json('data.0.short_desc'));
    }

    public function test_complex_header_picks_highest_quality_supported_range(): void
    {
        $response = $this->withHeader('Accept-Language', 'ar,en;q=0.8')
            ->getJson('/api/v1/public/services');

        $response->assertStatus(200);
        $this->assertSame('اسم الخدمة بالعربية', $response->json('data.0.name'));
    }

    public function test_english_wins_over_arabic_when_quality_is_higher(): void
    {
        $response = $this->withHeader('Accept-Language', 'en;q=0.9,ar;q=0.5')
            ->getJson('/api/v1/public/services');

        $response->assertStatus(200);
        $this->assertSame('English Service Name', $response->json('data.0.name'));
    }

    public function test_region_variant_maps_to_base_language(): void
    {
        $response = $this->withHeader('Accept-Language', 'ar-EG')
            ->getJson('/api/v1/public/services');

        $response->assertStatus(200);
        $this->assertSame('اسم الخدمة بالعربية', $response->json('data.0.name'));
    }

    public function test_unsupported_locale_falls_back_to_english(): void
    {
        $response = $this->withHeader('Accept-Language', 'fr-FR')
            ->getJson('/api/v1/public/services');

        $response->assertStatus(200);
        $this->assertSame('English Service Name', $response->json('data.0.name'));
    }

    public function test_wildcard_header_falls_back_to_english(): void
    {
        $response = $this->withHeader('Accept-Language', '*')
            ->getJson('/api/v1/public/services');

        $response->assertStatus(200);
        $this->assertSame('English Service Name', $response->json('data.0.name'));
    }

    public function test_malformed_header_falls_back_to_english(): void
    {
        $response = $this->withHeader('Accept-Language', ',,,;;')
            ->getJson('/api/v1/public/services');

        $response->assertStatus(200);
        $this->assertSame('English Service Name', $response->json('data.0.name'));
    }
}
