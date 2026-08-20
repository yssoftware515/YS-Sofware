<?php

namespace App\Domains\Product\Policies;

use App\Domains\Auth\Models\User;
use App\Domains\Product\Models\Product;

class ProductPolicy
{
    /**
     * Called by $this->authorize('manage_products') in controllers.
     * Maps to the 'manage_products' permission string in roles.permissions.
     */
    public function manage_products(User $user): bool
    {
        return $user->hasPermission('manage_products');
    }

    public function viewAny(User $user): bool
    {
        return $user->hasAnyPermission(['manage_products', 'view_products']);
    }

    public function view(User $user, Product $product): bool
    {
        return $user->hasAnyPermission(['manage_products', 'view_products']);
    }

    public function create(User $user): bool
    {
        return $user->hasPermission('manage_products');
    }

    public function update(User $user, Product $product): bool
    {
        return $user->hasPermission('manage_products');
    }

    public function delete(User $user, Product $product): bool
    {
        return $user->hasPermission('manage_products');
    }
}
