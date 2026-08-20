<?php

namespace App\Http\Resources\Admin;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class SubscriptionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'plan_name' => $this->plan_name,
            'price' => $this->price,
            'currency' => $this->currency,
            'billing_cycle' => $this->billing_cycle,
            'monthly_equivalent' => $this->monthlyEquivalent(),
            'starts_at' => $this->starts_at->toDateString(),
            'ends_at' => $this->ends_at->toDateString(),
            'status' => $this->status,
            'is_manual_entry' => $this->is_manual_entry,
            'customer' => $this->whenLoaded('customer', fn () => [
                'id' => $this->customer->id,
                'name' => $this->customer->name,
                'email' => $this->customer->email,
            ]),
            // product_id is required (cascadeOnDelete/restrictOnDelete —
            // not nullable) — safe to access directly once loaded.
            'product' => $this->whenLoaded('product', fn () => [
                'id' => $this->product->id,
                'name_en' => $this->product->name_en,
                'slug' => $this->product->slug,
            ]),
            'creator' => $this->whenLoaded('creator', fn () => $this->creator ? [
                'id' => $this->creator->id,
                'name' => $this->creator->name,
            ] : null),
            'created_at' => $this->created_at->toIso8601String(),
        ];
    }
}
