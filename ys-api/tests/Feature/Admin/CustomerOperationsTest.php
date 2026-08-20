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

class CustomerOperationsTest extends TestCase
{
    use RefreshDatabase;

    private function scopedUser(array $permissions): User
    {
        $role = Role::factory()->create([
            'slug' => 'scoped_'.uniqid(),
            'permissions' => $permissions,
        ]);

        return User::factory()->create([
            'role_id' => $role->id,
            'is_active' => true,
        ]);
    }

    private function actingAsScoped(array $permissions): User
    {
        $user = $this->scopedUser($permissions);
        Sanctum::actingAs($user, ['admin']);

        return $user;
    }

    // ── Authorization (3 levels) ─────────────────────────────────────

    public function test_unauthenticated_user_cannot_access_customers(): void
    {
        $this->getJson('/api/v1/admin/customers')->assertStatus(401);
        $this->postJson('/api/v1/admin/customers', ['name' => 'X', 'email' => 'x@test.com'])->assertStatus(401);
    }

    public function test_admin_without_permissions_cannot_view_or_manage_customers(): void
    {
        $this->actingAsScoped(['manage_products']);

        $this->getJson('/api/v1/admin/customers')->assertStatus(403);

        $response = $this->postJson('/api/v1/admin/customers', [
            'name' => 'Test Corp',
            'email' => 'corp@test.com',
        ]);
        $response->assertStatus(403);
    }

    public function test_view_only_admin_can_read_but_not_manage(): void
    {
        $this->actingAsScoped(['view_customers']);
        Customer::factory()->count(2)->create();

        $this->getJson('/api/v1/admin/customers')->assertStatus(200);
        $this->getJson('/api/v1/admin/customers/'.Customer::first()->id)->assertStatus(200);

        $this->postJson('/api/v1/admin/customers', ['name' => 'X', 'email' => 'x@test.com'])->assertStatus(403);
        Customer::factory()->create();
        $customer = Customer::first();
        $this->patchJson('/api/v1/admin/customers/'.$customer->id, ['name' => 'Renamed'])->assertStatus(403);
    }

