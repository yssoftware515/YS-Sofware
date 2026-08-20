<?php

namespace App\Domains\Cms\Actions;

use App\Domains\Cms\Models\Faq;
use App\Domains\System\Services\HtmlSanitizerService;

class UpdateFaqAction
{
    public function execute(Faq $faq, array $data): Faq
    {
        // VULN-04: same write-boundary sanitization as CreateFaqAction.
        $sanitizer = app(HtmlSanitizerService::class);

        if (array_key_exists('answer_en', $data)) {
            $data['answer_en'] = $sanitizer->sanitizeIfHtml($data['answer_en']);
        }
        if (array_key_exists('answer_ar', $data)) {
            $data['answer_ar'] = $sanitizer->sanitizeIfHtml($data['answer_ar']);
        }
        if (array_key_exists('highlight_en', $data)) {
            $data['highlight_en'] = $sanitizer->sanitizeIfHtml($data['highlight_en']);
        }
        if (array_key_exists('highlight_ar', $data)) {
            $data['highlight_ar'] = $sanitizer->sanitizeIfHtml($data['highlight_ar']);
        }

        $faq->update(array_filter($data, fn ($v) => $v !== null));

        return $faq->fresh();
    }
}
