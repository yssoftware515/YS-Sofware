<?php

namespace App\Domains\Product\Observers;

use App\Domains\Product\Models\Product;
use App\Domains\Product\Models\ProductRelease;
use App\Domains\System\Services\AuditService;

class ProductReleaseObserver
{
    public function __construct(
        private readonly AuditService $auditService,
    ) {}

    /**
     * After a release is created or published, sync current_version on the product.
     */
    public function created(ProductRelease $release): void
    {
        $this->syncCurrentVersion($release);
        $this->auditService->logModelChange('product_release.created', $release);
    }

    public function updated(ProductRelease $release): void
    {
        // Only sync if is_published changed to true
        if ($release->wasChanged('is_published') && $release->is_published) {
            $this->syncCurrentVersion($release);
        }
        $this->auditService->logModelChange('product_release.updated', $release);
    }

    public function deleted(ProductRelease $release): void
    {
        // Re-calculate current version from remaining published releases
        $this->recalculateCurrentVersion($release->product_id);
        $this->auditService->logModelChange('product_release.deleted', $release);
    }

    private function syncCurrentVersion(ProductRelease $release): void
    {
        if (! $release->is_published) {
            return;
        }

        $latest = ProductRelease::where('product_id', $release->product_id)
            ->where('is_published', true)
            ->orderByDesc('release_date')
            ->value('version');

        if ($latest) {
            $release->product()->update(['current_version' => $latest]);
        }
    }

    private function recalculateCurrentVersion(string $productId): void
    {
        $latest = ProductRelease::where('product_id', $productId)
            ->where('is_published', true)
            ->orderByDesc('release_date')
            ->value('version');

        Product::where('id', $productId)
            ->update(['current_version' => $latest]);
    }
}
