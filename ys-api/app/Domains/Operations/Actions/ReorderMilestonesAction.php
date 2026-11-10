<?php

namespace App\Domains\Operations\Actions;

use App\Domains\Operations\Models\Milestone;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;
use RuntimeException;

/**
 * Up/down reorder within the same project.
 *
 * The whole list of that project is re-stamped with sequential ranks
 * inside a single transaction — either every sort_order change commits
 * or none do (Phase 4A, P2-05).
 */
class ReorderMilestonesAction
{
    public function execute(Milestone $milestone, string $direction): void
    {
        if (! in_array($direction, ['up', 'down'], true)) {
            throw new InvalidArgumentException("Invalid direction '{$direction}'.");
        }

        $user = Auth::user();

        if ($user === null) {
            throw new RuntimeException('Reordering milestones requires an authenticated actor.');
        }

        DB::transaction(function () use ($milestone, $direction) {
            $order = Milestone::where('project_id', $milestone->project_id)
                ->orderBy('sort_order')
                ->orderBy('target_date')
                ->orderBy('created_at')
                ->pluck('id')
                ->all();

            $currentIndex = array_search($milestone->id, $order, true);

            if ($currentIndex === false) {
                return;
            }

            $targetIndex = $direction === 'up'
                ? max(0, $currentIndex - 1)
                : min(count($order) - 1, $currentIndex + 1);

            if ($targetIndex === $currentIndex) {
                return;
            }

            [$order[$currentIndex], $order[$targetIndex]] = [$order[$targetIndex], $order[$currentIndex]];

            foreach ($order as $rank => $id) {
                Milestone::whereKey($id)->update(['sort_order' => $rank + 1]);
            }
        });
    }
}
