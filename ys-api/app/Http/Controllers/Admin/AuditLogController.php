<?php

namespace App\Http\Controllers\Admin;

use App\Domains\System\Models\AuditLog;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class AuditLogController extends Controller
{
    /**
     * GET /api/v1/admin/audit-logs
     *
     * F-003 (Phase 5A): scoped to the caller's product access — product
     * rows of other tenants are invisible, global/system rows stay
     * visible, super admins see everything. All filters compose with the
     * scope, so query manipulation cannot widen it.
     */
    public function index(Request $request): JsonResponse
    {
        $this->authorize('view_audit_logs');

        $logs = AuditLog::accessibleBy(Auth::user())
            ->with('user:id,name,email')
            ->when($request->query('action'), fn ($q, $a) => $q->where('action', 'like', "%{$a}%"))
            ->when($request->query('resource_type'), fn ($q, $r) => $q->where('resource_type', $r))
            ->when($request->query('user_id'), fn ($q, $u) => $q->where('user_id', $u))
            ->when($request->query('from'), fn ($q, $from) => $q->where('created_at', '>=', $from))
            ->when($request->query('to'), fn ($q, $to) => $q->where('created_at', '<=', $to))
            ->orderByDesc('created_at')
            ->paginate($this->perPage($request, 25));

        return response()->json([
            'success' => true,
            'data' => $logs->items(),
            'meta' => [
                'current_page' => $logs->currentPage(),
                'last_page' => $logs->lastPage(),
                'per_page' => $logs->perPage(),
                'total' => $logs->total(),
            ],
        ]);
    }
}
