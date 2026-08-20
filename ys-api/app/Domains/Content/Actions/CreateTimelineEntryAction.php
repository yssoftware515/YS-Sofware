<?php

namespace App\Domains\Content\Actions;

use App\Domains\Content\Models\TimelineEntry;
use App\Domains\System\Services\HtmlSanitizerService;

class CreateTimelineEntryAction
{
    public function execute(array $data): TimelineEntry
    {
        // VULN-04: descriptions may contain markup — sanitize on write.
        $sanitizer = app(HtmlSanitizerService::class);

        return TimelineEntry::create([
            'title_en' => $data['title_en'],
            'title_ar' => $data['title_ar'],
            'description_en' => $sanitizer->sanitizeIfHtml($data['description_en'] ?? null),
            'description_ar' => $sanitizer->sanitizeIfHtml($data['description_ar'] ?? null),
            'event_date' => $data['event_date'],
            'type' => $data['type'] ?? 'milestone',
            'product_id' => $data['product_id'] ?? null,
            'is_public' => (bool) ($data['is_public'] ?? true),
            'sort_order' => $data['sort_order'] ?? 0,
        ]);
    }
}
