<?php

namespace App\Domains\Content\Actions;

use App\Domains\Content\Models\RoadmapItem;
use App\Domains\System\Services\HtmlSanitizerService;

class UpdateRoadmapItemAction
{
    public function execute(RoadmapItem $item, array $data): RoadmapItem
    {
        // VULN-04: sanitize descriptions on update too.
        $sanitizer = app(HtmlSanitizerService::class);

        if (array_key_exists('description_en', $data)) {
            $data['description_en'] = $sanitizer->sanitizeIfHtml($data['description_en']);
        }
        if (array_key_exists('description_ar', $data)) {
            $data['description_ar'] = $sanitizer->sanitizeIfHtml($data['description_ar']);
        }

        $item->update(array_filter($data, fn ($v) => $v !== null));

        return $item->fresh();
    }
}
