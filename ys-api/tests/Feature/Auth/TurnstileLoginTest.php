<?php

namespace Tests\Feature\Auth;

use App\Domains\Auth\Models\Role;
use App\Domains\Auth\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

/**
 * GAP-01: Cloudflare Turnstile gates the admin login endpoint when
 * TURNSTILE_ENABLED=true. The token is verified in LoginAction BEFORE
 * any authentication logic; a missing or invalid token rejects the
 * login with 422. When CAPTCHA is disabled (dev default) the login
 * flow is byte-for-byte unchanged.
 */
class TurnstileLoginTest extends TestCase
{
    use RefreshDatabase;

    private const SITEVERIFY = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

    private function createUser(): User
    {
        $role = Role::factory()->create(['slug' => 'turnstile_'.uniqid(), 'permissions' => ['*']]);
        $user = User::factory()->create(['role_id' => $role->id, 'is_active' => true, 'password' => 'Password123!']);

        return $user;
    }

    private function enableCaptcha(): void
    {
        config([
            'security.captcha.turnstile.enabled' => true,
            'security.captcha.turnstile.secret_key' => 'test-secret-key',
            'security.captcha.turnstile.site_key' => 'test-site-key',
        ]);
    }

    private function login(string $email, array $payload = []): TestResponse
    {
        return $this->withServerVariables(['REMOTE_ADDR' => '10.9.0.7'])
            ->postJson('/api/v1/auth/login', array_merge([
                'email' => $email,
                'password' => 'Password123!',
            ], $payload));
    }

    public function test_login_without_turnstile_token_is_rejected_when_enabled(): void
    {
        $this->enableCaptcha();
        $user = $this->createUser();

        $this->login($user->email)
            ->assertStatus(422)
            ->assertJsonValidationErrors(['turnstile']);
    }

    public function test_login_with_invalid_turnstile_token_is_rejected_when_enabled(): void
    {
        $this->enableCaptcha();
        $user = $this->createUser();

        Http::fake([
            self::SITEVERIFY => Http::response(['success' => false]),
        ]);

        $this->login($user->email, ['turnstile_token' => 'invalid-token'])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['turnstile']);

        Http::assertSent(function ($request) {
            return $request->url() === self::SITEVERIFY
                && $request['secret'] === 'test-secret-key'
                && $request['response'] === 'invalid-token'
                && $request['remoteip'] === '10.9.0.7';
        });
    }

    public function test_login_with_valid_turnstile_token_flows_normally(): void
    {
        $this->enableCaptcha();
        $user = $this->createUser();

        Http::fake([
            self::SITEVERIFY => Http::response(['success' => true]),
        ]);

        $this->login($user->email, ['turnstile_token' => 'valid-token'])
            ->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertCookie(config('security.cookies.name'));
    }

    public function test_login_flow_is_unchanged_when_captcha_disabled(): void
    {
        $user = $this->createUser();

        $this->login($user->email)
            ->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertCookie(config('security.cookies.name'));

        // No siteverify round-trip happens when disabled.
        Http::assertNothingSent();
    }

    public function test_failed_captcha_does_not_burn_the_login_rate_limit_budget(): void
    {
        $this->enableCaptcha();
        $user = $this->createUser();

        Http::fake(function ($request) {
            return $request['response'] === 'valid-token'
                ? Http::response(['success' => true])
                : Http::response(['success' => false]);
        });

        // A bot hammering without a valid token is rejected with 422
        // every time — those attempts return before checkRateLimit, so
        // the action's per-IP / per-email budgets are never touched...
        for ($i = 0; $i < 5; $i++) {
            $this->login($user->email, ['turnstile_token' => 'spam-token'])->assertStatus(422);
        }

        // ...and a genuine verified login still succeeds immediately.
        $this->login($user->email, ['turnstile_token' => 'valid-token'])
            ->assertStatus(200)
            ->assertJsonPath('success', true);
    }
}
