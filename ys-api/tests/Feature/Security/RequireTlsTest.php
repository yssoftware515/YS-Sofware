<?php

namespace Tests\Feature\Security;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Middleware\TrustProxies;
use Illuminate\Http\Request;
use Tests\TestCase;

/**
 * VULN-09: production must refuse plain-HTTP requests when no TLS
 * termination is detectable, fail-closed on cookie security, and keep
 * in-container health probes working.
 */
class RequireTlsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config(['security.tls.require_tls' => true]);
    }

    public function test_plain_http_request_is_refused_in_production(): void
    {
        $this->postJson('/api/v1/auth/login', [
            'email' => 'admin@example.com',
            'password' => 'wrong-password',
        ])->assertStatus(403)
            ->assertJson([
                'success' => false,
                'code' => 'TLS_REQUIRED',
            ]);
    }

    public function test_https_request_passes_the_gate(): void
    {
        $this->postJson('https://localhost/api/v1/auth/login', [
            'email' => 'admin@example.com',
            'password' => 'wrong-password',
        ])->assertStatus(401);
    }

    public function test_gate_off_when_disabled(): void
    {
        config(['security.tls.require_tls' => false]);

        $this->postJson('/api/v1/auth/login', [
            'email' => 'admin@example.com',
            'password' => 'wrong-password',
        ])->assertStatus(401);
    }

    public function test_health_probes_are_exempt_from_the_gate(): void
    {
        $this->getJson('/up')->assertOk();
        $this->getJson('/api/v1/health')->assertOk();
    }

    public function test_gate_honors_trusted_proxy_forwarded_proto(): void
    {
        TrustProxies::at('127.0.0.1');
        TrustProxies::withHeaders(
            Request::HEADER_X_FORWARDED_PROTO
        );

        $this->withHeader('X-Forwarded-Proto', 'https')
            ->postJson('/api/v1/auth/login', [
                'email' => 'admin@example.com',
                'password' => 'wrong-password',
            ])->assertStatus(401);
    }
}
