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
 * VULN-10 follow-up: the project payload leaked quoted_value/currency to
 * every view_projects holder. The API must omit those keys entirely unless
 * the caller holds view_financials (or the super-admin bypass applies).
 * This pins the fixed contract across index, show, update and updateStatus.
 */
class ProjectFinancialVisibilityTest extends TestCase
{
    use RefreshDatabase;

    private function userWithPermissions(array $permissions): User
    {
        $role = Role::factory()->create([
            'slug' => 'fin_'.uniqid(),
            'permissions' => $permissions,
        ]);

        return User::factory()->create(['role_id' => $role->id, 'is_active' => true]);
    }

    private function authAs(User $user): void
    {
        Sanctum::actingAs($user, ['admin']);
    }

    private function projectWithValue(string $value = '125000.00', string $currency = 'USD'): Project
    {
        $customer = Customer::factory()->create();

        return Project::factory()->create([
            'customer_id' => $customer->id,
            'quoted_value' => $value,
            'currency' => $currency,
        ]);
    }

    public function test_view_only_admin_receives_no_financial_fields_on_index(): void
    {
        $this->authAs($this->userWithPermissions(['view_projects']));
        $this->projectWithValue();

        $this->getJson('/api/v1/admin/projects')
            ->assertOk()
            ->assertJsonMissingPath('data.0.quoted_value')
            ->assertJsonMissingPath('data.0.currency')
            ->assertJsonPath('data.0.name', Project::first()->name);
    }

    public function test_view_only_admin_receives_no_financial_fields_on_show(): void
    {
        $this->authAs($this->userWithPermissions(['view_projects']));
        $project = $this->projectWithValue();

        $this->getJson("/api/v1/admin/projects/{$project->id}")
            ->assertOk()
            ->assertJsonMissingPath('data.quoted_value')
            ->assertJsonMissingPath('data.currency');
    }

    public function test_manage_only_admin_update_omits_financials_and_preserves_stored_values(): void
    {
        $this->authAs($this->userWithPermissions(['manage_projects']));
        $project = $this->projectWithValue('48500.00');

        $this->putJson("/api/v1/admin/projects/{$project->id}", ['name' => 'Renamed'])
            ->assertOk()
            ->assertJsonPath('data.name', 'Renamed')
            ->assertJsonMissingPath('data.quoted_value')
            ->assertJsonMissingPath('data.currency');

        // A manager without view_financials must not corrupt stored values —
        // the record still carries its original financials.
        $this->assertSame('48500.00', $project->fresh()->quoted_value);
        $this->assertSame('USD', $project->fresh()->currency);
    }

    public function test_manage_only_admin_status_update_omits_financials(): void
    {
        $this->authAs($this->userWithPermissions(['manage_projects']));
        $project = $this->projectWithValue();

        $this->patchJson("/api/v1/admin/projects/{$project->id}/status", ['status' => 'on_hold'])
            ->assertOk()
            ->assertJsonMissingPath('data.quoted_value')
            ->assertJsonMissingPath('data.currency');
    }

    public function test_financier_receives_financial_fields_on_index_and_show(): void
    {
        $this->authAs($this->userWithPermissions(['view_projects', 'view_financials']));
        $project = $this->projectWithValue('125000.00');

        $this->getJson('/api/v1/admin/projects')
            ->assertOk()
            ->assertJsonPath('data.0.quoted_value', '125000.00')
            ->assertJsonPath('data.0.currency', 'USD');

        $this->getJson("/api/v1/admin/projects/{$project->id}")
            ->assertOk()
            ->assertJsonPath('data.quoted_value', '125000.00')
            ->assertJsonPath('data.currency', 'USD');
    }

    public function test_super_admin_receives_financial_fields(): void
    {
        $this->actingAsSuperAdmin();
        $project = $this->projectWithValue('125000.00');

        $this->getJson("/api/v1/admin/projects/{$project->id}")
            ->assertOk()
            ->assertJsonPath('data.quoted_value', '125000.00')
            ->assertJsonPath('data.currency', 'USD');
    }
}
