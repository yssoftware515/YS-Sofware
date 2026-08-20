<?php

namespace Tests\Feature\Admin;

use App\Domains\Auth\Models\Role;
use App\Domains\Auth\Models\User;
use App\Domains\Billing\Models\Customer;
use App\Domains\Operations\Models\ContactRequest;
use App\Domains\Product\Models\Product;
use App\Domains\System\Models\AuditLog;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * F-003 (Phase 5A): audit logs are tenant-scoped through the product
 * anchor captured at write time. Product-scoped view_audit_logs holders
 * only see events of products they can access (plus global/system
 * events); super admins see everything. No filter can widen the scope.
 */
class AuditLogScopingTest extends TestCase
{
    use RefreshDatabase;

    private Product $productA;

    private Product $productB;

    private User $scopedAdmin;

    private User $superAdmin;

    protected function setUp(): void
    {
        parent::setUp();

        $this->productA = Product::factory()->active()->create();
        $this->productB = Product::factory()->active()->create();

        $role = Role::factory()->create([
            'slug' => 'audit_scoped_'.uniqid(),
            'permissions' => ['view_audit_logs'],
        ]);
        $this->scopedAdmin = User::factory()->create(['role_id' => $role->id, 'is_active' => true]);
        $this->scopedAdmin->products()->attach($this->productA->id);

        $this->superAdmin = User::factory()->create([
            'role_id' => Role::factory()->create(['slug' => 'audit_root_'.uniqid(), 'permissions' => ['*']])->id,
            'is_active' => true,
        ]);
    }

    private function loginScoped(): void
    {
        Sanctum::actingAs($this->scopedAdmin, ['admin']);
    }

    private function loginSuper(): void
    {
        Sanctum::actingAs($this->superAdmin, ['admin']);
    }

    // ── Write path: product anchor resolution ─────────────────────────

    public function test_customer_creation_stamps_the_product_anchor(): void
    {
        $this->loginSuper();
        $customer = $this->postJson('/api/v1/admin/customers', [
            'name' => 'Anchored',
            'email' => 'anchored@example.com',
            'product_id' => $this->productA->id,
        ])->assertCreated()->json('data');

        $this->assertDatabaseHas('audit_logs', [
            'resource_type' => 'Customer',
            'resource_id' => $customer['id'],
            'product_id' => $this->productA->id,
        ]);
    }

    public function test_global_customer_creation_stays_company_wide(): void
    {
        $this->loginSuper();
        $customer = $this->postJson('/api/v1/admin/customers', [
            'name' => 'Company Wide',
            'email' => 'company-wide@example.com',
        ])->assertCreated()->json('data');

        $this->assertDatabaseHas('audit_logs', [
            'resource_type' => 'Customer',
            'resource_id' => $customer['id'],
            'product_id' => null,
        ]);
    }

    public function test_unlinked_contact_request_events_stay_global(): void
    {
        $this->loginSuper();
        $request = ContactRequest::factory()->create(['customer_id' => null]);

        $this->patchJson("/api/v1/admin/contact-requests/{$request->id}/status", [
            'status' => 'reviewing',
        ])->assertOk();

        $this->assertDatabaseHas('audit_logs', [
            'action' => 'contact_request.status_updated',
            'resource_id' => $request->id,
            'product_id' => null,
        ]);
    }

    public function test_project_events_resolve_product_through_the_customer_anchor(): void
    {
        $this->loginSuper();
        $customer = Customer::factory()->create(['product_id' => $this->productB->id]);

        $project = $this->postJson('/api/v1/admin/projects', [
            'name' => 'Anchored project',
            'customer_id' => $customer->id,
        ])->assertCreated()->json('data');

        $this->assertDatabaseHas('audit_logs', [
            'resource_type' => 'Project',
            'resource_id' => $project['id'],
            'product_id' => $this->productB->id,
        ]);
    }

    // ── Read path: index scoping ─────────────────────────────────────

    public function test_scoped_admin_sees_own_product_and_global_events_only(): void
    {
        $this->loginScoped();

        AuditLog::factory()->create(['action' => 'customer.created', 'product_id' => $this->productA->id]);
        AuditLog::factory()->create(['action' => 'customer.created', 'product_id' => $this->productB->id]);
        AuditLog::factory()->create(['action' => 'setting.updated', 'product_id' => null]);

        $response = $this->getJson('/api/v1/admin/audit-logs')->assertOk();

        $actions = collect($response->json('data'))->pluck('action');
        $this->assertContains('customer.created', $actions);
        $this->assertTrue(
            $actions->contains('setting.updated'),
            'Global/system events stay visible to scoped admins (company-level convention).'
        );
        // productA.created (setUp) + setting.updated + own customer.created
        $this->assertSame(3, $response->json('meta.total'));
    }

