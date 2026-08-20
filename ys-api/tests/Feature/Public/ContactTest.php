<?php

namespace Tests\Feature\Public;

use App\Domains\Operations\Models\ContactRequest;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\RateLimiter;
use Tests\TestCase;

class ContactTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Queue::fake();
        RateLimiter::clear('contact:127.0.0.1');
    }

    public function test_contact_request_accepts_request_type(): void
    {
        $response = $this->postJson('/api/v1/public/contact', [
            'name' => 'Yahya',
            'email' => 'yahya@test.com',
            'message' => 'I would like to build a custom platform with several integrations.',
            'request_type' => 'saas',
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('success', true);

        $this->assertDatabaseHas('contact_requests', [
            'email' => 'yahya@test.com',
            'request_type' => 'saas',
        ]);
    }

    public function test_contact_request_rejects_unknown_request_type(): void
    {
        $response = $this->postJson('/api/v1/public/contact', [
            'name' => 'Yahya',
            'email' => 'yahya@test.com',
            'message' => 'I would like to build a custom platform with many features.',
            'request_type' => 'time_travel',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['request_type']);
    }

    public function test_contact_request_without_request_type_defaults_to_null(): void
    {
        $response = $this->postJson('/api/v1/public/contact', [
            'name' => 'Yahya',
            'email' => 'yahya@test.com',
            'message' => 'A nice project message that is long enough to pass.',
        ]);

        $response->assertStatus(200);

        $this->assertDatabaseHas('contact_requests', [
            'email' => 'yahya@test.com',
            'request_type' => null,
        ]);
    }

    public function test_contact_request_accepts_project_fields(): void
    {
        $response = $this->postJson('/api/v1/public/contact', [
            'name' => 'Yahya',
            'email' => 'yahya@test.com',
            'company_name' => 'Acme Corp',
            'contact_preference' => 'whatsapp',
            'phone' => '+971501234567',
            'budget_range' => '10k_30k',
            'timeline' => 'one_three_months',
            'message' => 'We need a web platform with dashboards and payments.',
            'request_type' => 'web_platform',
            'details' => ['existing_website' => 'yes', 'users_count' => '500'],
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('success', true);

        $this->assertDatabaseHas('contact_requests', [
            'email' => 'yahya@test.com',
            'company_name' => 'Acme Corp',
            'contact_preference' => 'whatsapp',
            'budget_range' => '10k_30k',
            'timeline' => 'one_three_months',
        ]);

        $stored = ContactRequest::where('email', 'yahya@test.com')->firstOrFail();
        $this->assertSame('+971501234567', $stored->phone);
        $this->assertSame(
            ['existing_website' => 'yes', 'users_count' => '500'],
            $stored->details,
        );
    }

    public function test_contact_request_rejects_invalid_project_fields(): void
    {
        $response = $this->postJson('/api/v1/public/contact', [
            'name' => 'Yahya',
            'email' => 'yahya@test.com',
            'message' => 'A long enough message to pass the minimum length rule.',
            'contact_preference' => 'telegram',
            'budget_range' => 'free',
            'timeline' => 'yesterday',
            'details' => ['nested' => ['bad' => 'shape']],
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['contact_preference', 'budget_range', 'timeline', 'details.nested']);
    }

    public function test_whatsapp_preference_requires_phone(): void
    {
        $response = $this->postJson('/api/v1/public/contact', [
            'name' => 'Yahya',
            'email' => 'yahya@test.com',
            'contact_preference' => 'whatsapp',
            'message' => 'Please contact me on WhatsApp about our project.',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['phone']);
    }

    public function test_admin_can_filter_contact_requests_by_request_type(): void
    {
        $this->actingAsRole('admin');
        ContactRequest::factory()->create([
            'email' => 'a@test.com',
            'request_type' => 'website',
        ]);
        ContactRequest::factory()->create([
            'email' => 'b@test.com',
            'request_type' => 'crm',
        ]);

        $response = $this->getJson('/api/v1/admin/contact-requests?request_type=crm');

        $response->assertStatus(200)
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.email', 'b@test.com');
    }

    // ── Honeypot + per-email rate limit (security hardening) ──────────

    public function test_honeypot_filled_by_bot_is_silently_dropped(): void
    {
        Queue::fake();

        $response = $this->postJson('/api/v1/public/contact', [
            'name' => 'Spam Bot',
            'email' => 'bot@spam.example',
            'message' => 'Great platform, please contact me about pricing options.',
            'website' => 'http://spam.example/auto-filled-by-bot',
        ]);

        // Identical shape to a real success — bots cannot learn the trap.
        $response->assertStatus(200)
            ->assertJsonPath('success', true);

        $this->assertDatabaseMissing('contact_requests', ['email' => 'bot@spam.example']);
        Queue::assertNothingPushed();
    }

    public function test_honeypot_present_but_empty_passes_like_normal_submission(): void
    {
        $response = $this->postJson('/api/v1/public/contact', [
            'name' => 'Yahya',
            'email' => 'real@test.com',
            'message' => 'A completely ordinary message that is long enough.',
            'website' => '',
        ]);

        $response->assertStatus(200);

        $this->assertDatabaseHas('contact_requests', ['email' => 'real@test.com']);
    }

    public function test_contact_is_rate_limited_per_email_across_rotating_ips(): void
    {
        $payload = [
            'name' => 'Yahya',
            'email' => 'flood@test.com',
            'message' => 'This message is long enough to pass the minimum length.',
        ];

        // contact_email limit is 2/hour — a third attempt from a brand
        // new IP must still be blocked.
        $this->withServerVariables(['REMOTE_ADDR' => '10.1.0.1'])
            ->postJson('/api/v1/public/contact', $payload)->assertStatus(200);
        $this->withServerVariables(['REMOTE_ADDR' => '10.1.0.2'])
            ->postJson('/api/v1/public/contact', $payload)->assertStatus(200);
        $this->withServerVariables(['REMOTE_ADDR' => '10.1.0.3'])
            ->postJson('/api/v1/public/contact', $payload)
            ->assertStatus(429)
            ->assertJsonPath('code', 'RATE_LIMIT_EXCEEDED');
    }
}
