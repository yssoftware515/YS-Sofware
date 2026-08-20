<?php

namespace Tests\Unit;

use Illuminate\Container\Container;
use Illuminate\Foundation\Application;
use PHPUnit\Framework\TestCase;

/**
 * Guards the Phase 4A deployment decision (P1-01): the shipped
 * production model is DB/file-backed with NO Redis — not in
 * docker-compose, not in .env.example, and the example config is
 * production-safe to copy.
 *
 * If a future phase deliberately reintroduces Redis, this test must
 * be updated consciously (and FeatureFlagService's fallback revisited).
 */
class DeploymentConfigConsistencyTest extends TestCase
{
    private string $envExample;

    private string $compose;

    protected function setUp(): void
    {
        $this->envExample = realpath(__DIR__.'/../../.env.example') ?: '';
        $this->compose = realpath(__DIR__.'/../../../docker-compose.yml') ?: '';
    }

    public function test_env_example_exists(): void
    {
        $this->assertFileExists($this->envExample);
    }

    public function test_env_example_does_not_point_cache_session_or_queue_at_redis(): void
    {
        $contents = file_get_contents($this->envExample);

        $this->assertStringNotContainsString('CACHE_STORE=redis', $contents);
        $this->assertStringNotContainsString('SESSION_DRIVER=redis', $contents);
        $this->assertStringNotContainsString('QUEUE_CONNECTION=redis', $contents);
        $this->assertStringNotContainsString('REDIS_HOST', $contents);
    }

    public function test_env_example_is_safe_to_copy_into_production(): void
    {
        $contents = file_get_contents($this->envExample);

        $this->assertStringContainsString('APP_ENV=production', $contents);
        $this->assertStringContainsString('APP_DEBUG=false', $contents);
        $this->assertStringContainsString('LOG_LEVEL=info', $contents);
    }

    public function test_docker_compose_has_no_redis_service_or_envs(): void
    {
        $this->assertFileExists($this->compose);

        $contents = file_get_contents($this->compose);

        $this->assertStringNotContainsString('redis:', $contents);
        $this->assertStringNotContainsString('REDIS_HOST', $contents);
        $this->assertStringNotContainsString('redis_data', $contents);
    }

    public function test_docker_compose_persists_storage_for_backend_worker_and_scheduler(): void
    {
        $this->assertFileExists($this->compose);

        $contents = file_get_contents($this->compose);

        $this->assertSame(3, substr_count($contents, 'backend_storage:/app/storage'));
    }

    public function test_logging_config_defaults_to_daily_with_bounded_retention(): void
    {
        $logging = $this->configFromFile(__DIR__.'/../../config/logging.php');

        // Phase 6 (P6-02): the single long-lived backend container must not
        // grow an unbounded laravel.log — the framework default 'single'
        // channel is replaced by bounded daily rotation.
        $this->assertSame('daily', $logging['channels']['daily']['driver']);
        $this->assertSame(14, $logging['channels']['daily']['days']);

        // LOG_CHANNEL can still explicitly override the default; the
        // 'single' channel definition is preserved for that path.
        $this->assertSame('single', $logging['channels']['single']['driver']);

        // The default is bound to the env override (deterministic string
        // check — the resolved value depends on the runtime environment).
        $this->assertStringContainsString(
            "'default' => env('LOG_CHANNEL', 'daily')",
            file_get_contents(__DIR__.'/../../config/logging.php')
        );
    }

    public function test_logging_level_binds_to_log_level_env(): void
    {
        $contents = file_get_contents(__DIR__.'/../../config/logging.php');

        // The level must stay operator-controlled via LOG_LEVEL, defaulting
        // to 'info' — the value itself may be overridden at deployment time.
        $this->assertStringContainsString("env('LOG_LEVEL', 'info')", $contents);
    }

    public function test_security_config_exposes_trusted_proxies_as_configurable_value(): void
    {
        $security = $this->configFromFile(__DIR__.'/../../config/security.php');

        // Phase 6 (P6-03): TRUSTED_PROXIES moves from a bootstrap-time
        // env() read into config so it survives `php artisan config:cache`.
        $this->assertArrayHasKey('proxy', $security);
        $this->assertArrayHasKey('trusted_cidrs', $security['proxy']);
        $this->assertIsString($security['proxy']['trusted_cidrs']);

        // Bound to the env override with an empty default (deterministic
        // string check — the resolved value depends on the runtime env).
        $this->assertStringContainsString(
            "'trusted_cidrs' => env('TRUSTED_PROXIES', '')",
            file_get_contents(__DIR__.'/../../config/security.php')
        );
    }

    public function test_bootstrap_reads_trusted_proxies_via_config_not_env(): void
    {
        $contents = file_get_contents(__DIR__.'/../../bootstrap/app.php');

        // Config-cache hygiene: no direct env() read for TRUSTED_PROXIES.
        $this->assertStringNotContainsString("env('TRUSTED_PROXIES'", $contents);
        $this->assertStringContainsString(
            "config('security.proxy.trusted_cidrs', '')",
            $contents
        );
    }

    /**
     * Loads a config file with a minimal un-booted application instance so
     * framework helpers (storage_path) resolve deterministically, without
     * running providers or touching the environment.
     */
    private function configFromFile(string $path): array
    {
        $app = Application::configure(__DIR__.'/../../')->create();
        Container::setInstance($app);

        return require $path;
    }
}
