<?php

namespace Tests\Feature\Security;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Middleware\TrustProxies;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

/**
 * VULN-07: without trusted proxies, Laravel ignores X-Forwarded-For
 * and $request->ip() returns the proxy container IP for every client —
 * all per-IP rate limits (auth, contact, search, public) collapse into
 * a global budget. The login action keys its per-IP limiter on
 * $request->ip(); these tests prove the IP resolution honors the
 * trusted-proxy configuration (and ignores it when unset).
 */
class TrustedProxyRateLimitTest extends TestCase
{
    use RefreshDatabase;

    private const CLIENT_A = '203.0.113.7';

    private const CLIENT_B = '203.0.113.8';

    protected function setUp(): void
    {
        parent::setUp();
        TrustProxies::flushState();
        config(['trustedproxy.proxies' => null]);
    }

    private function failedLogin(string $xffIp, string $email): TestResponse
    {
        return $this->withHeader('X-Forwarded-For', $xffIp)
            ->postJson('/api/v1/auth/login', [
                'email' => $email,
                'password' => 'definitely-wrong-password',
            ]);
    }

    private function ipKey(string $ip): string
    {
        return 'login-ip:'.hash('sha256', $ip);
    }

    public function test_trusted_proxy_keys_rate_limit_on_forwarded_client_ip(): void
    {
        TrustProxies::at('127.0.0.1');
        TrustProxies::withHeaders(Request::HEADER_X_FORWARDED_FOR);

        $this->failedLogin(self::CLIENT_A, 'a@example.com')->assertStatus(401);

        $this->assertSame(1, RateLimiter::attempts($this->ipKey(self::CLIENT_A)));
        $this->assertSame(0, RateLimiter::attempts($this->ipKey('127.0.0.1')));
    }

    public function test_untrusted_proxy_ignores_forwarded_header_and_keys_on_peer(): void
    {
        $this->failedLogin(self::CLIENT_A, 'a@example.com')->assertStatus(401);

        $this->assertSame(0, RateLimiter::attempts($this->ipKey(self::CLIENT_A)));
        $this->assertSame(1, RateLimiter::attempts($this->ipKey('127.0.0.1')));
    }

    public function test_sixth_attempt_from_one_ip_blocked_while_other_ip_unaffected(): void
    {
        TrustProxies::at('127.0.0.1');
        TrustProxies::withHeaders(Request::HEADER_X_FORWARDED_FOR);

        for ($i = 1; $i <= 5; $i++) {
            $this->failedLogin(self::CLIENT_A, "a{$i}@example.com")->assertStatus(401);
        }

        $this->failedLogin(self::CLIENT_A, 'a6@example.com')->assertStatus(429);

        $this->failedLogin(self::CLIENT_B, 'b@example.com')->assertStatus(401);
    }
}
