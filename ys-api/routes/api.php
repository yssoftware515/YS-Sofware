<?php

use App\Domains\System\Services\HealthCheckService;
use App\Http\Controllers\Admin\AuditLogController;
use App\Http\Controllers\Admin\CareerController;
use App\Http\Controllers\Admin\ContactRequestController;
use App\Http\Controllers\Admin\CustomerController;
use App\Http\Controllers\Admin\DashboardController;
use App\Http\Controllers\Admin\DocumentationController;
use App\Http\Controllers\Admin\FailedJobController;
use App\Http\Controllers\Admin\FaqController;
use App\Http\Controllers\Admin\FeatureFlagController;
use App\Http\Controllers\Admin\HomepageSectionController;
use App\Http\Controllers\Admin\MediaController;
use App\Http\Controllers\Admin\MenuController;
use App\Http\Controllers\Admin\MilestoneController;
use App\Http\Controllers\Admin\ProductController;
use App\Http\Controllers\Admin\ProjectController;
use App\Http\Controllers\Admin\ReleaseController;
use App\Http\Controllers\Admin\RoadmapController;
use App\Http\Controllers\Admin\RoleController;
use App\Http\Controllers\Admin\ServiceController;
use App\Http\Controllers\Admin\SettingController;
use App\Http\Controllers\Admin\StaticPageController;
use App\Http\Controllers\Admin\SubscriptionController;
use App\Http\Controllers\Admin\TaskController;
use App\Http\Controllers\Admin\TimelineController;
use App\Http\Controllers\Admin\UpdateController;
use App\Http\Controllers\Admin\UserController;
use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\Public\CareerController as PublicCareerController;
use App\Http\Controllers\Public\ContactController;
use App\Http\Controllers\Public\DocumentationController as PublicDocumentationController;
use App\Http\Controllers\Public\FaqController as PublicFaqController;
use App\Http\Controllers\Public\HomepageSectionController as PublicHomepageSectionController;
use App\Http\Controllers\Public\MenuController as PublicMenuController;
use App\Http\Controllers\Public\ProductController as PublicProductController;
use App\Http\Controllers\Public\RoadmapController as PublicRoadmapController;
use App\Http\Controllers\Public\SearchController;
use App\Http\Controllers\Public\ServiceController as PublicServiceController;
use App\Http\Controllers\Public\SettingController as PublicSettingController;
use App\Http\Controllers\Public\StaticPageController as PublicStaticPageController;
use App\Http\Controllers\Public\TimelineController as PublicTimelineController;
use App\Http\Controllers\Public\UpdateController as PublicUpdateController;
use Illuminate\Support\Facades\Route;

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
    // reset carries no route throttle — the 256-bit token is the guard.
    Route::post('forgot-password', [AuthController::class, 'forgotPassword'])
        ->middleware('throttle:forgot')
        ->name('forgot-password');
    Route::post('reset-password', [AuthController::class, 'resetPassword'])->name('reset-password');

    Route::middleware(['auth:sanctum', 'active', 'idle'])->group(function () {
        Route::post('logout', [AuthController::class, 'logout'])->name('logout');
        Route::get('me', [AuthController::class, 'me'])->name('me');
        Route::post('change-password', [AuthController::class, 'changePassword'])->name('change-password');
    });
});

