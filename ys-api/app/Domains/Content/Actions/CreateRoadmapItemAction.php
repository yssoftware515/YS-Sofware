<?php

namespace App\Domains\Content\Actions;

use App\Domains\Content\Models\RoadmapItem;
use App\Domains\System\Services\HtmlSanitizerService;
use Illuminate\Support\Facades\Auth;

class CreateRoadmapItemAction
{
    public function execute(array $data): RoadmapItem
    {
        // VULN-04: descriptions may contain markup — sanitize on write.
        $sanitizer = app(HtmlSanitizerService::class);

        return RoadmapItem::create([
            'product_id' => $data['product_id'] ?? null,
            'title_en' => $data['title_en'],
            'title_ar' => $data['title_ar'],
            'description_en' => $sanitizer->sanitizeIfHtml($data['description_en'] ?? null),
            'description_ar' => $sanitizer->sanitizeIfHtml($data['description_ar'] ?? null),
            'status' => $data['status'] ?? 'planned',
            'priority' => $data['priority'] ?? 'medium',
            'target_version' => $data['target_version'] ?? null,
            'target_quarter' => $data['target_quarter'] ?? null,
            'is_public' => (bool) ($data['is_public'] ?? true),
            'sort_order' => $data['sort_order'] ?? 0,
            'created_by' => Auth::id(),
        ]);
    }
}
