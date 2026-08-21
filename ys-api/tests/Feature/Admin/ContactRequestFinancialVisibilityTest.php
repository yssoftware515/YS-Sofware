<?php

namespace Tests\Feature\Admin;

use App\Domains\Auth\Models\Role;
use App\Domains\Auth\Models\User;
use App\Domains\Billing\Models\Customer;
use App\Domains\Operations\Models\ContactRequest;
use App\Domains\Operations\Models\Project;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Regression: ContactRequestController loaded projects with quoted_value
 * and currency unconditionally, exposing financial data to users who hold
 * manage_contact_requests but not view_financials. Every endpoint that
 * returns projects must omit financial fields unless the caller holds
 * view_financials (or the super-admin bypass applies).
 */
class ContactRequestFinancialVisibilityTest extends TestCase
{
    use RefreshDatabase;

    private function userWithPermissions(array $permissions): User
    {
        $role = Role::factory()->create([
            'slug' => 'cr_fin_'.uniqid(),
            'permissions' => $permissions,
        ]);

        return User::factory()->create(['role_id' => $role->id, 'is_active' => true]);
    }

    private function authAs(User $user): void
    {
        Sanctum::actingAs($user, ['admin']);
    }

    private function contactRequestWithProject(string $value = '99000.00', string $currency = 'USD'): array
    {
        $customer = Customer::factory()->create();
        $request = ContactRequest::factory()->create(['customer_id' => $customer->id]);
        $project = Project::factory()->create([
            'customer_id' => $customer->id,
            'contact_request_id' => $request->id,
            'quoted_value' => $value,
            'currency' => $currency,
        ]);

        return ['request' => $request, 'project' => $project, 'customer' => $customer];
    }

    // ── show ─────────────────────────────────────────────────────────

    public function test_show_omits_financial_fields_without_view_financials(): void
    {
        $this->authAs($this->userWithPermissions(['manage_contact_requests']));
        ['request' => $request] = $this->contactRequestWithProject();

        $this->getJson("/api/v1/admin/contact-requests/{$request->id}")
            ->assertOk()
            ->assertJsonMissingPath('data.projects.0.quoted_value')
            ->assertJsonMissingPath('data.projects.0.currency')
            ->assertJsonPath('data.projects.0.name', Project::first()->name);
    }

    public function test_show_includes_financial_fields_with_view_financials(): void
    {
        $this->authAs($this->userWithPermissions(['manage_contact_requests', 'view_financials']));
        ['request' => $request] = $this->contactRequestWithProject('55000.00', 'EUR');

        $this->getJson("/api/v1/admin/contact-requests/{$request->id}")
            ->assertOk()
            ->assertJsonPath('data.projects.0.quoted_value', '55000.00')
            ->assertJsonPath('data.projects.0.currency', 'EUR');
    }

    public function test_show_includes_financial_fields_for_super_admin(): void
    {
        $this->actingAsSuperAdmin();
        ['request' => $request] = $this->contactRequestWithProject('75000.00', 'GBP');

        $this->getJson("/api/v1/admin/contact-requests/{$request->id}")
            ->assertOk()
            ->assertJsonPath('data.projects.0.quoted_value', '75000.00')
            ->assertJsonPath('data.projects.0.currency', 'GBP');
    }

    // ── updateStatus ─────────────────────────────────────────────────

    public function test_update_status_omits_financial_fields_without_view_financials(): void
    {
        $this->authAs($this->userWithPermissions(['manage_contact_requests']));
        ['request' => $request] = $this->contactRequestWithProject();

        $this->patchJson("/api/v1/admin/contact-requests/{$request->id}/status", [
            'status' => 'reviewing',
        ])->assertOk()
            ->assertJsonMissingPath('data.projects.0.quoted_value')
            ->assertJsonMissingPath('data.projects.0.currency');
    }

    public function test_update_status_includes_financial_fields_with_view_financials(): void
    {
        $this->authAs($this->userWithPermissions(['manage_contact_requests', 'view_financials']));
        ['request' => $request] = $this->contactRequestWithProject('32000.00', 'USD');

        $this->patchJson("/api/v1/admin/contact-requests/{$request->id}/status", [
            'status' => 'contacted',
        ])->assertOk()
            ->assertJsonPath('data.projects.0.quoted_value', '32000.00')
            ->assertJsonPath('data.projects.0.currency', 'USD');
    }

    // ── linkCustomer ─────────────────────────────────────────────────

    public function test_link_customer_omits_financial_fields_without_view_financials(): void
    {
        $this->authAs($this->userWithPermissions(['manage_contact_requests', 'manage_customers']));
        ['request' => $request] = $this->contactRequestWithProject();
        $newCustomer = Customer::factory()->create();

        $this->postJson("/api/v1/admin/contact-requests/{$request->id}/link-customer", [
            'customer_id' => $newCustomer->id,
        ])->assertOk()
            ->assertJsonMissingPath('data.projects.0.quoted_value')
            ->assertJsonMissingPath('data.projects.0.currency');
    }

    // ── unlinkCustomer ───────────────────────────────────────────────

    public function test_unlink_customer_omits_financial_fields_without_view_financials(): void
    {
        $this->authAs($this->userWithPermissions(['manage_contact_requests', 'manage_customers']));
        ['request' => $request, 'customer' => $customer] = $this->contactRequestWithProject();

        $this->deleteJson("/api/v1/admin/contact-requests/{$request->id}/customer")
            ->assertOk()
            ->assertJsonMissingPath('data.projects.0.quoted_value')
            ->assertJsonMissingPath('data.projects.0.currency');
    }

    // ── linkProject ──────────────────────────────────────────────────

    public function test_link_project_omits_financial_fields_without_view_financials(): void
    {
        $this->authAs($this->userWithPermissions(['manage_contact_requests', 'manage_projects']));
        ['request' => $request, 'customer' => $customer] = $this->contactRequestWithProject();
        $extraProject = Project::factory()->create(['customer_id' => $customer->id]);

        $this->postJson("/api/v1/admin/contact-requests/{$request->id}/link-project", [
            'project_id' => $extraProject->id,
        ])->assertOk()
            ->assertJsonMissingPath('data.projects.1.quoted_value')
            ->assertJsonMissingPath('data.projects.1.currency');
    }

    // ── unlinkProject ────────────────────────────────────────────────

    public function test_unlink_project_omits_financial_fields_without_view_financials(): void
    {
        $this->authAs($this->userWithPermissions(['manage_contact_requests', 'manage_projects']));
        ['request' => $request, 'project' => $project] = $this->contactRequestWithProject();

        $this->deleteJson("/api/v1/admin/contact-requests/{$request->id}/project/{$project->id}")
            ->assertOk()
            ->assertJsonMissingPath('data.projects.0.quoted_value')
            ->assertJsonMissingPath('data.projects.0.currency');
    }
}