    public function test_scoped_admin_cannot_see_foreign_product_events(): void
    {
        $this->loginScoped();
        $foreign = AuditLog::factory()->create(['product_id' => $this->productB->id]);
        AuditLog::factory()->create(['product_id' => $this->productA->id]);

        $response = $this->getJson('/api/v1/admin/audit-logs')->assertOk();

        $rowIds = collect($response->json('data'))->pluck('id');
        $this->assertNotContains($foreign->id, $rowIds);
    }

    public function test_super_admin_sees_all_events(): void
    {
        $this->loginSuper();
        $foreign = AuditLog::factory()->create(['product_id' => $this->productB->id]);

        $response = $this->getJson('/api/v1/admin/audit-logs')->assertOk();

        $this->assertContains(
            $foreign->id,
            collect($response->json('data'))->pluck('id')->all()
        );
    }

    public function test_scoped_admin_without_view_audit_logs_is_forbidden(): void
    {
        $role = Role::factory()->create(['slug' => 'no_audit_'.uniqid(), 'permissions' => ['view_customers']]);
        $user = User::factory()->create(['role_id' => $role->id, 'is_active' => true]);
        $user->products()->attach($this->productA->id);
        Sanctum::actingAs($user, ['admin']);

        $this->getJson('/api/v1/admin/audit-logs')->assertStatus(403);
    }

    public function test_pagination_and_count_stay_scoped(): void
    {
        $this->loginScoped();

        AuditLog::factory()->count(3)->create(['product_id' => $this->productA->id]);
        AuditLog::factory()->count(5)->create(['product_id' => $this->productB->id]);

        $response = $this->getJson('/api/v1/admin/audit-logs?per_page=2')->assertOk();

        $meta = $response->json('meta');
        $this->assertSame(2, $meta['per_page']);
        $this->assertSame(1, $meta['current_page']);
        // productA.created (setUp) + 3 own customer events
        $this->assertSame(4, $meta['total'], 'Count must reflect only accessible product events.');
        $this->assertCount(2, $response->json('data'));
    }

    public function test_filters_cannot_widen_the_scope(): void
    {
        $this->loginScoped();

        AuditLog::factory()->create(['product_id' => $this->productB->id, 'user_id' => $this->superAdmin->id]);
        $own = AuditLog::factory()->create(['product_id' => $this->productA->id, 'user_id' => $this->superAdmin->id]);

        // user_id filter of the foreign actor: scoped admin must only get
        // the events within their scope, none of the foreign ones.
        $response = $this->getJson('/api/v1/admin/audit-logs?user_id='.$this->superAdmin->id)->assertOk();
        $rowIds = collect($response->json('data'))->pluck('id')->all();
        $this->assertContains($own->id, $rowIds);
        $this->assertSame(1, $response->json('meta.total'));
    }

    public function test_dashboard_audit_metrics_stay_scoped(): void
    {
        $this->loginScoped();

        AuditLog::factory()->count(2)->create(['product_id' => $this->productA->id]);
        AuditLog::factory()->count(4)->create(['product_id' => $this->productB->id]);

        $response = $this->getJson('/api/v1/admin/dashboard/stats')->assertOk();

        // productA.created (setUp) + 2 own customer events — foreign ones invisible
        $this->assertSame(3, $response->json('data.counts.audit_logs'));

        $recentProducts = collect($response->json('data.recent_audit_logs'))->pluck('product_id')->unique();
        $this->assertNotContains($this->productB->id, $recentProducts);
    }

    public function test_global_admin_dashboard_count_covers_everything(): void
    {
        $this->loginSuper();

        AuditLog::factory()->count(2)->create(['product_id' => $this->productA->id]);
        AuditLog::factory()->count(4)->create(['product_id' => $this->productB->id]);

        $this->getJson('/api/v1/admin/dashboard/stats')
            ->assertOk()
            // 2 product.created (setUp) + 6 created here
            ->assertJsonPath('data.counts.audit_logs', 8);
    }
}
