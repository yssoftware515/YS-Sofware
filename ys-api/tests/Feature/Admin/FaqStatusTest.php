<?php

namespace Tests\Feature\Admin;

use App\Domains\Cms\Models\Faq;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * INT-003 regression — the FAQ publishing lifecycle.
 *
 * The public FAQ endpoint only returns status=published rows. The admin
 * form must be able to create draft, publish, and archive FAQs — and a
 * create WITHOUT a status must default to published (matching the table
 * default), never silently hide new FAQs.
 */
class FaqStatusTest extends TestCase
{
    use RefreshDatabase;

    public function test_create_without_status_defaults_to_published(): void
    {
        $this->actingAsSuperAdmin();

        $response = $this->postJson('/api/v1/admin/faqs', [
            'question_en' => 'How do I start?',
            'question_ar' => 'كيف أبدأ؟',
            'answer_en' => 'Contact us.',
            'answer_ar' => 'تواصل معنا.',
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.status', 'published');
    }

    public function test_create_with_draft_status_stays_hidden_from_public(): void
    {
        $this->actingAsSuperAdmin();

        $response = $this->postJson('/api/v1/admin/faqs', [
            'question_en' => 'Draft question',
            'question_ar' => 'سؤال مسودة',
            'answer_en' => 'Answer',
            'answer_ar' => 'إجابة',
            'status' => 'draft',
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.status', 'draft');

        $public = $this->getJson('/api/v1/public/faqs');
        $public->assertStatus(200)
            ->assertJsonCount(0, 'data');
    }

    public function test_update_can_publish_a_draft_and_archive_a_published(): void
    {
        $this->actingAsSuperAdmin();
        $faq = Faq::factory()->create(['status' => 'draft']);

        $published = $this->putJson("/api/v1/admin/faqs/{$faq->id}", ['status' => 'published']);
        $published->assertStatus(200)
            ->assertJsonPath('data.status', 'published');

        $public = $this->getJson('/api/v1/public/faqs');
        $public->assertStatus(200)
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $faq->id);

        $archived = $this->putJson("/api/v1/admin/faqs/{$faq->id}", ['status' => 'archived']);
        $archived->assertStatus(200)
            ->assertJsonPath('data.status', 'archived');

        $publicAfter = $this->getJson('/api/v1/public/faqs');
        $publicAfter->assertStatus(200)
            ->assertJsonCount(0, 'data');
    }

    public function test_invalid_status_is_rejected(): void
    {
        $this->actingAsSuperAdmin();

        $response = $this->postJson('/api/v1/admin/faqs', [
            'question_en' => 'Q',
            'question_ar' => 'س',
            'answer_en' => 'A',
            'answer_ar' => 'ج',
            'status' => 'deleted',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['status']);
    }
}