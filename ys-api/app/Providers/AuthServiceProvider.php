<?php

namespace App\Providers;

use App\Domains\Auth\Models\User;
use App\Domains\Services\Models\Service;
use App\Domains\Services\Observers\ServiceObserver;
use Illuminate\Foundation\Support\Providers\AuthServiceProvider as ServiceProvider;
use Illuminate\Support\Facades\Gate;

class AuthServiceProvider extends ServiceProvider
{
    protected $policies = [];

    public function boot(): void
    {
        $this->registerPolicies();
        $this->registerObservers();
        $this->registerGates();
    }

    private function registerObservers(): void
    {
        Service::observe(ServiceObserver::class);
    }

    private function registerGates(): void
    {
        // Super admin bypasses ALL gates
        Gate::before(fn (User $user, string $ability) => $user->hasPermission('*') ? true : null
        );

        Gate::define('manage_contact_requests', fn (User $u) => $u->hasPermission('manage_contact_requests'));
        Gate::define('manage_users', fn (User $u) => $u->hasPermission('manage_users'));
        Gate::define('manage_settings', fn (User $u) => $u->hasPermission('manage_settings'));
        Gate::define('view_audit_logs', fn (User $u) => $u->hasPermission('view_audit_logs'));

        // RoleSeeder grants these but they had no Gate::define, so a holder
        // of the permission was still denied. Each remaining seeded
        // permission has a matching gate — the permission system stays the
        // single authorization mechanism.
        Gate::define('manage_admins', fn (User $u) => $u->hasPermission('manage_admins'));
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
