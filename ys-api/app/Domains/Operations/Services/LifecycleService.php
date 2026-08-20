<?php

namespace App\Domains\Operations\Services;

/**
 * LifecycleService — the SINGLE source of truth for the team lifecycle
 * reconciliation rule used by projects, tasks and milestones:
 *
 *   - moving a record INTO "completed" stamps completed_at = now();
 *   - moving it OUT OF "completed" clears the stale timestamp;
 *   - any other change leaves completed_at untouched.
 *
 * Controllers never implement this rule themselves — they feed the
 * validated attributes and the current status in, and the service
 * produces the final attribute set. One rule, four call sites.
 */
final class LifecycleService
{
    public static function reconcileCompletion(
        array &$attributes,
        string $currentStatus = '',
        string $completedStatus = 'completed',
        string $completedAtColumn = 'completed_at',
    ): void {
        if (! array_key_exists('status', $attributes)) {
            return;
        }

        if ($attributes['status'] === $completedStatus) {
            $attributes[$completedAtColumn] = now();
        } elseif ($currentStatus === $completedStatus) {
            $attributes[$completedAtColumn] = null;
        }
    }
}
