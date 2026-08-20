<?php

namespace App\Domains\Product\Observers;

use App\Domains\Product\Models\Product;
use App\Domains\System\Services\AuditService;

class ProductObserver
{
    public function __construct(
        private readonly AuditService $auditService,
    ) {}

    public function created(Product $product): void
    {
        $this->auditService->logModelChange('product.created', $product);
    }

    public function updated(Product $product): void
    {
        $this->auditService->logModelChange(
            action: 'product.updated',
            model: $product,
            oldValues: $product->getOriginal(),
        );
    }

    public function deleted(Product $product): void
    {
        $this->auditService->logModelChange('product.deleted', $product);
    }

    public function restored(Product $product): void
    {
        $this->auditService->logModelChange('product.restored', $product);
    }
}
