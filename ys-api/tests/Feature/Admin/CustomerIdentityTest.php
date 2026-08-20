<?php

namespace Tests\Feature\Admin;

use App\Domains\Billing\Models\Customer;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CustomerIdentityTest extends TestCase
{
    use RefreshDatabase;

    public function test_customer_email_is_canonicalized_on_create(): void
    {
        $this->actingAsSuperAdmin();

        $this->postJson('/api/v1/admin/customers', [
            'name' => 'Layered Customer',
            'email' => '  MixedCase@Example.com ',
            'type' => 'individual',
        ])->assertStatus(201);

        $this->assertDatabaseHas('customers', ['email' => 'mixedcase@example.com']);
        $this->assertDatabaseMissing('customers', ['email' => 'MixedCase@Example.com']);
    }

    public function test_customer_email_is_canonicalized_on_update(): void
    {
        $this->actingAsSuperAdmin();
        $customer = Customer::factory()->create(['email' => 'before@example.com']);

        $this->patchJson("/api/v1/admin/customers/{$customer->id}", [
            'email' => 'UPDATED@Example.com',
        ])->assertStatus(200);

        $this->assertDatabaseHas('customers', ['email' => 'updated@example.com']);
    }

    public function test_duplicate_emails_with_different_case_are_rejected(): void
    {
        $this->actingAsSuperAdmin();
        Customer::factory()->create(['email' => 'taken@example.com']);

        $this->postJson('/api/v1/admin/customers', [
            'name' => 'Duplicate Attempt',
            'email' => 'TAKEN@Example.com',
            'type' => 'individual',
        ])->assertStatus(422);
    }
}
