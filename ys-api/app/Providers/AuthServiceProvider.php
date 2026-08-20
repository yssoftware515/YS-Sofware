<?php

namespace App\Providers;

use App\Domains\Auth\Models\User;
use App\Domains\Product\Models\Product;
use App\Domains\Product\Models\ProductRelease;
use App\Domains\Product\Observers\ProductObserver;
use App\Domains\Product\Observers\ProductReleaseObserver;
use App\Domains\Product\Policies\ProductPolicy;
use App\Domains\Services\Models\Service;
use App\Domains\Services\Observers\ServiceObserver;
use Illuminate\Foundation\Support\Providers\AuthServiceProvider as ServiceProvider;
use Illuminate\Support\Facades\Gate;

class AuthServiceProvider extends ServiceProvider
{
    protected $policies = [
        Product::class => ProductPolicy::class,
    ];

    public function boot(): void
    {
        $this->registerPolicies();
        $this->registerObservers();
        $this->registerGates();
    }

    private function registerObservers(): void
    {
        Product::observe(ProductObserver::class);
        ProductRelease::observe(ProductReleaseObserver::class);
        Service::observe(ServiceObserver::class);
    }

    private function registerGates(): void
    {
        // Super admin bypasses ALL gates
        Gate::before(fn (User $user, string $ability) => $user->hasPermission('*') ? true : null
        );

        Gate::define('manage_products', fn (User $u) => $u->hasPermission('manage_products'));
        Gate::define('manage_documentation', fn (User $u) => $u->hasPermission('manage_documentation'));
        Gate::define('manage_roadmap', fn (User $u) => $u->hasPermission('manage_roadmap'));
        Gate::define('manage_updates', fn (User $u) => $u->hasPermission('manage_updates'));
        Gate::define('manage_careers', fn (User $u) => $u->hasPermission('manage_careers'));
        Gate::define('manage_contact_requests', fn (User $u) => $u->hasPermission('manage_contact_requests'));
        Gate::define('manage_media', fn (User $u) => $u->hasPermission('manage_media'));
        Gate::define('manage_users', fn (User $u) => $u->hasPermission('manage_users'));
        Gate::define('manage_settings', fn (User $u) => $u->hasPermission('manage_settings'));
        Gate::define('view_audit_logs', fn (User $u) => $u->hasPermission('view_audit_logs'));

        // Summary: RoleSeeder grants these but they had NO Gate::define,
        // so a holder of the permission was still denied (Laravel denies
        // undefined abilities unless super-admin bypass applies). Each
        // seeded permission now has a matching gate — the permission
        // system stays the single authorization mechanism.
        Gate::define('view_products', fn (User $u) => $u->hasAnyPermission(['manage_products', 'view_products']));
        Gate::define('manage_faqs', fn (User $u) => $u->hasPermission('manage_faqs'));
        Gate::define('manage_static_pages', fn (User $u) => $u->hasPermission('manage_static_pages'));
        Gate::define('manage_menus', fn (User $u) => $u->hasPermission('manage_menus'));
        Gate::define('manage_homepage', fn (User $u) => $u->hasPermission('manage_homepage'));
        Gate::define('manage_timeline', fn (User $u) => $u->hasPermission('manage_timeline'));
        Gate::define('manage_feature_flags', fn (User $u) => $u->hasPermission('manage_feature_flags'));
        Gate::define('manage_roles', fn (User $u) => $u->hasPermission('manage_roles'));
        Gate::define('manage_admins', fn (User $u) => $u->hasPermission('manage_admins'));
        Gate::define('view_admin_activity', fn (User $u) => $u->hasPermission('view_admin_activity'));
        Gate::define('manage_subscriptions', fn (User $u) => $u->hasPermission('manage_subscriptions'));
        Gate::define('view_financials', fn (User $u) => $u->hasPermission('view_financials'));

        // Services (Sprint 2)
        Gate::define('view_services', fn (User $u) => $u->hasAnyPermission(['view_services', 'manage_services']));
        Gate::define('manage_services', fn (User $u) => $u->hasPermission('manage_services'));

        // Business operations (Sprint 6)
        Gate::define('view_customers', fn (User $u) => $u->hasAnyPermission(['view_customers', 'manage_customers']));
        Gate::define('manage_customers', fn (User $u) => $u->hasPermission('manage_customers'));
        Gate::define('view_projects', fn (User $u) => $u->hasAnyPermission(['view_projects', 'manage_projects']));
        Gate::define('manage_projects', fn (User $u) => $u->hasPermission('manage_projects'));
    }
}
