<?php

namespace App\Domains\Content\Actions;

use App\Domains\Content\Models\DocumentationArticle;
use App\Domains\System\Services\HtmlSanitizerService;
use Illuminate\Support\Facades\Auth;

class CreateDocumentationArticleAction
{
    public function __construct(
        private readonly HtmlSanitizerService $sanitizer,
    ) {}

    public function execute(array $data): DocumentationArticle
    {
        // Sanitize first — reading time is then computed from the CLEANED
        // content, not the raw input. Computing it from raw content would
        // still be numerically correct today, but it's one less thing to
        // reason about if the sanitizer ever changes what it strips.
        $content = $this->sanitizer->sanitize($data['content_en'] ?? '') ?? '';
        $contentAr = $this->sanitizer->sanitize($data['content_ar'] ?? '') ?? '';

        return DocumentationArticle::create([
            'category_id' => $data['category_id'],
            'slug' => $data['slug'],
            'title_en' => $data['title_en'],
            'title_ar' => $data['title_ar'],
            'content_en' => $content,
            'content_ar' => $contentAr,
            'version_tag' => $data['version_tag'] ?? null,
            'reading_time_minutes' => $this->estimateReadingTime($content),
            'is_published' => (bool) ($data['is_published'] ?? false),
            'sort_order' => $data['sort_order'] ?? 0,
            'author_id' => Auth::id(),
        ]);
    }

    /**
     * Public for testability — estimates reading time from word count.
     * ~200 words per minute average reading speed.
     */
    public function estimateReadingTime(string $content): int
    {
        $wordCount = str_word_count(strip_tags($content));

        return max(1, (int) ceil($wordCount / 200));
    }
}
