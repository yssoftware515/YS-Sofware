<?php

namespace App\Domains\Services\Observers;

use App\Domains\Services\Models\Service;
use App\Domains\System\Services\AuditService;

/**
 * ServiceObserver — audit every service mutation, mirroring ProductObserver.
 */
class ServiceObserver
{
    public function __construct(
        private readonly AuditService $auditService,
    ) {}

    public function created(Service $service): void
    {
        $this->auditService->logModelChange('service.created', $service);
    }

    public function updated(Service $service): void
    {
        $this->auditService->logModelChange(
            action: 'service.updated',
            model: $service,
            oldValues: $service->getOriginal(),
        );
    }

    public function deleted(Service $service): void
    {
        $this->auditService->logModelChange('service.deleted', $service);
    }

    public function restored(Service $service): void
    {
        $this->auditService->logModelChange('service.restored', $service);
    }
}
