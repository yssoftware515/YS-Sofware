<?php

namespace Tests\Feature\Admin;

use App\Domains\Cms\Models\Faq;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Admin FAQ response contract — regression guard for ARCH-001.
 *
 * The admin FAQ endpoints must return the bilingual-by-field contract
 * (question_en/question_ar/...) — never the public localized shape
 * (question/answer), which used to make the admin list page read
 * undefined and crash on item.answer.slice().
 */
class FaqContractTest extends TestCase
{
    use RefreshDatabase;

    public function test_index_returns_admin_faq_contract_per_item(): void
    {
        $this->actingAsSuperAdmin();
        Faq::factory()->count(2)->create();

        $response = $this->getJson('/api/v1/admin/faqs');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'data' => [[
                    'id',
                    'question_en',
                    'question_ar',
                    'answer_en',
                    'answer_ar',
                    'highlight_en',
                    'highlight_ar',
                    'category',
                    'status',
                    'sort_order',
                    'created_at',
                ]],
                'meta' => ['current_page', 'last_page', 'total'],
            ]);

        // THE regression: no item may ever expose the public localized
        // keys (question/answer) that the admin list page used to read.
        foreach ($response->json('data') as $item) {
            $this->assertArrayNotHasKey('question', $item, 'Admin FAQ items must not expose the public localized "question" key.');
            $this->assertArrayNotHasKey('answer', $item, 'Admin FAQ items must not expose the public localized "answer" key.');
            $this->assertArrayNotHasKey('highlight', $item, 'Admin FAQ items must not expose the public localized "highlight" key.');
        }
    }

    public function test_show_returns_admin_faq_contract_with_creator(): void
    {
        $this->actingAsSuperAdmin();
        $faq = Faq::factory()->create();

        $response = $this->getJson("/api/v1/admin/faqs/{$faq->id}");

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonStructure([
                'data' => [
                    'id', 'question_en', 'question_ar', 'answer_en', 'answer_ar',
                    'highlight_en', 'highlight_ar', 'category', 'status', 'sort_order',
                    'creator' => ['id', 'name'],
                    'created_at',
                ],
            ])
            ->assertJsonPath('data.question_en', $faq->question_en)
            ->assertJsonPath('data.answer_en', $faq->answer_en);

        $data = $response->json('data');
        $this->assertArrayNotHasKey('question', $data);
        $this->assertArrayNotHasKey('answer', $data);
    }

    public function test_store_returns_admin_faq_contract(): void
    {
        $this->actingAsSuperAdmin();

        $response = $this->postJson('/api/v1/admin/faqs', [
            'question_en' => 'How do I get started?',
            'question_ar' => 'كيف أبدأ؟',
            'answer_en' => 'Contact us.',
            'answer_ar' => 'تواصل معنا.',
            'category' => 'general',
            'status' => 'published',
            'sort_order' => 1,
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonStructure([
                'data' => [
                    'id', 'question_en', 'question_ar', 'answer_en', 'answer_ar',
                    'highlight_en', 'highlight_ar', 'category', 'status', 'sort_order', 'created_at',
                ],
            ])
            ->assertJsonPath('data.question_en', 'How do I get started?');
    }
}
