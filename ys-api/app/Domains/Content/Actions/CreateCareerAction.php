<?php

namespace App\Domains\Content\Actions;

use App\Domains\Content\Models\Career;
use App\Domains\System\Services\HtmlSanitizerService;
use Illuminate\Support\Facades\Auth;

class CreateCareerAction
{
    public function execute(array $data): Career
    {
        // VULN-04: description/requirements/responsibilities may contain
        // markup — sanitize every string at the write boundary.
        $sanitizer = app(HtmlSanitizerService::class);

        return Career::create([
            'title_en' => $data['title_en'],
            'title_ar' => $data['title_ar'],
            'department' => $data['department'],
            'location' => $data['location'] ?? 'Remote',
            'type' => $data['type'] ?? 'full_time',
            'description_en' => $sanitizer->sanitizeIfHtml($data['description_en'] ?? null),
            'description_ar' => $sanitizer->sanitizeIfHtml($data['description_ar'] ?? null),
            'requirements' => $sanitizer->sanitizeNestedHtml($data['requirements'] ?? []),
            'responsibilities' => $sanitizer->sanitizeNestedHtml($data['responsibilities'] ?? []),
            'status' => $data['status'] ?? 'draft',
            'is_featured' => (bool) ($data['is_featured'] ?? false),
            'sort_order' => $data['sort_order'] ?? 0,
            'created_by' => Auth::id(),
        ]);
    }
}
