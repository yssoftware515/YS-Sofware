<?php

namespace Tests\Feature\Auth;

use App\Domains\Auth\Models\Role;
use App\Domains\Auth\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    private function createAdminUser(array $overrides = []): User
    {
        $role = Role::factory()->create([
            'slug' => 'super_admin',
            'permissions' => ['*'],
        ]);

        return User::factory()->create(array_merge([
            'role_id' => $role->id,
            'is_active' => true,
            'password' => 'Password123!',
        ], $overrides));
    }

    // ── Login ────────────────────────────────────────────────────────

    public function test_admin_can_login_with_valid_credentials(): void
    {
        $user = $this->createAdminUser();

        $response = $this->postJson('/api/v1/auth/login', [
            'email' => $user->email,
            'password' => 'Password123!',
        ]);

        $response->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'data' => ['user', 'expires_at'],
            ])
            ->assertJson(['success' => true]);
    }

    public function test_login_delivers_token_only_through_http_only_cookie(): void
    {
        $user = $this->createAdminUser();

        $response = $this->postJson('/api/v1/auth/login', [
            'email' => $user->email,
            'password' => 'Password123!',
        ]);

        // The plain-text token must never appear in the response body —
        // a XSS read on the admin page cannot steal what the body never
        // contains. It travels exclusively in the HttpOnly cookie.
        $response->assertStatus(200);
        $this->assertArrayNotHasKey('token', $response->json('data'));

        $cookie = collect($response->headers->getCookies())
            ->first(fn ($c) => $c->getName() === 'ys_admin_token');

        $this->assertNotNull($cookie, 'Auth cookie was not set on the response.');
        $this->assertTrue($cookie->isHttpOnly(), 'Auth cookie must be HttpOnly.');
        $this->assertSame('lax', strtolower($cookie->getSameSite()));
        $this->assertSame('/', $cookie->getPath());

        // Cookie lifetime matches the REAL token expiry (not an abs()-
        // wrapped diff) — within a second of the expires_at in the body.
        $tokenExpiry = Carbon::parse($response->json('data.expires_at'))->getTimestamp();
        $this->assertSame($tokenExpiry, $cookie->getExpiresTime());
    }

    public function test_cookie_authenticated_request_round_trip(): void
    {
        // Phase 4B P1 regression: the auth cookie travels ENCRYPTED
        // (EncryptCookies + CookieValuePrefix). CookieToBearer used to run
        // in the GLOBAL stack, before Sanctum's stateful EncryptCookies
        // could decrypt it — so the Bearer header carried the raw
        // encrypted value and every cookie-authenticated request 401'd.
        // The cookie must be consumed AFTER decryption, exactly as the
        // real SPA flow delivers it (stateful request, Origin header).
        $user = $this->createAdminUser();

        $plainTextToken = $user->createToken('admin-session', ['admin'], now()->addHours(8))
            ->plainTextToken;

        // The test client's withCookie() already encrypts the value the
        // way EncryptCookies expects (CookieValuePrefix + serialize=false
        // in test mode) — pass the RAW plainTextToken, exactly what the
        // app's response cookie holds before encryption.
        $this->withCookie('ys_admin_token', $plainTextToken)
            ->withHeaders(['Origin' => 'http://localhost:3000'])
            ->withCredentials()
            ->getJson('/api/v1/auth/me')
            ->assertStatus(200)
            ->assertJsonPath('data.email', $user->email);
    }

    public function test_login_cookie_survives_clock_skew_without_abs_artifacts(): void
    {
        $user = $this->createAdminUser();

        // Simulate 30 minutes of server clock skew: the old abs()-
        // wrapped diff would miscompute the cookie lifetime here.
        Carbon::setTestNow(now()->addMinutes(30));

        try {
            $response = $this->postJson('/api/v1/auth/login', [
                'email' => $user->email,
                'password' => 'Password123!',
            ]);

            $cookie = collect($response->headers->getCookies())
                ->first(fn ($c) => $c->getName() === 'ys_admin_token');

            $this->assertNotNull($cookie);
            // Expiry stays ~8h ahead of the REAL wall clock (time() is
            // not frozen), not 8h ahead of the skewed clock.
            $this->assertGreaterThan(time() + 7 * 3600, $cookie->getExpiresTime());
            $this->assertLessThan(time() + 9 * 3600, $cookie->getExpiresTime());
        } finally {
            Carbon::setTestNow();
        }
    }

    public function test_login_fails_with_wrong_password(): void
    {
        $user = $this->createAdminUser();

        $response = $this->postJson('/api/v1/auth/login', [
            'email' => $user->email,
            'password' => 'WrongPassword!',
        ]);

        $response->assertStatus(401)
            ->assertJson([
                'success' => false,
                'code' => 'INVALID_CREDENTIALS',
            ]);
    }

    public function test_login_fails_for_inactive_user(): void
    {
        $user = $this->createAdminUser(['is_active' => false]);

        // VULN-12: a disabled account is indistinguishable from bad
        // credentials — identical 401 INVALID_CREDENTIALS (the old 403
        // ACCOUNT_DISABLED disclosed account existence and state).
        $response = $this->postJson('/api/v1/auth/login', [
            'email' => $user->email,
            'password' => 'Password123!',
        ]);

        $response->assertStatus(401)
            ->assertJson(['code' => 'INVALID_CREDENTIALS']);
    }

    public function test_login_requires_valid_email(): void
    {
        $response = $this->postJson('/api/v1/auth/login', [
            'email' => 'not-an-email',
            'password' => 'Password123!',
        ]);

        $response->assertStatus(422)
            ->assertJsonPath('code', 'VALIDATION_ERROR')
            ->assertJsonValidationErrors(['email']);
    }

    public function test_login_requires_password(): void
    {
        $response = $this->postJson('/api/v1/auth/login', [
            'email' => 'test@example.com',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['password']);
    }

    // ── Logout ───────────────────────────────────────────────────────

    public function test_authenticated_user_can_logout(): void
    {
        $user = $this->actingAsSuperAdmin();

        $response = $this->postJson('/api/v1/auth/logout');

        $response->assertStatus(200)
            ->assertJson(['success' => true]);
    }

    public function test_logout_is_idempotent_when_token_is_already_revoked(): void
    {
        $user = $this->actingAsSuperAdmin();
        $user->currentAccessToken()?->delete();

        // The token is already gone (e.g. revoked on another device) —
        // logout must not fatal on currentAccessToken() returning null.
        $response = $this->postJson('/api/v1/auth/logout');

        $response->assertStatus(200)
            ->assertJson(['success' => true]);
    }

    public function test_logout_clears_the_auth_cookie(): void
    {
        $this->actingAsSuperAdmin();

        $response = $this->postJson('/api/v1/auth/logout');

        $cookie = collect($response->headers->getCookies())
            ->first(fn ($c) => $c->getName() === 'ys_admin_token');

        $this->assertNotNull($cookie, 'Auth cookie must be cleared on logout.');
        // Expiry in the past => browser deletes it immediately.
        $this->assertLessThan(time(), $cookie->getExpiresTime());
    }

    public function test_unauthenticated_user_cannot_access_logout(): void
    {
        $response = $this->postJson('/api/v1/auth/logout');
        $response->assertStatus(401);
    }

    // ── Rate limiting ─────────────────────────────────────────────────

    public function test_login_is_rate_limited_after_five_failed_attempts(): void
    {
        $user = $this->createAdminUser();

        for ($i = 0; $i < 5; $i++) {
            $this->postJson('/api/v1/auth/login', [
                'email' => $user->email,
                'password' => 'WrongPassword!',
            ])->assertStatus(401);
        }

        // The 6th attempt is stopped by the route throttle (auth) with
        // its custom 429 payload before the controller ever runs.
        $this->postJson('/api/v1/auth/login', [
            'email' => $user->email,
            'password' => 'WrongPassword!',
        ])->assertStatus(429)
            ->assertJsonPath('code', 'RATE_LIMIT_EXCEEDED');
    }

    public function test_login_per_email_limit_blocks_across_rotating_ips(): void
    {
        $user = $this->createAdminUser();

        // 10 failures from 10 different IPs: no single IP trips the
        // per-IP limit, but the per-email window (10/60s) must trip.
        for ($i = 0; $i < 10; $i++) {
            $this->withServerVariables(['REMOTE_ADDR' => '10.0.0.'.($i + 1)])
                ->postJson('/api/v1/auth/login', [
                    'email' => $user->email,
                    'password' => 'WrongPassword!',
                ])->assertStatus(401);
        }

        $this->withServerVariables(['REMOTE_ADDR' => '10.0.0.99'])
            ->postJson('/api/v1/auth/login', [
                'email' => $user->email,
                'password' => 'WrongPassword!',
            ])->assertStatus(429);
    }

    public function test_successful_login_clears_the_rate_limit(): void
    {
        $user = $this->createAdminUser();

        for ($i = 0; $i < 4; $i++) {
            $this->postJson('/api/v1/auth/login', [
                'email' => $user->email,
                'password' => 'WrongPassword!',
            ])->assertStatus(401);
        }

        $this->postJson('/api/v1/auth/login', [
            'email' => $user->email,
            'password' => 'Password123!',
        ])->assertStatus(200);
    }

    // ── Me ───────────────────────────────────────────────────────────

    public function test_me_returns_authenticated_user(): void
    {
        $user = $this->actingAsSuperAdmin();

        $response = $this->getJson('/api/v1/auth/me');

        $response->assertStatus(200)
            ->assertJsonPath('data.email', $user->email)
            ->assertJsonPath('data.id', $user->id);
    }

    public function test_me_does_not_expose_password(): void
    {
        $this->actingAsSuperAdmin();

        $response = $this->getJson('/api/v1/auth/me');
        $data = $response->json('data');

        $this->assertArrayNotHasKey('password', $data);
        $this->assertArrayNotHasKey('remember_token', $data);
        $this->assertArrayNotHasKey('password_changed_at', $data);
    }

    // ── Security ─────────────────────────────────────────────────────

    public function test_security_headers_are_present(): void
    {
        $response = $this->getJson('/api/v1/health');

        $response->assertHeader('X-Frame-Options', 'DENY');
        $response->assertHeader('X-Content-Type-Options', 'nosniff');
        $response->assertHeader('Content-Security-Policy');
    }

    public function test_health_endpoint_returns_ok(): void
    {
        $response = $this->getJson('/api/v1/health');

        $response->assertStatus(200)
            ->assertJsonPath('data.status', 'ok');
    }
}
