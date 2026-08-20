<?php

namespace App\Domains\System\Services;

use App\Domains\Billing\Models\Customer;
use App\Domains\Billing\Models\Subscription;
use App\Domains\Content\Models\DocumentationArticle;
use App\Domains\Content\Models\DocumentationCategory;
use App\Domains\Content\Models\RoadmapItem;
use App\Domains\Content\Models\TimelineEntry;
use App\Domains\Content\Models\Update;
use App\Domains\Operations\Models\ContactRequest;
use App\Domains\Operations\Models\Milestone;
use App\Domains\Operations\Models\Project;
use App\Domains\Operations\Models\Task;
use App\Domains\Product\Models\Product;
use App\Domains\Product\Models\ProductRelease;
use App\Domains\System\Models\AuditLog;
use App\Domains\System\Models\FeatureFlag;
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
        ?object $model = null,    // internal — populated by logModelChange
    ): void {
        AuditLog::create([
            'user_id' => $userId ?? Auth::id(), // fallback for sync HTTP context
            'action' => $action,
            'resource_type' => $resourceType,
            'resource_id' => $resourceId,
            'product_id' => $model !== null
                ? $this->resolveProductIdFromModel($model)
                : $this->resolveProductIdFromResource($resourceType, $resourceId),
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
            model: $model,
        );
    }

    // ── F-003: tenant anchor resolution ──────────────────────────────

    /**
     * Resolve the tenant (product) the audited resource belongs to, so
     * audit rows can be scoped per admin product access. NULL = global /
     * system-level event. Resolution is centralized here — call sites
     * stay untouched.
     */
    private function resolveProductIdFromModel(object $model): ?string
    {
        if ($model instanceof Product) {
            return $model->id;
        }

        $direct = $model->getAttribute('product_id');
        if ($direct !== null) {
            return $direct;
        }

        return match (true) {
            $model instanceof DocumentationArticle => $model->category?->product_id,
            $model instanceof ContactRequest => $model->customer?->product_id,
            $model instanceof Project => $model->customer?->product_id,
            $model instanceof Task => $model->project?->customer?->product_id,
            $model instanceof Milestone => $model->project?->customer?->product_id,
            default => null,
        };
    }

    private function resolveProductIdFromResource(string $resourceType, ?string $resourceId): ?string
    {
        if ($resourceId === null) {
            return null;
        }

        return match ($resourceType) {
            'Product' => $resourceId,
            'Customer' => Customer::query()->find($resourceId)?->product_id,
            'Subscription' => Subscription::query()->find($resourceId)?->product_id,
            'ProductRelease' => ProductRelease::query()->find($resourceId)?->product_id,
            'FeatureFlag' => FeatureFlag::query()->find($resourceId)?->product_id,
            'RoadmapItem' => RoadmapItem::query()->find($resourceId)?->product_id,
            'Update' => Update::query()->find($resourceId)?->product_id,
            'TimelineEntry' => TimelineEntry::query()->find($resourceId)?->product_id,
            'DocumentationCategory' => DocumentationCategory::query()->find($resourceId)?->product_id,
            'DocumentationArticle' => DocumentationArticle::query()->find($resourceId)?->category?->product_id,
            'ContactRequest' => ContactRequest::query()->find($resourceId)?->customer?->product_id,
            'Project' => Project::query()->find($resourceId)?->customer?->product_id,
            'Task' => Task::query()->find($resourceId)?->project?->customer?->product_id,
            'Milestone' => Milestone::query()->find($resourceId)?->project?->customer?->product_id,
            default => null,
        };
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
