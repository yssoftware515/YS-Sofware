<?php

namespace App\Http\Resources\Auth;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UserResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'is_active' => $this->is_active,
            'last_login_at' => $this->last_login_at?->toIso8601String(),
            'role' => $this->whenLoaded('role', fn () => [
                'id' => $this->role->id,
                'name' => $this->role->name,
                'slug' => $this->role->slug,
                'permissions' => $this->role->permissions,
            ]),
            // Only meaningful for non-super-admins (a super admin bypasses
            // scoping entirely — see User::canAccessProduct). Included
            // whenever the 'products' relation was eager-loaded.
            'product_ids' => $this->whenLoaded('products', fn () => $this->products->pluck('id')),
            'created_at' => $this->created_at->toIso8601String(),
        ];
        // Note: password, password_changed_at, remember_token
        // are in $hidden on the model — never reach this point.
    }
}
