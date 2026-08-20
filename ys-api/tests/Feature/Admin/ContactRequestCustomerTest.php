<?php

namespace Tests\Feature\Admin;

use App\Domains\Auth\Models\Role;
use App\Domains\Auth\Models\User;
use App\Domains\Billing\Models\Customer;
use App\Domains\Operations\Models\ContactRequest;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ContactRequestCustomerTest extends TestCase
{
    use RefreshDatabase;

    private function actingAsScoped(array $permissions): User
    {
        $role = Role::factory()->create([
            'slug' => 'scoped_'.uniqid(),
            'permissions' => $permissions,
        ]);
        $user = User::factory()->create(['role_id' => $role->id, 'is_active' => true]);
        Sanctum::actingAs($user, ['admin']);

        return $user;
    }

    public function test_convert_creates_customer_and_links_request(): void
    {
        $this->actingAsSuperAdmin();
        $request = ContactRequest::factory()->create([
            'name' => 'Nadia Salim',
            'email' => 'nadia@example.com',
            'company_name' => 'Nadia Studio',
            'phone' => '+961 70 123 456',
            'contact_preference' => 'whatsapp',
        ]);

        $response = $this->postJson("/api/v1/admin/contact-requests/{$request->id}/convert-customer");

        $response->assertStatus(201)
            ->assertJsonPath('success', true);

        $customer = Customer::where('email', 'nadia@example.com')->firstOrFail();
        $this->assertSame('Nadia Salim', $customer->name);
        $this->assertSame('company', $customer->type);
        $this->assertSame('Nadia Studio', $customer->company);
        $this->assertSame('+961 70 123 456', $customer->whatsapp);
        $this->assertSame($customer->id, $request->fresh()->customer_id);

        $this->assertDatabaseHas('audit_logs', ['action' => 'contact_request.customer_converted']);
        $this->assertDatabaseHas('audit_logs', ['action' => 'customer.created']);
    }

    public function test_convert_refuses_duplicate_email_without_creating_duplicate(): void
    {
        $this->actingAsSuperAdmin();
        Customer::factory()->create(['email' => 'existing@example.com']);
        $request = ContactRequest::factory()->create(['email' => 'existing@example.com']);

        $response = $this->postJson("/api/v1/admin/contact-requests/{$request->id}/convert-customer");

        $response->assertStatus(422);
        $this->assertSame(1, Customer::where('email', 'existing@example.com')->count());
        $this->assertNull($request->fresh()->customer_id);
    }

    public function test_admin_can_link_request_to_existing_customer_and_unlink(): void
    {
        $this->actingAsSuperAdmin();
        $request = ContactRequest::factory()->create();
        $customer = Customer::factory()->create();

        $this->postJson("/api/v1/admin/contact-requests/{$request->id}/link-customer", [
            'customer_id' => $customer->id,
        ])->assertStatus(200)
            ->assertJsonPath('success', true);

        $this->assertSame($customer->id, $request->fresh()->customer_id);
        $this->assertDatabaseHas('audit_logs', ['action' => 'contact_request.customer_linked']);

        $this->deleteJson("/api/v1/admin/contact-requests/{$request->id}/customer")
            ->assertStatus(200);

        $this->assertNull($request->fresh()->customer_id);
        $this->assertDatabaseHas('audit_logs', ['action' => 'contact_request.customer_unlinked']);
    }

    public function test_convert_normalizes_email_to_lowercase(): void
    {
        $this->actingAsSuperAdmin();
        $request = ContactRequest::factory()->create([
            'email' => 'Nadia.Salim@Example.com',
        ]);

        $this->postJson("/api/v1/admin/contact-requests/{$request->id}/convert-customer")
            ->assertStatus(201);

        $this->assertDatabaseHas('customers', ['email' => 'nadia.salim@example.com']);
        $this->assertDatabaseMissing('customers', ['email' => 'Nadia.Salim@Example.com']);
    }

    public function test_convert_treats_existing_customer_emails_case_insensitively(): void
    {
        $this->actingAsSuperAdmin();
        Customer::factory()->create(['email' => 'existing@example.com']);
        $request = ContactRequest::factory()->create(['email' => 'Existing@EXAMPLE.com']);

        $this->postJson("/api/v1/admin/contact-requests/{$request->id}/convert-customer")
            ->assertStatus(422);

        $this->assertSame(1, Customer::count());
        $this->assertNull($request->fresh()->customer_id);
    }

    public function test_link_customer_requires_both_request_and_customer_permissions(): void
    {
        $this->actingAsScoped(['manage_contact_requests']);
        $request = ContactRequest::factory()->create();
        $customer = Customer::factory()->create();

        // manage_contact_requests without manage_customers → denied
        $this->postJson("/api/v1/admin/contact-requests/{$request->id}/link-customer", [
            'customer_id' => $customer->id,
        ])->assertStatus(403);
        $this->assertNull($request->fresh()->customer_id);

        // no permissions at all → denied
        $this->actingAsScoped(['manage_products']);
        $this->postJson("/api/v1/admin/contact-requests/{$request->id}/convert-customer")
            ->assertStatus(403);
    }

    public function test_link_requires_a_real_customer(): void
    {
        $this->actingAsSuperAdmin();
        $request = ContactRequest::factory()->create();

        $this->postJson("/api/v1/admin/contact-requests/{$request->id}/link-customer", [
            'customer_id' => '00000000-0000-0000-0000-000000000000',
        ])->assertStatus(422);
    }

    public function test_request_show_includes_linked_customer_snapshot(): void
    {
        $this->actingAsSuperAdmin();
        $customer = Customer::factory()->create(['name' => 'Linked Client']);
        $request = ContactRequest::factory()->create(['customer_id' => $customer->id]);

        $this->getJson("/api/v1/admin/contact-requests/{$request->id}")
            ->assertStatus(200)
            ->assertJsonPath('data.customer_id', $customer->id);
    }
}
