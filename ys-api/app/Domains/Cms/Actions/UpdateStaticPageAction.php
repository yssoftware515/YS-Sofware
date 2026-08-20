<?php

namespace App\Domains\Cms\Actions;

use App\Domains\Cms\Models\StaticPage;
use App\Domains\System\Services\HtmlSanitizerService;

class UpdateStaticPageAction
{
    public function execute(StaticPage $page, array $data): StaticPage
    {
        // VULN-04: same JSON-aware sanitization as CreateStaticPageAction.
        $sanitizer = app(HtmlSanitizerService::class);

        if (array_key_exists('content_en', $data)) {
            $data['content_en'] = $sanitizer->sanitizeJsonContent($data['content_en']);
        }
        if (array_key_exists('content_ar', $data)) {
            $data['content_ar'] = $sanitizer->sanitizeJsonContent($data['content_ar']);
        }

        $page->update(array_filter($data, fn ($v) => $v !== null));

        return $page->fresh();
    }
}
