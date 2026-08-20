<?php

namespace App\Domains\Cms\Actions;

use App\Domains\Cms\Models\HomepageSection;
use App\Domains\System\Services\HtmlSanitizerService;

class CreateHomepageSectionAction
{
    public function execute(array $data): HomepageSection
    {
        // VULN-04: section content is a JSON structure that may contain
        // HTML-bearing string values — sanitize them at the write
        // boundary; plain-text values pass through unchanged.
        $sanitizer = app(HtmlSanitizerService::class);

        return HomepageSection::create([
            'type' => $data['type'],
            'title_en' => $data['title_en'] ?? null,
            'title_ar' => $data['title_ar'] ?? null,
            'subtitle_en' => $data['subtitle_en'] ?? null,
            'subtitle_ar' => $data['subtitle_ar'] ?? null,
            'content' => $sanitizer->sanitizeNestedHtml($data['content'] ?? null),
            'is_enabled' => (bool) ($data['is_enabled'] ?? true),
            'sort_order' => $data['sort_order'] ?? 0,
        ]);
    }
}