// ══════════════════════════════════════════════════════════════════════
// PUBLIC API
// ══════════════════════════════════════════════════════════════════════
Route::prefix('public')->name('public.')->middleware('throttle:public')->group(function () {

    Route::get('settings', [PublicSettingController::class, 'index'])->name('settings');
    Route::get('products', [PublicProductController::class, 'index'])->name('products.index');
    Route::get('products/{slug}', [PublicProductController::class, 'show'])->name('products.show');
    Route::get('services', [PublicServiceController::class, 'index'])->name('services.index');
    Route::get('services/{slug}', [PublicServiceController::class, 'show'])->name('services.show');
    Route::get('docs', [PublicDocumentationController::class, 'index'])->name('docs.index');
    Route::get('docs/{slug}', [PublicDocumentationController::class, 'show'])->name('docs.show');
    Route::get('roadmap', [PublicRoadmapController::class, 'index'])->name('roadmap.index');
    Route::get('updates', [PublicUpdateController::class, 'index'])->name('updates.index');
    Route::get('careers', [PublicCareerController::class, 'index'])->name('careers.index');
    Route::get('careers/{career}', [PublicCareerController::class, 'show'])->name('careers.show');
    Route::get('timeline', [PublicTimelineController::class, 'index'])->name('timeline.index');

    // CMS
    Route::get('pages/{slug}', [PublicStaticPageController::class, 'show'])->name('pages.show');
    Route::get('pages', [PublicStaticPageController::class, 'index'])->name('pages.index');
    Route::get('faqs', [PublicFaqController::class, 'index'])->name('faqs.index');
    Route::get('menus', [PublicMenuController::class, 'index'])->name('menus.index');
    Route::get('menus/{location}', [PublicMenuController::class, 'show'])->name('menus.show');
    Route::get('homepage-sections', [PublicHomepageSectionController::class, 'index'])->name('homepagesections.index');

    // Global Search — separate rate limit
    Route::get('search', SearchController::class)
        ->withoutMiddleware('throttle:public')
        ->middleware('throttle:search')
        ->name('search');

    // Contact — strictest rate limit
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

    // Products & Releases
    Route::apiResource('products', ProductController::class);
    Route::apiResource('releases', ReleaseController::class);

    // Services
    Route::apiResource('services', ServiceController::class);

    // Documentation
    Route::prefix('docs')->name('docs.')->group(function () {
        Route::get('categories', [DocumentationController::class, 'indexCategories'])->name('categories.index');
        Route::post('categories', [DocumentationController::class, 'storeCategory'])->name('categories.store');
        Route::put('categories/{category}', [DocumentationController::class, 'updateCategory'])->name('categories.update');
        Route::delete('categories/{category}', [DocumentationController::class, 'destroyCategory'])->name('categories.destroy');
        Route::get('articles', [DocumentationController::class, 'indexArticles'])->name('articles.index');
        Route::post('articles', [DocumentationController::class, 'storeArticle'])->name('articles.store');
        Route::get('articles/{article}', [DocumentationController::class, 'showArticle'])->name('articles.show');
        Route::put('articles/{article}', [DocumentationController::class, 'updateArticle'])->name('articles.update');
        Route::delete('articles/{article}', [DocumentationController::class, 'destroyArticle'])->name('articles.destroy');
    });

    // Roadmap
    Route::apiResource('roadmap', RoadmapController::class)->parameters(['roadmap' => 'roadmapItem']);

    // Updates
    Route::apiResource('updates', UpdateController::class);
    Route::post('updates/{update}/publish', [UpdateController::class, 'publish'])->name('updates.publish');
    Route::post('updates/{update}/unpublish', [UpdateController::class, 'unpublish'])->name('updates.unpublish');

    // Careers
    Route::apiResource('careers', CareerController::class);

    // Timeline
    Route::get('timeline', [TimelineController::class, 'index'])->name('timeline.index');
    Route::post('timeline', [TimelineController::class, 'store'])->name('timeline.store');
    Route::put('timeline/{timelineEntry}', [TimelineController::class, 'update'])->name('timeline.update');
    Route::delete('timeline/{timelineEntry}', [TimelineController::class, 'destroy'])->name('timeline.destroy');

    // Contact Requests
    Route::get('contact-requests', [ContactRequestController::class, 'index'])->name('contact.index');
    Route::get('contact-requests/{contactRequest}', [ContactRequestController::class, 'show'])->name('contact.show');
    Route::patch('contact-requests/{contactRequest}/status', [ContactRequestController::class, 'updateStatus'])->name('contact.status');
    Route::post('contact-requests/{contactRequest}/link-customer', [ContactRequestController::class, 'linkCustomer'])->name('contact.link-customer');
    Route::post('contact-requests/{contactRequest}/convert-customer', [ContactRequestController::class, 'convertCustomer'])->name('contact.convert-customer');
    Route::delete('contact-requests/{contactRequest}/customer', [ContactRequestController::class, 'unlinkCustomer'])->name('contact.unlink-customer');
    Route::post('contact-requests/{contactRequest}/link-project', [ContactRequestController::class, 'linkProject'])->name('contact.link-project');
    Route::delete('contact-requests/{contactRequest}/project/{project}', [ContactRequestController::class, 'unlinkProject'])->name('contact.unlink-project');

    // Media
    Route::get('media', [MediaController::class, 'index'])->name('media.index');
    Route::post('media', [MediaController::class, 'store'])->name('media.store');
    Route::delete('media/{medium}', [MediaController::class, 'destroy'])->name('media.destroy');

    // Users
    Route::apiResource('users', UserController::class);
    Route::put('users/{user}/products', [UserController::class, 'syncProducts'])->name('users.products.sync');
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

    // Billing — product subscriptions
    Route::apiResource('subscriptions', SubscriptionController::class);

    // Settings
    Route::get('settings', [SettingController::class, 'index'])->name('settings.index');
    Route::get('settings/{setting}', [SettingController::class, 'show'])->name('settings.show');
    Route::put('settings/{setting}', [SettingController::class, 'update'])->name('settings.update');

    // Feature Flags
    Route::get('feature-flags', [FeatureFlagController::class, 'index'])->name('flags.index');
    Route::post('feature-flags', [FeatureFlagController::class, 'store'])->name('flags.store');
    Route::put('feature-flags/{featureFlag}', [FeatureFlagController::class, 'update'])->name('flags.update');
    Route::delete('feature-flags/{featureFlag}', [FeatureFlagController::class, 'destroy'])->name('flags.destroy');

    // CMS — Static Pages
    Route::apiResource('static-pages', StaticPageController::class);

    // CMS — FAQ
    Route::get('faqs', [FaqController::class, 'index'])->name('faqs.index');
    Route::post('faqs', [FaqController::class, 'store'])->name('faqs.store');
    Route::get('faqs/{faq}', [FaqController::class, 'show'])->name('faqs.show');
    Route::put('faqs/{faq}', [FaqController::class, 'update'])->name('faqs.update');
    Route::delete('faqs/{faq}', [FaqController::class, 'destroy'])->name('faqs.destroy');

    // CMS — Menus
    Route::get('menus', [MenuController::class, 'index'])->name('menus.index');
    Route::post('menus', [MenuController::class, 'store'])->name('menus.store');
    Route::get('menus/{menu}', [MenuController::class, 'show'])->name('menus.show');
    Route::put('menus/{menu}', [MenuController::class, 'update'])->name('menus.update');
    Route::delete('menus/{menu}', [MenuController::class, 'destroy'])->name('menus.destroy');
    Route::post('menu-items', [MenuController::class, 'storeItem'])->name('menus.items.store');
    Route::put('menu-items/{menuItem}', [MenuController::class, 'updateItem'])->name('menus.items.update');
    Route::delete('menu-items/{menuItem}', [MenuController::class, 'destroyItem'])->name('menus.items.destroy');

    // CMS — Homepage Sections
    Route::get('homepage-sections', [HomepageSectionController::class, 'index'])->name('homepagesections.index');
    Route::post('homepage-sections', [HomepageSectionController::class, 'store'])->name('homepagesections.store');
    Route::get('homepage-sections/{section}', [HomepageSectionController::class, 'show'])->name('homepagesections.show');
    Route::put('homepage-sections/{section}', [HomepageSectionController::class, 'update'])->name('homepagesections.update');
    Route::delete('homepage-sections/{section}', [HomepageSectionController::class, 'destroy'])->name('homepagesections.destroy');

    // Audit Logs
    Route::get('audit-logs', [AuditLogController::class, 'index'])->name('audit-logs.index');

    // Ops — failed queue jobs (read-only observability, no retry/delete)
    Route::get('ops/failed-jobs', [FailedJobController::class, 'index'])->name('ops.failed-jobs.index');
});
