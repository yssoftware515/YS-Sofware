<?php

namespace App\Http\Resources\Public;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class HomepageSectionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $locale = app()->getLocale();

        return [
            'id' => $this->id,
            'type' => $this->type,
            'title' => $locale === 'ar' ? $this->title_ar : $this->title_en,
            'subtitle' => $locale === 'ar' ? $this->subtitle_ar : $this->subtitle_en,
            'content' => $this->content,
            'sort_order' => $this->sort_order,
        ];
    }
}
