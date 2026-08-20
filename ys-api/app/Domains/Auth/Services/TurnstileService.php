<?php

namespace App\Domains\Auth\Services;

use Illuminate\Support\Facades\Http;

/**
 * Cloudflare Turnstile verification (GAP-01).
 *
 * The widget token is exchanged for a siteverify verdict server-side.
 * When TURNSTILE_ENABLED=false (dev default) verification is skipped
 * entirely so the login flow is unchanged.
 *
 * Fail-closed: an enabled integration with an empty secret key rejects
 * every login — a broken CAPTCHA must never silently disable itself.
 */
class TurnstileService
{
    private const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

    public function enabled(): bool
    {
        return (bool) config('security.captcha.turnstile.enabled');
    }

    /**
     * @return bool true when the token is verified, or when CAPTCHA is disabled
     */
    public function verify(string $token, string $remoteIp): bool
    {
        if (! $this->enabled()) {
            return true;
        }

        // Missing or empty token — no siteverify round-trip needed.
        if ($token === '') {
            return false;
        }

        $response = Http::asForm()->post(self::SITEVERIFY_URL, [
            'secret' => (string) config('security.captcha.turnstile.secret_key'),
            'response' => $token,
            'remoteip' => $remoteIp,
        ]);

        // Cloudflare returns 200 with {"success": false} for invalid
        // tokens, and non-200 for hard failures. Either way: reject.
        return $response->successful() && $response->json('success') === true;
    }
}
