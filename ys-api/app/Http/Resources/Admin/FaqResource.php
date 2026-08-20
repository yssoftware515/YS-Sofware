<?php

namespace App\Http\Resources\Admin;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Admin FAQ contract — the explicit, stable response shape for the
 * admin FAQ endpoints. The admin surface is bilingual by field
 * (question_en/question_ar/...) because the admin edits both locales;
 * the PUBLIC FAQ contract (localized question/answer) is deliberately
 * separate (see Public\FaqResource).
 */
class FaqResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'question_en' => $this->question_en,
            'question_ar' => $this->question_ar,
            'answer_en' => $this->answer_en,
            'answer_ar' => $this->answer_ar,
            'highlight_en' => $this->highlight_en,
            'highlight_ar' => $this->highlight_ar,
            'category' => $this->category,
            'status' => $this->status,
            'sort_order' => $this->sort_order,
            'creator' => $this->whenLoaded('creator', fn () => $this->creator ? [
                'id' => $this->creator->id,
                'name' => $this->creator->name,
            ] : null),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
            'deleted_at' => $this->deleted_at?->toIso8601String(),
        ];
    }
}