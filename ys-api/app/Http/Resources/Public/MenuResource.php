<?php

namespace App\Http\Resources\Public;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class MenuResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $locale = app()->getLocale();
        $items = $this->whenLoaded('rootItems', fn () => $this->rootItems);

        return [
            'id' => $this->id,
            'location' => $this->location,
            'items' => $items
                ? MenuItemResource::collection($items->where('is_active', true)->values())
                : [],
        ];
    }
}
