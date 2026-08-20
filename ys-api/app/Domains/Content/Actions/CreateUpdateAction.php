<?php

namespace App\Domains\Content\Actions;

use App\Domains\Content\Models\Update;
use App\Domains\System\Services\HtmlSanitizerService;
use Illuminate\Support\Facades\Auth;

class CreateUpdateAction
{
    public function execute(array $data): Update
    {
        // VULN-04: update content is rendered (and may be rendered as HTML
        // by future consumers) — neutralize markup at the write boundary.
        $sanitizer = app(HtmlSanitizerService::class);

        return Update::create([
            'product_id' => $data['product_id'] ?? null,
            'title_en' => $data['title_en'],
            'title_ar' => $data['title_ar'],
            'content_en' => $sanitizer->sanitizeIfHtml($data['content_en']),
            'content_ar' => $sanitizer->sanitizeIfHtml($data['content_ar']),
            'type' => $data['type'] ?? 'announcement',
            'is_featured' => (bool) ($data['is_featured'] ?? false),
            'published_at' => isset($data['published_at']) ? $data['published_at'] : null,
            'author_id' => Auth::id(),
        ]);
    }
}
