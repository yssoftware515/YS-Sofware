<?php

namespace Tests\Unit;

use App\Domains\Auth\Actions\ForgotPasswordAction;
use App\Domains\Auth\Actions\LoginAction;
use App\Domains\Auth\Actions\ResetPasswordAction;
use App\Domains\System\Services\AuditService;
use App\Http\Controllers\Auth\AuthController;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use ReflectionMethod;
use Symfony\Component\HttpFoundation\Cookie;
use Tests\TestCase;

/**
 * Auth-cookie construction — the branch that cannot be reached through
 * the public API (a null or past expires_at never leaves LoginAction).
 * Invoked via reflection to pin the defensive fallback behaviour.
 */
class AuthCookieTest extends TestCase
{
    use RefreshDatabase;

    private function authCookie(?string $value, ?Carbon $expiresAt, bool $expired = false): Cookie
    {
        $controller = new AuthController(
            $this->createMock(LoginAction::class),
            $this->createMock(ForgotPasswordAction::class),
            $this->createMock(ResetPasswordAction::class),
            $this->createMock(AuditService::class),
        );

        $method = new ReflectionMethod(AuthController::class, 'authCookie');
        $method->setAccessible(true);

        return $method->invoke($controller, $value, $expiresAt, $expired);
    }

    public function test_cookie_falls_back_to_configured_ttl_when_token_expiry_is_null(): void
    {
        $cookie = $this->authCookie('tok', null);

        $expected = time() + 8 * 3600;
        $this->assertGreaterThan(time() + 7 * 3600, $cookie->getExpiresTime());
        $this->assertLessThanOrEqual($expected, $cookie->getExpiresTime());
    }

    public function test_cookie_falls_back_to_ttl_when_token_expiry_is_already_in_the_past(): void
    {
        $cookie = $this->authCookie('tok', Carbon::now()->subMinute());

        $this->assertGreaterThan(time() + 7 * 3600, $cookie->getExpiresTime());
        $this->assertLessThanOrEqual(time() + 8 * 3600, $cookie->getExpiresTime());
    }

    public function test_expired_cookie_is_set_in_the_past(): void
    {
        $cookie = $this->authCookie('', null, expired: true);

        $this->assertLessThan(time() - 30 * 24 * 3600, $cookie->getExpiresTime());
        $this->assertSame('', $cookie->getValue());
    }

    public function test_cookie_carries_hardened_attributes(): void
    {
        $cookie = $this->authCookie('tok', Carbon::now()->addHours(8));

        $this->assertTrue($cookie->isHttpOnly());
        $this->assertSame('lax', strtolower($cookie->getSameSite()));
        $this->assertSame('/', $cookie->getPath());
        $this->assertNull($cookie->getDomain());
    }

    public function test_expired_cookie_reuses_the_same_path_so_deletion_always_hits(): void
    {
        $live = $this->authCookie('tok', Carbon::now()->addHours(8));
        $expired = $this->authCookie('', null, expired: true);

        $this->assertSame($live->getPath(), $expired->getPath());
        $this->assertSame($live->getDomain(), $expired->getDomain());
        $this->assertSame($live->getSameSite(), $expired->getSameSite());
    }
}
