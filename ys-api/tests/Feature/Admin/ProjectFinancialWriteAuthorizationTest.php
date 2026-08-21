<?php

namespace Tests\Feature\Admin;

use App\Domains\Auth\Models\Role;
use App\Domains\Auth\Models\User;
use App\Domains\Billing\Models\Customer;
use App\Domains\Operations\Models\Project;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Regression: ProjectController::store/update accepted quoted_value and
 * currency from any user with manage_projects, regardless of whether
 * the user held view_financials. A user with manage_projects but without
 * view_financials could create or overwrite financial fields via direct
 * API calls (cURL, Postman, browser DevTools). The frontend is NOT a
 * security boundary — the backend must enforce financial write
 * authorization independently.
 */
class ProjectFinancialWriteAuthorizationTest extends TestCase
{
    use RefreshDatabase;

    private function userWithPermissions(array $permissions): User
    {
        $role = Role::factory()->create([
            'slug' => 'fin_write_'.uniqid(),
            'permissions' => $permissions,
        ]);

        return User::factory()->create(['role_id' => $role->id, 'is_active' => true]);
    }

    private function authAs(User $user): void
    {
        Sanctum::actingAs($user, ['admin']);
    }

    private function customer(): Customer
    {
        return Customer::factory()->create();
    }

    // ── CREATE: manage_projects WITHOUT view_financials ───────────────

    public function test_store_ignores_quoted_value_without_view_financials(): void
    {
        $this->authAs($this->userWithPermissions(['manage_projects']));
        $customer = $this->customer();

        $response = $this->postJson('/api/v1/admin/projects', [
            'name' => 'Financial Test Project',
            'customer_id' => $customer->id,
            'quoted_value' => '999999.00',
            'currency' => 'EUR',
        ]);

        $response->assertStatus(201);

        $project = Project::first();
        $this->assertNull($project->quoted_value, 'quoted_value must be null when user lacks view_financials');
        $this->assertSame('USD', $project->currency, 'currency must default to USD when user lacks view_financials');
    }

    public function test_store_ignores_currency_without_view_financials(): void
    {
        $this->authAs($this->userWithPermissions(['manage_projects']));
        $customer = $this->customer();

        $this->postJson('/api/v1/admin/projects', [
            'name' => 'Currency Test',
            'customer_id' => $customer->id,
            'currency' => 'GBP',
        ])->assertStatus(201);

        $this->assertSame('USD', Project::first()->currency);
    }

    // ── UPDATE: manage_projects WITHOUT view_financials ───────────────

    public function test_update_ignores_quoted_value_without_view_financials(): void
    {
        $this->authAs($this->userWithPermissions(['manage_projects']));
        $project = Project::factory()->create([
            'quoted_value' => '50000.00',
            'currency' => 'USD',
        ]);

        $this->putJson("/api/v1/admin/projects/{$project->id}", [
            'name' => 'Renamed',
            'quoted_value' => '999999.00',
            'currency' => 'EUR',
        ])->assertOk();

        $this->assertSame('50000.00', $project->fresh()->quoted_value, 'quoted_value must not change without view_financials');
        $this->assertSame('USD', $project->fresh()->currency, 'currency must not change without view_financials');
    }

    public function test_update_ignores_currency_without_view_financials(): void
    {
        $this->authAs($this->userWithPermissions(['manage_projects']));
        $project = Project::factory()->create([
            'quoted_value' => '30000.00',
            'currency' => 'SAR',
        ]);

        $this->putJson("/api/v1/admin/projects/{$project->id}", [
            'name' => $project->name,
            'currency' => 'GBP',
        ])->assertOk();

        $this->assertSame('SAR', $project->fresh()->currency);
    }

    // ── CREATE: manage_projects WITH view_financials ──────────────────

    public function test_store_accepts_financial_fields_with_view_financials(): void
    {
        $this->authAs($this->userWithPermissions(['manage_projects', 'view_financials']));
        $customer = $this->customer();

        $this->postJson('/api/v1/admin/projects', [
            'name' => 'Financier Project',
            'customer_id' => $customer->id,
            'quoted_value' => '75000.00',
            'currency' => 'EUR',
        ])->assertStatus(201);

        $project = Project::first();
        $this->assertSame('75000.00', $project->quoted_value);
        $this->assertSame('EUR', $project->currency);
    }

    // ── UPDATE: manage_projects WITH view_financials ──────────────────

    public function test_update_accepts_financial_fields_with_view_financials(): void
    {
        $this->authAs($this->userWithPermissions(['manage_projects', 'view_financials']));
        $project = Project::factory()->create([
            'quoted_value' => '55000.00',
            'currency' => 'SAR',
        ]);

        $this->putJson("/api/v1/admin/projects/{$project->id}", [
            'name' => $project->name,
            'quoted_value' => '88000.00',
            'currency' => 'GBP',
        ])->assertOk();

        $this->assertSame('88000.00', $project->fresh()->quoted_value);
        $this->assertSame('GBP', $project->fresh()->currency);
    }

    // ── Super admin can always set financial fields ───────────────────

    public function test_super_admin_can_set_financial_fields(): void
    {
        $this->actingAsSuperAdmin();
        $customer = $this->customer();

        $this->postJson('/api/v1/admin/projects', [
            'name' => 'Super Admin Project',
            'customer_id' => $customer->id,
            'quoted_value' => '120000.00',
            'currency' => 'USD',
        ])->assertStatus(201);

        $project = Project::first();
        $this->assertSame('120000.00', $project->quoted_value);
        $this->assertSame('USD', $project->currency);
    }

    // ── Existing values are preserved when non-financier updates ──────

    public function test_update_preserves_existing_financial_values_when_non_financier(): void
    {
        $this->authAs($this->userWithPermissions(['manage_projects']));
        $project = Project::factory()->create([
            'quoted_value' => '42000.00',
            'currency' => 'SAR',
            'name' => 'Original Name',
        ]);

        $this->putJson("/api/v1/admin/projects/{$project->id}", [
            'name' => 'Updated Name',
        ])->assertOk();

        $fresh = $project->fresh();
        $this->assertSame('Updated Name', $fresh->name);
        $this->assertSame('42000.00', $fresh->quoted_value);
        $this->assertSame('SAR', $fresh->currency);
    }

    // ── Response omits financial fields for non-financier ─────────────

    public function test_store_response_omits_financial_fields_for_non_financier(): void
    {
        $this->authAs($this->userWithPermissions(['manage_projects']));
        $customer = $this->customer();

        $this->postJson('/api/v1/admin/projects', [
            'name' => 'No Financials Response',
            'customer_id' => $customer->id,
        ])
            ->assertStatus(201)
            ->assertJsonMissingPath('data.quoted_value')
            ->assertJsonMissingPath('data.currency');
    }
}
