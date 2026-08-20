<?php

namespace App\Providers;

use App\Domains\Search\Contracts\SearchDriver;
use App\Domains\Search\Drivers\PostgresSearchDriver;
use App\Domains\System\Services\AuditService;
use App\Domains\System\Services\FeatureFlagService;
use App\Domains\System\Services\MediaUploadService;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        // Singletons — one instance per request lifecycle
        $this->app->singleton(AuditService::class);
        $this->app->singleton(FeatureFlagService::class);
        $this->app->singleton(MediaUploadService::class);

        // Search driver binding — swap PostgresSearchDriver for MeilisearchDriver
        // when ready, without changing any controller or service code.
        $this->app->singleton(SearchDriver::class, PostgresSearchDriver::class);
    }

    public function boot(): void
    {
        $this->configureFactoryResolver();
        $this->configureRateLimiting();
        $this->configureModelSettings();
    }

    /**
     * Models live under App\Domains\{Domain}\Models\{Model} instead of the
     * default App\Models\{Model}. Laravel's default factory name guesser
     * assumes the flat App\Models namespace, so we override it here to
     * always resolve to Database\Factories\{Model}Factory regardless of
     * how deeply nested the model's namespace is.
     */
    private function configureFactoryResolver(): void
    {
        Factory::guessFactoryNamesUsing(function (string $modelName) {
            $basename = class_basename($modelName);

            return 'Database\\Factories\\'.$basename.'Factory';
        });
    }

    private function configureRateLimiting(): void
    {
        // Public API
        RateLimiter::for('public', function (Request $request) {
            return Limit::perMinute(
                (int) config('security.rate_limits.public_api', 120)
            )->by($request->ip());
        });

        // Auth attempts — brute force protection. When CAPTCHA is
        // enabled (GAP-01), verified requests get a higher budget:
        // 10/min instead of 5/min — the Turnstile challenge already
        // filters bot traffic, so aggressive per-IP throttling would
        // only punish genuine users behind a shared NAT egress.
        RateLimiter::for('auth', function (Request $request) {
            $perMinute = (bool) config('security.captcha.turnstile.enabled')
                ? (int) config('security.rate_limits.auth_attempts_captcha', 10)
                : (int) config('security.rate_limits.auth_attempts', 5);

            return Limit::perMinute($perMinute)->by($request->ip())->response(function () {
                return response()->json([
                    'success' => false,
                    'message' => 'Too many login attempts. Please try again later.',
                    'code' => 'RATE_LIMIT_EXCEEDED',
                ], 429);
            });
        });

        // Contact form — 3 per hour per IP
        RateLimiter::for('contact', function (Request $request) {
            return Limit::perHour(
                (int) config('security.rate_limits.contact', 3)
            )->by($request->ip());
        });

        // Search — 60 per minute per IP
        RateLimiter::for('search', function (Request $request) {
            return Limit::perMinute(
                (int) config('security.rate_limits.search', 60)
            )->by($request->ip());
        });

        // Forgot-password — per-IP spray guard at the edge. The stronger
        // per-EMAIL budget (3/hour) lives inside ForgotPasswordAction.
        RateLimiter::for('forgot', function (Request $request) {
            return Limit::perMinute(
                (int) config('security.rate_limits.forgot', 5)
            )->by($request->ip());
        });

        // Admin API (VULN-27) — per authenticated user, not per IP:
        // the admin panel is a small trusted team behind shared egress
        // NAT, so IP-keying would either starve them or be trivially
        // rotated around. 300/min is a generous ceiling for real panel
        // work while capping scripted scraping of every admin endpoint.
        RateLimiter::for('admin', function (Request $request) {
            $limit = Limit::perMinute(
                (int) config('security.rate_limits.admin_throttle', 300)
            );

            // Keyed by user ID (runs after auth:sanctum in the group).
            // Unauthenticated requests fall back to IP — they get the
            // same 401 either way, but still bounded.
            if ($request->user() !== null) {
                $limit = $limit->by('user:'.$request->user()->getAuthIdentifier());
            } else {
                $limit = $limit->by('ip:'.$request->ip());
            }

            return $limit->response(function () {
                return response()->json([
                    'success' => false,
                    'message' => 'Too many admin requests. Please try again later.',
                    'code' => 'RATE_LIMIT_EXCEEDED',
                ], 429);
            });
        });
    }

    private function configureModelSettings(): void
    {
        // Prevent mass assignment silent discard in non-production
        Model::preventSilentlyDiscardingAttributes(
            ! app()->isProduction()
        );

        // N+1 detection in non-production
        Model::preventLazyLoading(
            ! app()->isProduction()
        );
    }
}
