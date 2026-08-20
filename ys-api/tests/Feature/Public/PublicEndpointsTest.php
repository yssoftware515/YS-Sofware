<?php

namespace Tests\Feature\Public;

use App\Domains\Content\Models\Career;
use App\Domains\Content\Models\RoadmapItem;
use App\Domains\Content\Models\Update;
use App\Domains\Operations\Models\ContactRequest;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\RateLimiter;
use Tests\TestCase;

class PublicEndpointsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Queue::fake(); // prevent contact notification jobs from actually running

        // Explicitly clear rate limiter state — belt-and-suspenders alongside
        // the array cache driver, since each test hits the same /contact
        // endpoint and the throttle:contact middleware allows only 3/hour.
        RateLimiter::clear('contact:127.0.0.1');
    }

    // ── Contact Form ─────────────────────────────────────────────────

    public function test_contact_form_stores_request(): void
    {
        $response = $this->postJson('/api/v1/public/contact', [
            'name' => 'Yahya Test',
            'email' => 'yahya@test.com',
            'message' => 'This is a test message with more than twenty characters.',
            'type' => 'general',
        ]);

        $response->assertStatus(200)->assertJsonPath('success', true);
        $this->assertDatabaseHas('contact_requests', ['email' => 'yahya@test.com']);
    }

    public function test_contact_form_requires_minimum_message_length(): void
    {
        $response = $this->postJson('/api/v1/public/contact', [
            'name' => 'Test',
            'email' => 'test@test.com',
            'message' => 'Too short',
        ]);

        $response->assertStatus(422)->assertJsonValidationErrors(['message']);
    }

    public function test_contact_form_requires_valid_email(): void
    {
        $response = $this->postJson('/api/v1/public/contact', [
            'name' => 'Test',
            'email' => 'not-an-email',
            'message' => 'This message is long enough to pass validation.',
        ]);

        $response->assertStatus(422)->assertJsonValidationErrors(['email']);
    }

    // ── Roadmap ──────────────────────────────────────────────────────

    public function test_public_roadmap_only_shows_public_items(): void
    {
        RoadmapItem::factory()->create(['is_public' => true,  'title_en' => 'Public Feature']);
        RoadmapItem::factory()->create(['is_public' => false, 'title_en' => 'Private Feature']);

        $response = $this->getJson('/api/v1/public/roadmap');

        $response->assertStatus(200);
        $data = $response->json('data');
        $this->assertCount(1, $data);
    }

    // ── Updates ──────────────────────────────────────────────────────

    public function test_public_updates_only_shows_published(): void
    {
        Update::factory()->create(['published_at' => now()->subDay(), 'title_en' => 'Published']);
        Update::factory()->create(['published_at' => null, 'title_en' => 'Draft']);

        $response = $this->getJson('/api/v1/public/updates');

        $response->assertStatus(200);
        $data = $response->json('data');
        $this->assertCount(1, $data);
    }

    // ── Careers ──────────────────────────────────────────────────────

    public function test_public_careers_only_shows_open_positions(): void
    {
        Career::factory()->create(['status' => 'open',   'title_en' => 'Open Role']);
        Career::factory()->create(['status' => 'closed', 'title_en' => 'Closed Role']);
        Career::factory()->create(['status' => 'draft',  'title_en' => 'Draft Role']);

        $response = $this->getJson('/api/v1/public/careers');

        $response->assertStatus(200);
        $data = $response->json('data');
        $this->assertCount(1, $data);
    }

    public function test_closed_career_detail_returns_404(): void
    {
        $career = Career::factory()->create(['status' => 'closed']);

        $response = $this->getJson("/api/v1/public/careers/{$career->id}");
        $response->assertStatus(404);
    }

    // ── Admin Contact Requests ────────────────────────────────────────

    public function test_admin_can_view_contact_requests(): void
    {
        $this->actingAsSuperAdmin();
        ContactRequest::factory()->count(3)->create();

        $response = $this->getJson('/api/v1/admin/contact-requests');

        $response->assertStatus(200)->assertJsonPath('success', true);
        $this->assertCount(3, $response->json('data'));
    }

    public function test_admin_can_update_contact_request_status(): void
    {
        $this->actingAsSuperAdmin();
        $contact = ContactRequest::factory()->create(['status' => 'new']);

        $response = $this->patchJson("/api/v1/admin/contact-requests/{$contact->id}/status", [
            'status' => 'in_progress',
        ]);

        $response->assertStatus(200);
        $this->assertDatabaseHas('contact_requests', [
            'id' => $contact->id,
            'status' => 'in_progress',
        ]);
    }
}