    public function test_super_admin_can_create_customer_with_business_fields(): void
    {
        $this->actingAsSuperAdmin();

        $response = $this->postJson('/api/v1/admin/customers', [
            'type' => 'company',
            'name' => 'Acme Ltd',
            'email' => 'acme@example.com',
            'company' => 'Acme Ltd',
            'phone' => '+1 555 0100',
            'whatsapp' => '+1 555 0199',
            'notes' => 'Introduced via website',
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.type', 'company')
            ->assertJsonPath('data.whatsapp', '+1 555 0199')
            ->assertJsonPath('data.status', 'active');

        $this->assertDatabaseHas('customers', ['email' => 'acme@example.com']);
    }

    public function test_customer_type_and_status_are_validated(): void
    {
        $this->actingAsSuperAdmin();

        $this->postJson('/api/v1/admin/customers', [
            'name' => 'X',
            'email' => 'x@test.com',
            'type' => 'partnership',
        ])->assertStatus(422);

        $customer = Customer::factory()->create();
        $this->patchJson("/api/v1/admin/customers/{$customer->id}", ['type' => 'guild'])
            ->assertStatus(422);
    }

    // ── Search / filters / pagination ─────────────────────────────────

    public function test_customers_index_supports_search_type_filter_and_pagination(): void
    {
        $this->actingAsSuperAdmin();
        Customer::factory()->count(25)->create(['type' => Customer::TYPE_COMPANY]);
        Customer::factory()->create([
            'name' => 'Zebra Consulting',
            'email' => 'zebra@example.com',
            'type' => Customer::TYPE_COMPANY,
        ]);
        Customer::factory()->create([
            'name' => 'Lone Wolf',
            'email' => 'wolf@example.com',
            'type' => Customer::TYPE_INDIVIDUAL,
            'status' => Customer::STATUS_ARCHIVED,
        ]);

        $this->getJson('/api/v1/admin/customers?search=zebra')
            ->assertStatus(200)
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.name', 'Zebra Consulting');

        $this->getJson('/api/v1/admin/customers?type=individual')
            ->assertStatus(200)
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('meta.total', 1);

        $this->getJson('/api/v1/admin/customers?status=archived')
            ->assertStatus(200)
            ->assertJsonPath('meta.total', 1);

        $this->getJson('/api/v1/admin/customers?per_page=10')
            ->assertStatus(200)
            ->assertJsonPath('meta.per_page', 10)
            ->assertJsonCount(10, 'data');
    }

    // ── Status lifecycle & audit ─────────────────────────────────────

    public function test_status_update_archives_customer_and_audits(): void
    {
        $this->actingAsSuperAdmin();
        $customer = Customer::factory()->create(['status' => Customer::STATUS_ACTIVE]);

        $this->patchJson("/api/v1/admin/customers/{$customer->id}/status", ['status' => Customer::STATUS_ARCHIVED])
            ->assertStatus(200)
            ->assertJsonPath('data.status', 'archived');

        $this->assertDatabaseHas('audit_logs', [
            'action' => 'customer.status_updated',
            'resource_type' => 'Customer',
            'resource_id' => $customer->id,
        ]);

        $this->patchJson("/api/v1/admin/customers/{$customer->id}/status", ['status' => 'gone'])
            ->assertStatus(422);
    }

    // ── Deleting while referenced ────────────────────────────────────

    public function test_customer_with_projects_or_subscriptions_cannot_be_deleted(): void
    {
        $this->actingAsSuperAdmin();

        $withProject = Customer::factory()->create();
        Project::factory()->create(['customer_id' => $withProject->id]);

        $this->deleteJson("/api/v1/admin/customers/{$withProject->id}")
            ->assertStatus(422);
        $this->assertDatabaseHas('customers', ['id' => $withProject->id]);

        $clean = Customer::factory()->create();
        $this->deleteJson("/api/v1/admin/customers/{$clean->id}")
            ->assertStatus(200);
        $this->assertDatabaseMissing('customers', ['id' => $clean->id]);
    }

    public function test_customer_mutations_are_audited(): void
    {
        $this->actingAsSuperAdmin();

        $customer = Customer::factory()->raw();
        $this->postJson('/api/v1/admin/customers', $customer)
            ->assertStatus(201)
            ->assertJsonPath('data.status', 'active');

        $id = Customer::where('email', $customer['email'])->value('id');
        $this->patchJson("/api/v1/admin/customers/{$id}", ['phone' => '111'])
            ->assertStatus(200);

        $this->assertDatabaseHas('audit_logs', ['action' => 'customer.created', 'resource_id' => $id]);
        $this->assertDatabaseHas('audit_logs', ['action' => 'customer.updated', 'resource_id' => $id]);
    }

    // ── Customer 360 (permission-gated sections) ─────────────────────

    public function test_customer_show_sections_are_permission_gated(): void
    {
        $customer = Customer::factory()->create();
        ContactRequest::factory()->create(['customer_id' => $customer->id, 'status' => 'new', 'name' => 'Fresh Inquiry']);
        Project::factory()->create([
            'customer_id' => $customer->id,
            'status' => Project::STATUS_ACTIVE,
            'quoted_value' => 5000,
            'currency' => 'USD',
        ]);

        // Full access: overview counts, recorded value, request history.
        $this->actingAsScoped(['view_customers', 'manage_contact_requests', 'view_projects', 'view_financials']);
        $this->getJson("/api/v1/admin/customers/{$customer->id}")
            ->assertStatus(200)
            ->assertJsonPath('data.projects_count', 1)
            ->assertJsonPath('data.active_projects_count', 1)
            ->assertJsonPath('data.value_by_currency.0.currency', 'USD')
            ->assertJsonPath('data.value_by_currency.0.total', '5000.00')
            ->assertJsonPath('data.latest_contact_requests.0.name', 'Fresh Inquiry');

        // Viewer without project access never sees commercial value.
        $this->actingAsScoped(['view_customers', 'manage_contact_requests']);
        $this->getJson("/api/v1/admin/customers/{$customer->id}")
            ->assertStatus(200)
            ->assertJsonMissingPath('data.value_by_currency')
            ->assertJsonPath('data.projects_count', 1);

        // Viewer without request access never sees request history.
        $this->actingAsScoped(['view_customers', 'view_projects']);
        $this->getJson("/api/v1/admin/customers/{$customer->id}")
            ->assertStatus(200)
            ->assertJsonMissingPath('data.latest_contact_requests');
    }

    // ── No public exposure ───────────────────────────────────────────

    public function test_customers_are_never_exposed_through_public_api(): void
    {
        $this->actingAsSuperAdmin();
        Customer::factory()->create(['name' => 'Secret Client', 'email' => 'secret@client.com']);

        foreach (['/api/v1/public/products', '/api/v1/public/services', '/api/v1/public/faqs'] as $publicRoute) {
            $this->getJson($publicRoute)
                ->assertStatus(200)
                ->assertJsonMissing(['email' => 'secret@client.com']);
        }

        $this->getJson('/api/v1/health')->assertJsonMissing(['secret']);
    }
}
