<?php

namespace App\Domains\Content\Actions;

use App\Domains\Content\Models\DocumentationCategory;
use Illuminate\Support\Facades\Auth;
use RuntimeException;

/**
 * Update a documentation category.
 *
 * Tenant-scoping invariant (Phase 4A, INT-009): a category may only be
 * (re)assigned to a product the acting admin can access. This rule lives
 * HERE — the domain layer — so no future job/CLI entry point can bypass
 * it by calling the action directly. The HTTP controller additionally
 * validates shape (uuid, exists) and its own access checks for UX.
 */
class UpdateDocumentationCategoryAction
{
    public function execute(DocumentationCategory $category, array $data): DocumentationCategory
    {
        if (array_key_exists('product_id', $data)) {
            $this->assertProductInScope($data['product_id']);
        }

        $updates = array_filter($data, fn ($v) => $v !== null);

        // array_filter drops nulls — but product_id is a legit null
        // (company-wide "General" docs), so re-apply it explicitly.
        if (array_key_exists('product_id', $data)) {
            $updates['product_id'] = $data['product_id'];
        }

        $category->update($updates);

        return $category->fresh();
    }

    private function assertProductInScope(?string $productId): void
    {
        $user = Auth::user();

        if ($user === null) {
            throw new RuntimeException('Assigning a documentation category to a product requires an authenticated actor.');
        }

        if ($productId !== null && ! $user->canAccessProduct($productId)) {
            abort(403, 'You do not have access to this product.');
        }
    }
}
