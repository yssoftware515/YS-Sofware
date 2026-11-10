<?php

namespace Tests\Feature\Admin;

use App\Domains\Operations\Models\ContactRequest;
use App\Domains\Operations\Models\Customer;
use App\Domains\Operations\Services\ProjectService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Tests\TestCase;

/**
 * ProjectService — the project domain's validation rules and business
 * invariants, exercised outside the HTTP layer (ARCH-004). Any future
 * CLI/job caller gets exactly the same rules and boundaries.
 */
class ProjectServiceTest extends TestCase
{
    use RefreshDatabase;

    private function projectService(): ProjectService
    {
        return app(ProjectService::class);
    }

    // ── validate() ────────────────────────────────────────────────────

    public function test_validate_accepts_a_valid_project_payload(): void
    {
        $this->actingAsSuperAdmin();
        $customer = Customer::factory()->create();

        $validated = $this->projectService()->validate([
            'name' => 'Acme Portal',
            'customer_id' => $customer->id,
            'project_type' => 'web_platform',
            'quoted_value' => '45000.00',
            'currency' => 'USD',
        ]);

        $this->assertSame('Acme Portal', $validated['name']);
        $this->assertSame($customer->id, $validated['customer_id']);
    }

    public function test_validate_rejects_an_invalid_project_payload(): void
    {
        $this->actingAsSuperAdmin();

        $this->expectException(ValidationException::class);

        $this->projectService()->validate([
            'name' => '',
            'customer_id' => 'not-a-uuid',
            'currency' => 'US-DOLLARS',
            'expected_completion_date' => '2024-01-01',
            'start_date' => '2025-01-01',
        ]);
    }

    // ── assertRequestMatchesCustomer ──────────────────────────────────

    public function test_request_must_belong_to_the_project_customer(): void
    {
        $this->actingAsSuperAdmin();
        $customerA = Customer::factory()->create();
        $customerB = Customer::factory()->create();
        $request = ContactRequest::factory()->create(['customer_id' => $customerA->id]);

        try {
            $this->projectService()->assertRequestMatchesCustomer(
                ['contact_request_id' => $request->id],
                $customerB->id,
            );
            $this->fail('Expected a 422 for a contact request owned by a different customer.');
        } catch (HttpException $e) {
            $this->assertSame(422, $e->getStatusCode());
        }

        // Matching customer — no exception.
        $this->projectService()->assertRequestMatchesCustomer(
            ['contact_request_id' => $request->id],
            $customerA->id,
        );
        $this->assertTrue(true);
    }

    public function test_unlinked_request_is_allowed(): void
    {
        $this->actingAsSuperAdmin();

        $this->projectService()->assertRequestMatchesCustomer([], null);
        $this->assertTrue(true);
    }
}
