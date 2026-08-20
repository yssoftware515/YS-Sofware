<?php

namespace App\Domains\Content\Actions;

use App\Domains\Content\Models\DocumentationArticle;
use App\Domains\System\Services\HtmlSanitizerService;

class UpdateDocumentationArticleAction
{
    public function __construct(
        private readonly HtmlSanitizerService $sanitizer,
    ) {}

    public function execute(DocumentationArticle $article, array $data): DocumentationArticle
    {
        if (isset($data['content_en'])) {
            $data['content_en'] = $this->sanitizer->sanitize($data['content_en']);
            $wordCount = str_word_count(strip_tags($data['content_en']));
            $data['reading_time_minutes'] = max(1, (int) ceil($wordCount / 200));
        }

        if (isset($data['content_ar'])) {
            $data['content_ar'] = $this->sanitizer->sanitize($data['content_ar']);
        }

        $article->update(array_filter($data, fn ($v) => $v !== null));

        return $article->fresh();
    }
}
