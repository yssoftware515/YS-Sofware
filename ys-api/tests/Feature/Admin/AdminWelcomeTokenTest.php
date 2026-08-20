<?php

namespace Tests\Feature\Admin;

use App\Domains\Auth\Models\Role;
use App\Domains\Auth\Models\User;
use App\Jobs\SendAdminUserCreatedJob;
use App\Mail\AdminUserCreatedMailable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

/**
 * VULN-03: admin temporary credentials must never be persisted in
 * queue payloads, database rows, or logs. The job carries only the
 * user id; the one-time sign-in token is generated inside handle(),
 * stored as a SHA-256 hash, mailed in plaintext (transient), and
 * consumed on first login.
 */
class AdminWelcomeTokenTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Mail::fake();
    }

    public function test_job_payload_contains_only_the_user_id(): void
    {
        $user = User::factory()->create(['password' => 'CreatorSecret123!']);

        $serialized = serialize(new SendAdminUserCreatedJob($user->id));

        $this->assertStringContainsString($user->id, $serialized);
        $this->assertStringNotContainsString('temporaryPassword', $serialized);
        $this->assertStringNotContainsString('password', strtolower($serialized));
        $this->assertStringNotContainsString('CreatorSecret123!', $serialized);
    }

    public function test_job_generates_token_stores_hash_and_mails_plaintext_only(): void
    {
        $user = User::factory()->create(['password' => 'CreatorSecret123!']);

        (new SendAdminUserCreatedJob($user->id))->handle();

        $fresh = $user->fresh();
        $this->assertNotNull($fresh->welcome_token_hash);
        $this->assertSame(64, strlen($fresh->welcome_token_hash));
        $this->assertTrue($fresh->welcome_token_expires_at->isFuture());

        $mailable = null;
        Mail::assertSent(AdminUserCreatedMailable::class, function ($mail) use (&$mailable, $user) {
            $mailable = $mail;

            return $mail->hasTo($user->email);
        });
        $this->assertNotNull($mailable);

        Mail::assertNothingQueued();

        $body = $mailable->render();
        preg_match('/One-Time Sign-In Token<\/td>\s*<td[^>]*>([A-Za-z0-9]+)<\/td>/', $body, $matches);
        $this->assertCount(2, $matches, 'Mail body must contain the plaintext token.');
        $this->assertSame(40, strlen($matches[1]));
        $this->assertTrue(
            hash_equals($fresh->welcome_token_hash, hash('sha256', $matches[1])),
            'The mailed token must hash to the stored value.'
        );
        $this->assertStringNotContainsString('CreatorSecret123!', $body);
        $this->assertStringNotContainsString('Temporary Password', $body);
    }

    public function test_creating_admin_via_api_dispatches_job_with_user_id_only(): void
    {
        Queue::fake();
        $this->actingAsSuperAdmin();

        $role = Role::factory()->create(['slug' => 'editor', 'permissions' => ['manage_settings']]);

        $this->postJson('/api/v1/admin/users', [
            'name' => 'New Admin',
            'email' => 'new.admin@example.com',
            'password' => 'SuperSecret123!',
            'password_confirmation' => 'SuperSecret123!',
            'role_id' => $role->id,
        ])->assertCreated();

        Queue::assertPushed(SendAdminUserCreatedJob::class);

        $pushed = Queue::pushed(SendAdminUserCreatedJob::class, fn () => true)->first();
        $serialized = serialize($pushed->job);

        $this->assertStringNotContainsString('SuperSecret123!', $serialized);
        $this->assertStringNotContainsString('password', strtolower($serialized));
    }

    public function test_login_with_welcome_token_succeeds_once_and_is_consumed(): void
    {
        $token = 'abcdefghijklmnopqrstuvwxyz0123456789ABCDEF';
        $user = User::factory()->create([
            'password' => 'CreatorSecret123!',
            'welcome_token_hash' => hash('sha256', $token),
            'welcome_token_expires_at' => now()->addDays(2),
        ]);

        $response = $this->postJson('/api/v1/auth/login', [
            'email' => $user->email,
            'password' => $token,
        ]);

        $response->assertOk();
        $this->assertNull($user->fresh()->welcome_token_hash, 'Token must be consumed on first login.');

        $this->postJson('/api/v1/auth/login', [
            'email' => $user->email,
            'password' => $token,
        ])->assertStatus(401);
    }

    public function test_login_with_creator_password_still_works(): void
    {
        $token = 'abcdefghijklmnopqrstuvwxyz0123456789ABCDEF';
        $user = User::factory()->create([
            'password' => 'CreatorSecret123!',
            'welcome_token_hash' => hash('sha256', $token),
            'welcome_token_expires_at' => now()->addDays(2),
        ]);

        $this->postJson('/api/v1/auth/login', [
            'email' => $user->email,
            'password' => 'CreatorSecret123!',
        ])->assertOk();

        $this->assertNotNull($user->fresh()->welcome_token_hash, 'Password login must not consume the token.');
    }

    public function test_expired_welcome_token_is_rejected(): void
    {
        $token = 'abcdefghijklmnopqrstuvwxyz0123456789ABCDEF';
        $user = User::factory()->create([
            'password' => 'CreatorSecret123!',
            'welcome_token_hash' => hash('sha256', $token),
            'welcome_token_expires_at' => now()->subDay(),
        ]);

        $this->postJson('/api/v1/auth/login', [
            'email' => $user->email,
            'password' => $token,
        ])->assertStatus(401);

        $this->assertNotNull($user->fresh()->welcome_token_hash, 'Expired token must stay unconsumed and dead.');
    }

    public function test_disabled_account_cannot_login_with_welcome_token(): void
    {
        $token = 'abcdefghijklmnopqrstuvwxyz0123456789ABCDEF';
        $user = User::factory()->inactive()->create([
            'welcome_token_hash' => hash('sha256', $token),
            'welcome_token_expires_at' => now()->addDay(),
        ]);

        // VULN-12: even a valid welcome token on a disabled account is
        // indistinguishable from bad credentials — 401, never 403.
        $this->postJson('/api/v1/auth/login', [
            'email' => $user->email,
            'password' => $token,
        ])->assertStatus(401)
            ->assertJsonPath('code', 'INVALID_CREDENTIALS');
    }
}
