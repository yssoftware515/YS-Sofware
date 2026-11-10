<?php

use App\Domains\System\Services\HealthCheckService;
use App\Http\Controllers\Admin\AuditLogController;
use App\Http\Controllers\Admin\ContactRequestController;
use App\Http\Controllers\Admin\CustomerController;
use App\Http\Controllers\Admin\DashboardController;
use App\Http\Controllers\Admin\FailedJobController;
use App\Http\Controllers\Admin\MilestoneController;
use App\Http\Controllers\Admin\ProjectController;
use App\Http\Controllers\Admin\RoleController;
use App\Http\Controllers\Admin\ServiceController;
use App\Http\Controllers\Admin\SettingController;
use App\Http\Controllers\Admin\TaskController;
use App\Http\Controllers\Admin\UserController;
use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\Public\ContactController;
use App\Http\Controllers\Public\SearchController;
use App\Http\Controllers\Public\ServiceController as PublicServiceController;
use App\Http\Controllers\Public\SettingController as PublicSettingController;
use Illuminate\Support\Facades\Route;
use Laravel\Sanctum\Http\Middleware\EnsureFrontendRequestsAreStateful;

// ── Health Check ───────────────────────────────────────────────────────────
// Single source of truth for the health block: HealthCheckService (the
// admin dashboard consumes the same service — see DashboardService).
Route::get('/health', function (HealthCheckService $health) {
    $result = $health->checks();
    $allOk = $result['status'] === 'ok';

    // Note: no application version/build fingerprint is exposed here —
    // that would hand unauthenticated callers a target list for
    // version-specific exploits. The shape (status + checks) is the
    // deployment contract (see tests/Feature/Public/HealthContractTest).
    return response()->json(['success' => $allOk, 'data' => $result], $allOk ? 200 : 503);
})->name('health');

// ══════════════════════════════════════════════════════════════════════
// AUTH
// ══════════════════════════════════════════════════════════════════════
Route::prefix('auth')->name('auth.')->group(function () {
    Route::post('login', [AuthController::class, 'login'])->middleware('throttle:auth')->name('login');

    // VULN-13: password reset flow — forgot is sprayed-protected at the
    // edge (per-IP throttle:forgot) AND per-email (3/hour, in the action);
    // CSRF-02: reset now has a route-layer throttle (5/min per IP) to
    // prevent volumetric DoS and timing side-channel analysis.
    Route::post('forgot-password', [AuthController::class, 'forgotPassword'])
        ->middleware('throttle:forgot')
        ->name('forgot-password');
    Route::post('reset-password', [AuthController::class, 'resetPassword'])
        ->middleware('throttle:reset')
        ->name('reset-password');

    Route::middleware(['auth:sanctum', 'active', 'idle'])->group(function () {
        Route::post('logout', [AuthController::class, 'logout'])->name('logout');
        Route::get('me', [AuthController::class, 'me'])->name('me');
        Route::post('change-password', [AuthController::class, 'changePassword'])->name('change-password');
    });
});

// ══════════════════════════════════════════════════════════════════════
// PUBLIC API — stateless, unauthenticated
//
// These routes live OUTSIDE the Sanctum stateful pipeline. They run
// only the global middleware stack (SecurityHeaders, ForceJsonResponse,
// ResolveLocale, RequireTlsInProduction) plus explicit throttle
// layers — no session, no CSRF, no cookie encryption, no auth.
//
// WHY: The `api` middleware group (applied by bootstrap/app.php via
// withRouting(api:)) injects EnsureFrontendRequestsAreStateful when
// statefulApi() is enabled. That middleware wraps requests in a
// session + CSRF pipeline. The XSRF-TOKEN cookie has SameSite=Lax
// (config/session.php), so the browser never attaches it on
// cross-origin fetch() POSTs — causing a guaranteed 403 on every
// unauthenticated POST from the Vercel frontend.
//
// Instead of fighting this with per-route withoutMiddleware()
// exclusions (which are fragile and non-obvious), public routes
// use a standalone `api` group that bypasses statefulApi() entirely.
// ══════════════════════════════════════════════════════════════════════
Route::prefix('public')->name('public.')->middleware('throttle:public')
    ->withoutMiddleware(EnsureFrontendRequestsAreStateful::class)
    ->group(function () {

        Route::get('settings', [PublicSettingController::class, 'index'])->name('settings');
        Route::get('services', [PublicServiceController::class, 'index'])->name('services.index');
        Route::get('services/{slug}', [PublicServiceController::class, 'show'])->name('services.show');

        // Global Search — separate rate limit
        Route::get('search', SearchController::class)
            ->withoutMiddleware('throttle:public')
            ->middleware('throttle:search')
            ->name('search');

        // Contact — strictest rate limit, POST-only, stateless.
        Route::post('contact', [ContactController::class, 'store'])
            ->withoutMiddleware('throttle:public')
            ->middleware('throttle:contact')
            ->name('contact.store');
    });

