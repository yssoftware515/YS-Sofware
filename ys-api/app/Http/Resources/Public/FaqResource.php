<?php

namespace App\Http\Resources\Public;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class FaqResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $locale = app()->getLocale();

        return [
            'id' => $this->id,
            'question' => $locale === 'ar' ? $this->question_ar : $this->question_en,
            'answer' => $locale === 'ar' ? $this->answer_ar : $this->answer_en,
            'highlight' => $locale === 'ar' ? $this->highlight_ar : $this->highlight_en,
            'category' => $this->category,
        ];
    }
}
