<?php

namespace App\Domains\Content\Actions;

use App\Domains\Content\Models\DocumentationCategory;

class CreateDocumentationCategoryAction
{
    public function execute(array $data): DocumentationCategory
    {
        return DocumentationCategory::create([
            'product_id' => $data['product_id'] ?? null,
            'parent_id' => $data['parent_id'] ?? null,
            'slug' => $data['slug'],
            'title_en' => $data['title_en'],
            'title_ar' => $data['title_ar'],
            'sort_order' => $data['sort_order'] ?? 0,
        ]);
    }
}
