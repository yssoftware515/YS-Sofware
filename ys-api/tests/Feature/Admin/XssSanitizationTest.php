<?php

namespace Tests\Feature\Admin;

use App\Domains\Cms\Models\Menu;
use App\Domains\Product\Models\Product;
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

    // ── FAQs ──────────────────────────────────────────────────────────

    public function test_faq_store_and_update_sanitize_all_xss_payloads(): void
    {
        $this->actingAsSuperAdmin();

        foreach (self::PAYLOADS as $payload) {
            $response = $this->postJson('/api/v1/admin/faqs', [
                'question_en' => 'Q?',
                'question_ar' => 'سؤال؟',
                'answer_en' => $payload,
                'answer_ar' => 'إجابة',
            ])->assertStatus(201)->assertJson(['success' => true]);

            $this->assertPayloadNeutralized($response->json('data.answer_en'));

            $faqId = $response->json('data.id');
            $updated = $this->putJson("/api/v1/admin/faqs/{$faqId}", [
                'answer_en' => $payload,
            ])->assertOk()->assertJson(['success' => true]);

            $this->assertPayloadNeutralized($updated->json('data.answer_en'));
        }
    }

    public function test_faq_plain_text_passes_through_unchanged(): void
    {
        $this->actingAsSuperAdmin();

        $response = $this->postJson('/api/v1/admin/faqs', [
            'question_en' => 'Q?',
            'question_ar' => 'سؤال؟',
            'answer_en' => 'Contact sales@ys.com for pricing & trials.',
            'answer_ar' => 'إجابة',
        ])->assertStatus(201);

        $this->assertSame('Contact sales@ys.com for pricing & trials.', $response->json('data.answer_en'));
    }

    // ── Static pages ──────────────────────────────────────────────────

    public function test_static_page_store_and_update_sanitize_json_content(): void
    {
        $this->actingAsSuperAdmin();

        $payloadJson = json_encode([
            ['label' => 'Mission', 'text' => '<script>alert(1)</script>Our mission'],
            ['label' => 'Vision', 'text' => 'Plain vision text & more'],
        ]);

        $response = $this->postJson('/api/v1/admin/static-pages', [
            'slug' => 'about-test',
            'title_en' => 'About',
            'title_ar' => 'حول',
            'content_en' => $payloadJson,
        ])->assertStatus(201)->assertJson(['success' => true]);

        $stored = $response->json('data.content_en');
        $this->assertIsString($stored);
        $decoded = json_decode($stored, true);
        $this->assertIsArray($decoded, 'stored content must remain valid JSON');
        $this->assertStringNotContainsString('<script', $decoded[0]['text']);
        $this->assertSame('Plain vision text & more', $decoded[1]['text']);

        $pageId = $response->json('data.id');
        $updated = $this->putJson("/api/v1/admin/static-pages/{$pageId}", [
            'content_en' => json_encode([['label' => 'X', 'text' => '<svg onload="alert(1)">']]),
        ])->assertOk();

        $decoded = json_decode($updated->json('data.content_en'), true);
        $this->assertPayloadNeutralized($decoded[0]['text']);
    }

    // ── Updates ───────────────────────────────────────────────────────

    public function test_update_store_and_update_sanitize_content(): void
    {
        $this->actingAsSuperAdmin();

        $response = $this->postJson('/api/v1/admin/updates', [
            'title_en' => 'v1.2',
            'title_ar' => 'الإصدار 1.2',
            'content_en' => self::PAYLOADS[0],
            'content_ar' => 'محتوى',
        ])->assertStatus(201)->assertJson(['success' => true]);

        $this->assertPayloadNeutralized($response->json('data.content_en'));

        $updateId = $response->json('data.id');
        $updated = $this->putJson("/api/v1/admin/updates/{$updateId}", [
            'content_en' => self::PAYLOADS[1],
        ])->assertOk();

        $this->assertPayloadNeutralized($updated->json('data.content_en'));
    }

    // ── Roadmap ───────────────────────────────────────────────────────

    public function test_roadmap_store_and_update_sanitize_descriptions(): void
    {
        $this->actingAsSuperAdmin();

        $response = $this->postJson('/api/v1/admin/roadmap', [
            'title_en' => 'Feature X',
            'title_ar' => 'ميزة',
            'description_en' => self::PAYLOADS[2],
            'description_ar' => 'وصف',
        ])->assertStatus(201)->assertJson(['success' => true]);

        $this->assertPayloadNeutralized($response->json('data.description_en'));

        $itemId = $response->json('data.id');
        $updated = $this->putJson("/api/v1/admin/roadmap/{$itemId}", [
            'description_en' => self::PAYLOADS[3],
        ])->assertOk();

        $this->assertPayloadNeutralized($updated->json('data.description_en'));
    }

    // ── Timeline ──────────────────────────────────────────────────────

    public function test_timeline_store_and_update_sanitize_descriptions(): void
    {
        $this->actingAsSuperAdmin();

        $response = $this->postJson('/api/v1/admin/timeline', [
            'title_en' => 'Founded',
            'title_ar' => 'تأسست',
            'description_en' => self::PAYLOADS[0],
            'event_date' => '2020-01-01',
        ])->assertStatus(201)->assertJson(['success' => true]);

        $this->assertPayloadNeutralized($response->json('data.description_en'));

        $entryId = $response->json('data.id');
        $updated = $this->putJson("/api/v1/admin/timeline/{$entryId}", [
            'description_en' => self::PAYLOADS[1],
        ])->assertOk();

        $this->assertPayloadNeutralized($updated->json('data.description_en'));
    }

    // ── Careers ───────────────────────────────────────────────────────

    public function test_career_store_and_update_sanitize_description_and_lists(): void
    {
        $this->actingAsSuperAdmin();

        $response = $this->postJson('/api/v1/admin/careers', [
            'title_en' => 'Backend Dev',
            'title_ar' => 'مطور',
            'department' => 'Engineering',
            'description_en' => self::PAYLOADS[3],
            'requirements' => [self::PAYLOADS[0], '5 years PHP'],
            'responsibilities' => ['Write code', self::PAYLOADS[2]],
        ])->assertStatus(201)->assertJson(['success' => true]);

        $this->assertPayloadNeutralized($response->json('data.description_en'));
        $this->assertPayloadNeutralized($response->json('data.requirements.0'));
        $this->assertSame('5 years PHP', $response->json('data.requirements.1'));
        $this->assertSame('Write code', $response->json('data.responsibilities.0'));
        $this->assertPayloadNeutralized($response->json('data.responsibilities.1'));

        $careerId = $response->json('data.id');
        $updated = $this->putJson("/api/v1/admin/careers/{$careerId}", [
            'description_en' => self::PAYLOADS[0],
            'requirements' => [self::PAYLOADS[1]],
        ])->assertOk();

        $this->assertPayloadNeutralized($updated->json('data.description_en'));
        $this->assertPayloadNeutralized($updated->json('data.requirements.0'));
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

    // ── Releases ──────────────────────────────────────────────────────

    public function test_release_store_and_update_sanitize_notes_and_changelog(): void
    {
        $this->actingAsSuperAdmin();
        $product = Product::factory()->active()->create();

        $response = $this->postJson('/api/v1/admin/releases', [
            'product_id' => $product->id,
            'version' => '1.0.0',
            'release_date' => '2025-01-01',
            'release_notes_en' => self::PAYLOADS[0],
            'changelog' => [
                'improvements' => [self::PAYLOADS[1], 'Faster loading'],
                'fixes' => [self::PAYLOADS[2]],
            ],
        ])->assertStatus(201)->assertJson(['success' => true]);

        $this->assertPayloadNeutralized($response->json('data.release_notes_en'));
        $this->assertPayloadNeutralized($response->json('data.changelog.improvements.0'));
        $this->assertSame('Faster loading', $response->json('data.changelog.improvements.1'));
        $this->assertPayloadNeutralized($response->json('data.changelog.fixes.0'));

        $releaseId = $response->json('data.id');
        $updated = $this->putJson("/api/v1/admin/releases/{$releaseId}", [
            'release_notes_en' => self::PAYLOADS[3],
        ])->assertOk();

        $this->assertPayloadNeutralized($updated->json('data.release_notes_en'));
    }

    // ── Homepage sections ─────────────────────────────────────────────

    public function test_homepage_section_store_and_update_sanitize_content_json(): void
    {
        $this->actingAsSuperAdmin();

        $response = $this->postJson('/api/v1/admin/homepage-sections', [
            'type' => 'hero',
            'title_en' => 'Hero',
            'content' => [
                'headline' => self::PAYLOADS[0],
                'subline' => 'Welcome & stay',
                'cta' => ['label' => 'Go', 'url' => self::PAYLOADS[2]],
            ],
        ])->assertStatus(201)->assertJson(['success' => true]);

        $this->assertPayloadNeutralized($response->json('data.content.headline'));
        $this->assertSame('Welcome & stay', $response->json('data.content.subline'));
        $this->assertPayloadNeutralized($response->json('data.content.cta.url'));

        $sectionId = $response->json('data.id');
        $updated = $this->putJson("/api/v1/admin/homepage-sections/{$sectionId}", [
            'content' => ['headline' => self::PAYLOADS[1]],
        ])->assertOk();

        $this->assertPayloadNeutralized($updated->json('data.content.headline'));
    }

    // ── Products ──────────────────────────────────────────────────────

    public function test_product_store_sanitizes_value_proposition_and_target_audience(): void
    {
        $this->actingAsSuperAdmin();

        $response = $this->postJson('/api/v1/admin/products', [
            'slug' => 'xss-prod',
            'name_en' => 'XSS Prod',
            'name_ar' => 'منتج',
            'value_proposition_en' => self::PAYLOADS[0],
            'target_audience_en' => self::PAYLOADS[1],
        ])->assertStatus(201)->assertJson(['success' => true]);

        $this->assertPayloadNeutralized($response->json('data.value_proposition_en'));
        $this->assertPayloadNeutralized($response->json('data.target_audience_en'));
    }

    public function test_product_external_url_must_be_https(): void
    {
        $this->actingAsSuperAdmin();

        $this->postJson('/api/v1/admin/products', [
            'slug' => 'url-prod',
            'name_en' => 'URL Prod',
            'name_ar' => 'منتج',
            'product_url' => 'javascript:alert(1)',
        ])->assertStatus(422);

        $this->postJson('/api/v1/admin/products', [
            'slug' => 'url-prod-2',
            'name_en' => 'URL Prod 2',
            'name_ar' => 'منتج',
            'documentation_url' => 'http://insecure.example.com',
        ])->assertStatus(422);

        $this->postJson('/api/v1/admin/products', [
            'slug' => 'url-prod-3',
            'name_en' => 'URL Prod 3',
            'name_ar' => 'منتج',
            'support_url' => 'https://evil.example.com',
        ])->assertStatus(201);
    }

    // ── Menu items (URLs) ─────────────────────────────────────────────

    public function test_menu_item_rejects_executable_schemes(): void
    {
        $this->actingAsSuperAdmin();
        $menu = Menu::create(['name' => 'Header', 'location' => 'header', 'is_active' => true]);

        foreach (['javascript:alert(1)', 'data:text/html,<script>alert(1)</script>', 'vbscript:msgbox(1)', 'file:///etc/passwd'] as $bad) {
            $this->postJson('/api/v1/admin/menu-items', [
                'menu_id' => $menu->id,
                'title_en' => 'Bad',
                'title_ar' => 'سيئ',
                'url' => $bad,
            ])->assertStatus(422, "menu URL [{$bad}] must be rejected");
        }

        // Legitimate values still accepted: relative internal link,
        // protocol-relative, absolute https.
        foreach (['/products', '#contact', '//cdn.example.com/x', 'https://example.com'] as $good) {
            $this->postJson('/api/v1/admin/menu-items', [
                'menu_id' => $menu->id,
                'title_en' => 'Good',
                'title_ar' => 'جيد',
                'url' => $good,
            ])->assertStatus(201, "menu URL [{$good}] must be accepted");
        }
    }

    public function test_menu_item_update_rejects_executable_schemes(): void
    {
        $this->actingAsSuperAdmin();
        $menu = Menu::create(['name' => 'Header', 'location' => 'header', 'is_active' => true]);
        $item = $menu->items()->create([
            'title_en' => 'Home',
            'title_ar' => 'الرئيسية',
            'url' => '/',
            'sort_order' => 0,
            'is_active' => true,
        ]);

        $this->putJson("/api/v1/admin/menu-items/{$item->id}", [
            'url' => 'javascript:alert(1)',
        ])->assertStatus(422);

        $this->putJson("/api/v1/admin/menu-items/{$item->id}", [
            'url' => '/products',
        ])->assertOk();

        $this->assertSame('/products', $item->fresh()->url);
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
