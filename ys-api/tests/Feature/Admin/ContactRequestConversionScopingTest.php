<?php

namespace Tests\Feature\Admin;

use App\Domains\Auth\Models\Role;
use App\Domains\Auth\Models\User;
use App\Domains\Billing\Models\Customer;
use App\Domains\Operations\Models\ContactRequest;
use App\Domains\Product\Models\Product;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * F-001 (Phase 5A): convertCustomer must enforce the same tenant
 * accessibility assertion every other contact-request mutation enforces.
 *
 * Invariant: a scoped admin must NOT be able to convert a contact request
 * linked to a customer outside their accessible product scope, and must
 * never be able to create a global (product_id null) customer from foreign
 * tenant data. Unlinked requests stay company-global by design.
 */
class ContactRequestConversionScopingTest extends TestCase
{
    use RefreshDatabase;

    private Product $productA;

    private Product $productB;

    private function scopedAdmin(array $permissions, ?Product $granted = null): User
    {
        $role = Role::factory()->create([
            'slug' => 'convert_scoped_'.uniqid(),
            'permissions' => $permissions,
        ]);
        $user = User::factory()->create(['role_id' => $role->id, 'is_active' => true]);
        $user->products()->attach($granted->id);
        Sanctum::actingAs($user, ['admin']);

        return $user;
    }

    public function test_convert_succeeds_for_request_linked_to_accessible_product_customer(): void
    {
        $this->productA = Product::factory()->active()->create();
        $this->scopedAdmin(['manage_contact_requests', 'manage_customers'], $this->productA);

        $customer = Customer::factory()->create(['product_id' => $this->productA->id]);
        $request = ContactRequest::factory()->create([
            'customer_id' => $customer->id,
            'email' => 'own-tenant@example.com',
        ]);

        $this->postJson("/api/v1/admin/contact-requests/{$request->id}/convert-customer")
            ->assertStatus(201)
            ->assertJsonPath('success', true);

        $created = Customer::where('email', 'own-tenant@example.com')->firstOrFail();
        $this->assertSame($request->fresh()->customer_id, $created->id);
    }

    public function test_convert_rejects_request_linked_to_foreign_product_customer(): void
    {
        $this->productA = Product::factory()->active()->create();
        $this->productB = Product::factory()->active()->create();
        $this->scopedAdmin(['manage_contact_requests', 'manage_customers'], $this->productA);

        $foreignCustomer = Customer::factory()->create(['product_id' => $this->productB->id]);
        $request = ContactRequest::factory()->create([
            'customer_id' => $foreignCustomer->id,
            'email' => 'foreign-data@example.com',
        ]);

        $this->postJson("/api/v1/admin/contact-requests/{$request->id}/convert-customer")
            ->assertStatus(403);

        $this->assertDatabaseMissing('customers', ['email' => 'foreign-data@example.com']);
        $this->assertSame($foreignCustomer->id, $request->fresh()->customer_id);
    }

    public function test_convert_foreign_request_never_creates_a_global_customer(): void
    {
        $this->productA = Product::factory()->active()->create();
        $this->productB = Product::factory()->active()->create();
        $this->scopedAdmin(['manage_contact_requests', 'manage_customers'], $this->productA);

        $foreignCustomer = Customer::factory()->create(['product_id' => $this->productB->id]);
        $request = ContactRequest::factory()->create([
            'customer_id' => $foreignCustomer->id,
            'email' => 'foreign-data@example.com',
        ]);

        $this->postJson("/api/v1/admin/contact-requests/{$request->id}/convert-customer")
            ->assertStatus(403);

        $this->assertDatabaseMissing('customers', [
            'email' => 'foreign-data@example.com',
            'product_id' => null,
        ]);
        $this->assertSame(0, Customer::where('product_id', null)->count());
    }

    public function test_convert_still_allowed_for_unlinked_company_global_request(): void
    {
        $this->productA = Product::factory()->active()->create();
        $this->scopedAdmin(['manage_contact_requests', 'manage_customers'], $this->productA);

        $request = ContactRequest::factory()->create([
            'customer_id' => null,
            'email' => 'unlinked-global@example.com',
        ]);

        $this->postJson("/api/v1/admin/contact-requests/{$request->id}/convert-customer")
            ->assertStatus(201)
            ->assertJsonPath('success', true);

        $this->assertDatabaseHas('customers', ['email' => 'unlinked-global@example.com']);
    }

    public function test_convert_keeps_existing_permission_denials(): void
    {
        $this->productA = Product::factory()->active()->create();
        $this->scopedAdmin(['manage_contact_requests'], $this->productA);

        $request = ContactRequest::factory()->create(['email' => 'no-permission@example.com']);

        $this->postJson("/api/v1/admin/contact-requests/{$request->id}/convert-customer")
            ->assertStatus(403);

        $this->assertDatabaseMissing('customers', ['email' => 'no-permission@example.com']);
    }
}
