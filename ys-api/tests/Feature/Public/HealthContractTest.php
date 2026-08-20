<?php

namespace Tests\Feature\Public;

use Tests\TestCase;

/**
 * Public health endpoint contract — used by container healthchecks, the
 * release pipeline verify step and (future) external probes. The response
 * shape is part of the deployment contract (see docs/deployment.md).
 */
class HealthContractTest extends TestCase
{
    public function test_health_reports_database_and_cache_checks(): void
    {
        $response = $this->getJson('/api/v1/health');

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonStructure([
                'data' => [
                    'status',
                    'checks' => ['database', 'cache'],
                ],
            ])
            ->assertJsonPath('data.status', 'ok');
    }

    public function test_health_endpoint_does_not_leak_version_fingerprint(): void
    {
        $response = $this->getJson('/api/v1/health');

        $response->assertStatus(200);
        $this->assertArrayNotHasKey('version', $response->json('data'));
    }

    public function test_dashboard_health_block_matches_public_contract(): void
    {
        $this->actingAsSuperAdmin();

        $response = $this->getJson('/api/v1/admin/dashboard/stats');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => ['health' => ['status', 'checks' => ['database', 'cache']]],
            ])
            ->assertJsonPath('data.health.status', 'ok');
    }
}
