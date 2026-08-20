<?php

namespace App\Http\Controllers\Admin;

use App\Domains\System\Services\DashboardService;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;

/**
 * Dashboard — thin HTTP entry point. All metric computation lives in
 * DashboardService (System domain): permission-filtered counts, attention
 * flags, health block and recent-item lists. The response envelope is
 * stable: { success, data: { counts, attention, health, ...recent } }.
 */
class DashboardController extends Controller
{
    public function __construct(
        private readonly DashboardService $dashboard,
    ) {}

    public function stats(): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => $this->dashboard->stats(auth()->user()),
        ]);
    }
}
