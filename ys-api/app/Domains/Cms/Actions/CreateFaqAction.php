<?php

namespace App\Domains\Cms\Actions;

use App\Domains\Cms\Models\Faq;
use App\Domains\System\Services\HtmlSanitizerService;
use Illuminate\Support\Facades\Auth;

class CreateFaqAction
{
    public function execute(array $data): Faq
    {
        // VULN-04: answers may contain HTML markup (rich text) — strip
        // script/event-handler payloads at the write boundary.
        $sanitizer = app(HtmlSanitizerService::class);

        return Faq::create([
            'question_en' => $data['question_en'],
            'question_ar' => $data['question_ar'],
            'answer_en' => $sanitizer->sanitizeIfHtml($data['answer_en']),
            'answer_ar' => $sanitizer->sanitizeIfHtml($data['answer_ar']),
            'highlight_en' => isset($data['highlight_en']) ? $sanitizer->sanitizeIfHtml($data['highlight_en']) : null,
            'highlight_ar' => isset($data['highlight_ar']) ? $sanitizer->sanitizeIfHtml($data['highlight_ar']) : null,
            'category' => $data['category'] ?? null,
            // INT-003: the faqs table defaults status to 'published' — a
            // FAQ created without an explicit status must be visible on the
            // public page, not silently hidden as a draft.
            'status' => $data['status'] ?? 'published',
            'sort_order' => $data['sort_order'] ?? 0,
            'created_by' => Auth::id(),
        ]);
    }
}
