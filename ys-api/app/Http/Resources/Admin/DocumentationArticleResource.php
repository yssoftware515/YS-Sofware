<?php

namespace App\Http\Resources\Admin;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class DocumentationArticleResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'slug' => $this->slug,
            'title_en' => $this->title_en,
            'title_ar' => $this->title_ar,
            'content_en' => $this->content_en,
            'content_ar' => $this->content_ar,
            'version_tag' => $this->version_tag,
            'reading_time_minutes' => $this->reading_time_minutes,
            'is_published' => $this->is_published,
            'sort_order' => $this->sort_order,
            // category_id is required (cascadeOnDelete, not nullable) —
            // safe to access directly once the relation is loaded.
            'category' => $this->whenLoaded('category', fn () => [
                'id' => $this->category->id,
                'title_en' => $this->category->title_en,
                'slug' => $this->category->slug,
            ]),
            // author_id IS nullable with nullOnDelete — null-checked.
            'author' => $this->whenLoaded('author', fn () => $this->author ? [
                'id' => $this->author->id,
                'name' => $this->author->name,
            ] : null),
            'created_at' => $this->created_at->toIso8601String(),
            'updated_at' => $this->updated_at->toIso8601String(),
        ];
    }
}
