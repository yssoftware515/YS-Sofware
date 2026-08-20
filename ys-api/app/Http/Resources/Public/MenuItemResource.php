<?php

namespace App\Http\Resources\Public;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class MenuItemResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $locale = app()->getLocale();

        return [
            'id' => $this->id,
            'title' => $locale === 'ar' ? $this->title_ar : $this->title_en,
            'url' => $this->url,
            'icon' => $this->icon,
            'target' => $this->target,
            'children' => MenuItemResource::collection(
                $this->whenLoaded('children', fn () => $this->children->where('is_active', true)->values())
            ),
        ];
    }
}
