<?php

namespace App\Http\Resources\Admin;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class DocumentationCategoryResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'slug' => $this->slug,
            'title_en' => $this->title_en,
            'title_ar' => $this->title_ar,
            'sort_order' => $this->sort_order,
            // Both product_id and parent_id are nullable per the
            // documentation_categories migration (a category can be
            // product-agnostic, and top-level categories have no parent)
            // — null-checked accordingly.
            'product' => $this->whenLoaded('product', fn () => $this->product ? [
                'id' => $this->product->id,
                'name_en' => $this->product->name_en,
            ] : null),
            'parent' => $this->whenLoaded('parent', fn () => $this->parent ? [
                'id' => $this->parent->id,
                'title_en' => $this->parent->title_en,
            ] : null),
        ];
    }
}
