<?php

namespace App\Domains\Cms\Actions;

use App\Domains\Cms\Models\StaticPage;
use App\Domains\System\Services\HtmlSanitizerService;
use Illuminate\Support\Facades\Auth;

class CreateStaticPageAction
{
    public function execute(array $data): StaticPage
    {
        // VULN-04: content_en/ar hold JSON-encoded sections — sanitize the
        // HTML-looking string values inside the JSON before storage.
        $sanitizer = app(HtmlSanitizerService::class);

        return StaticPage::create([
            'slug' => $data['slug'],
            'title_en' => $data['title_en'],
            'title_ar' => $data['title_ar'],
            'excerpt_en' => $data['excerpt_en'] ?? null,
            'excerpt_ar' => $data['excerpt_ar'] ?? null,
            'content_en' => $sanitizer->sanitizeJsonContent($data['content_en'] ?? null),
            'content_ar' => $sanitizer->sanitizeJsonContent($data['content_ar'] ?? null),
            'seo_title_en' => $data['seo_title_en'] ?? null,
            'seo_title_ar' => $data['seo_title_ar'] ?? null,
            'seo_description_en' => $data['seo_description_en'] ?? null,
            'seo_description_ar' => $data['seo_description_ar'] ?? null,
            'cover_media_id' => $data['cover_media_id'] ?? null,
            'status' => $data['status'] ?? 'draft',
            'published_at' => $data['published_at'] ?? null,
            'sort_order' => $data['sort_order'] ?? 0,
            'created_by' => Auth::id(),
        ]);
    }
}
