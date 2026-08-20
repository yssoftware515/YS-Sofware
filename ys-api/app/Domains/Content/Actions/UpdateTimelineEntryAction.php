<?php

namespace App\Domains\Content\Actions;

use App\Domains\Content\Models\TimelineEntry;
use App\Domains\System\Services\HtmlSanitizerService;

class UpdateTimelineEntryAction
{
    public function execute(TimelineEntry $entry, array $data): TimelineEntry
    {
        // VULN-04: sanitize descriptions on update too.
        $sanitizer = app(HtmlSanitizerService::class);

        if (array_key_exists('description_en', $data)) {
            $data['description_en'] = $sanitizer->sanitizeIfHtml($data['description_en']);
        }
        if (array_key_exists('description_ar', $data)) {
            $data['description_ar'] = $sanitizer->sanitizeIfHtml($data['description_ar']);
        }

        $entry->update(array_filter($data, fn ($v) => $v !== null));

        return $entry->fresh();
    }
}
