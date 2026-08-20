<?php

namespace App\Http\Resources\Public;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class StaticPageResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $locale = app()->getLocale();

        return [
            'id' => $this->id,
            'slug' => $this->slug,
            'title' => $locale === 'ar' ? $this->title_ar : $this->title_en,
            'excerpt' => $locale === 'ar' ? $this->excerpt_ar : $this->excerpt_en,
            'content' => $locale === 'ar' ? $this->content_ar : $this->content_en,
            'published_at' => $this->published_at?->toIso8601String(),
            'cover_image' => $this->whenLoaded('cover', fn () => $this->cover ? [
                'url' => $this->cover->url,
                'alt' => $locale === 'ar' ? $this->cover->alt_text_ar : $this->cover->alt_text_en,
            ] : null),
        ];
    }
}
