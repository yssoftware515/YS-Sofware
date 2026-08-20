<?php

namespace App\Http\Controllers\Admin;

use App\Domains\System\Models\FailedJob;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

/**
 * Operator observability for the queue dead-letter table.
 *
 * Read-only list — no retry/delete actions. Deliberately minimal:
 *  - gated behind the existing `view_audit_logs` permission (no new
 *    permission architecture)
 *  - never returns the serialized `payload` (may contain private data)
 *  - returns only the first line of the exception, truncated
 *  - default order is newest failed_at first
 */
class FailedJobController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $this->authorize('view_audit_logs');

        $perPage = min(max($request->integer('per_page', 20), 1), 100);

        $jobs = FailedJob::query()
            ->orderByDesc('failed_at')
            ->orderByDesc('id')
            ->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => $jobs->map(fn (FailedJob $job) => [
                'id' => $job->id,
                'uuid' => $job->uuid,
                'connection' => $job->connection,
                'queue' => $job->queue,
                'failed_at' => $job->failed_at?->toIso8601String(),
                'exception' => $this->exceptionSummary($job->exception),
            ]),
            'meta' => [
                'current_page' => $jobs->currentPage(),
                'last_page' => $jobs->lastPage(),
                'total' => $jobs->total(),
            ],
        ]);
    }

    /**
     * First line of the exception, truncated — enough to triage without
     * leaking full trace internals into the API surface.
     */
    private function exceptionSummary(string $exception): string
    {
        $firstLine = strtok($exception, "\n");

        return Str::limit($firstLine === false ? $exception : $firstLine, 500);
    }
}