// ══════════════════════════════════════════════════════════════════════
// ADMIN API
// ══════════════════════════════════════════════════════════════════════
Route::prefix('admin')->name('admin.')->middleware(['auth:sanctum', 'active', 'idle', 'throttle:admin'])->group(function () {

    // Dashboard
    Route::get('dashboard/stats', [DashboardController::class, 'stats'])->name('dashboard.stats');

    // Services
    Route::apiResource('services', ServiceController::class);

    // Contact Requests
    Route::get('contact-requests', [ContactRequestController::class, 'index'])->name('contact.index');
    Route::get('contact-requests/{contactRequest}', [ContactRequestController::class, 'show'])->name('contact.show');
    Route::patch('contact-requests/{contactRequest}/status', [ContactRequestController::class, 'updateStatus'])->name('contact.status');
    Route::post('contact-requests/{contactRequest}/link-customer', [ContactRequestController::class, 'linkCustomer'])->name('contact.link-customer');
    Route::post('contact-requests/{contactRequest}/convert-customer', [ContactRequestController::class, 'convertCustomer'])->name('contact.convert-customer');
    Route::delete('contact-requests/{contactRequest}/customer', [ContactRequestController::class, 'unlinkCustomer'])->name('contact.unlink-customer');
    Route::post('contact-requests/{contactRequest}/link-project', [ContactRequestController::class, 'linkProject'])->name('contact.link-project');
    Route::delete('contact-requests/{contactRequest}/project/{project}', [ContactRequestController::class, 'unlinkProject'])->name('contact.unlink-project');

    // Users
    Route::apiResource('users', UserController::class);
    Route::apiResource('roles', RoleController::class);

    // Business operations — customers & projects
    Route::apiResource('customers', CustomerController::class);
    Route::patch('customers/{customer}/status', [CustomerController::class, 'updateStatus'])->name('customers.status');
    Route::apiResource('projects', ProjectController::class);
    Route::patch('projects/{project}/status', [ProjectController::class, 'updateStatus'])->name('projects.status');

    // Engagement delivery — tasks & milestones (inside the project boundary)
    Route::apiResource('tasks', TaskController::class);
    Route::patch('tasks/{task}/status', [TaskController::class, 'updateStatus'])->name('tasks.status');
    Route::apiResource('milestones', MilestoneController::class);
    Route::patch('milestones/{milestone}/status', [MilestoneController::class, 'updateStatus'])->name('milestones.status');
    Route::post('milestones/{milestone}/move', [MilestoneController::class, 'move'])->name('milestones.move');

    // Settings
    Route::get('settings', [SettingController::class, 'index'])->name('settings.index');
    Route::get('settings/{setting}', [SettingController::class, 'show'])->name('settings.show');
    Route::put('settings/{setting}', [SettingController::class, 'update'])->name('settings.update');

    // Audit Logs
    Route::get('audit-logs', [AuditLogController::class, 'index'])->name('audit-logs.index');

    // Ops — failed queue jobs (read-only observability, no retry/delete)
    Route::get('ops/failed-jobs', [FailedJobController::class, 'index'])->name('ops.failed-jobs.index');
});
