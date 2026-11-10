<?php

namespace App\Domains\System\Services;

use App\Domains\System\Models\AuditLog;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Request;

/**
 * AuditService — centralized audit logging.
 *
 * IMPORTANT for async jobs:
 * Auth::id() returns null inside queue workers because there is no
 * HTTP session. Always pass $userId explicitly when logging from a Job:
 *
 *   $auditService->log('event', 'Model', $id, userId: $this->userId);
 */
class AuditService
{
    public function log(
        string $action,
        string $resourceType = '',
        ?string $resourceId = null,
        ?string $userId = null,   // explicit — required in async contexts
        ?array $oldValues = null,
        ?array $newValues = null,
        array $context = [],
    ): void {
        AuditLog::create([
            'user_id' => $userId ?? Auth::id(), // fallback for sync HTTP context
            'action' => $action,
            'resource_type' => $resourceType,
            'resource_id' => $resourceId,
            'old_values' => $oldValues,
            'new_values' => $newValues,
            'ip_address' => $this->resolveIp(),
            'user_agent' => $this->resolveUserAgent(),
            'context' => $context ?: null,
        ]);
    }

    /**
     * Convenience method for Eloquent Observer usage.
     */
    public function logModelChange(
        string $action,
        object $model,
        ?array $oldValues = null,
        ?string $userId = null,
    ): void {
        $this->log(
            action: $action,
            resourceType: class_basename($model),
            resourceId: $model->getKey(),
            userId: $userId,
            oldValues: $oldValues,
            newValues: $model->getDirty() ?: null,
        );
    }

    private function resolveIp(): ?string
    {
        try {
            return Request::ip();
        } catch (\Throwable) {
            return null; // no HTTP context (CLI / queue worker)
        }
    }

    private function resolveUserAgent(): ?string
    {
        try {
            return Request::userAgent();
        } catch (\Throwable) {
            return null;
        }
    }
}
