<?php

namespace Tests\Feature\Admin;

use App\Domains\System\Models\Setting;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * VULN-04/VULN-25 regression tests — every markup-capable write path
 * must neutralize script/event-handler payloads at the write boundary,
 * and every URL field must reject executable schemes.
 */
class XssSanitizationTest extends TestCase
{
    use RefreshDatabase;

    private const PAYLOADS = [
        '<script>alert(1)</script>',
        '<svg onload="alert(1)">',
        '<a href="javascript:alert(1)">x</a>',
        '<img src=x onerror="alert(1)">',
    ];

    private function assertPayloadNeutralized(string $stored): void
    {
        $this->assertStringNotContainsString('<script', $stored);
        $this->assertStringNotContainsString('<svg', $stored);
        $this->assertStringNotContainsString('onload', $stored);
        $this->assertStringNotContainsString('onerror', $stored);
        $this->assertStringNotContainsString('javascript:', strtolower($stored));
    }

    // ── Services ──────────────────────────────────────────────────────

    public function test_service_store_and_update_sanitize_descriptions(): void
    {
        $this->actingAsSuperAdmin();

        $response = $this->postJson('/api/v1/admin/services', [
            'slug' => 'dev-ops',
            'name_en' => 'DevOps',
            'name_ar' => 'ديف أوبس',
            'description_en' => self::PAYLOADS[0],
            'pricing_type' => 'fixed',
        ])->assertStatus(201)->assertJson(['success' => true]);

        $this->assertPayloadNeutralized($response->json('data.description_en'));

        $serviceId = $response->json('data.id');
        $updated = $this->putJson("/api/v1/admin/services/{$serviceId}", [
            'description_en' => self::PAYLOADS[2],
        ])->assertOk();

        $this->assertPayloadNeutralized($updated->json('data.description_en'));
    }

    // ── Settings ──────────────────────────────────────────────────────

    public function test_settings_social_url_must_be_https(): void
    {
        $this->actingAsSuperAdmin();
        $setting = Setting::create([
            'group' => 'social',
            'key' => 'github_url',
            'value' => 'https://github.com/example',
            'is_public' => true,
        ]);

        $this->putJson("/api/v1/admin/settings/{$setting->id}", [
            'value' => 'javascript:evil()',
        ])->assertStatus(422);

        $this->putJson("/api/v1/admin/settings/{$setting->id}", [
            'value' => 'https://evil.example.com',
        ])->assertOk();

        $this->assertSame('https://evil.example.com', $setting->fresh()->value);
    }

    public function test_settings_boolean_key_rejects_non_boolean(): void
    {
        $this->actingAsSuperAdmin();
        $setting = Setting::create([
            'group' => 'system',
            'key' => 'maintenance_mode',
            'value' => false,
            'is_public' => false,
        ]);

        $this->putJson("/api/v1/admin/settings/{$setting->id}", [
            'value' => 'not-a-boolean',
        ])->assertStatus(422);

        $this->putJson("/api/v1/admin/settings/{$setting->id}", [
            'value' => true,
        ])->assertOk();

        $this->assertTrue($setting->fresh()->value);
    }
}
