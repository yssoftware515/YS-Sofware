<?php

namespace Tests\Feature\Admin;

use App\Domains\Auth\Models\Role;
use App\Domains\Auth\Models\User;
use App\Domains\Billing\Models\Customer;
use App\Domains\Billing\Models\Subscription;
use App\Domains\Product\Models\Product;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Subscription write-path contract: authorization, validation, decimal
 * money (strings only, no float anywhere), product-scoping, status
 * handling, and the deliberately absent dashboard aggregates.
 */
class SubscriptionTest extends TestCase
{
    use RefreshDatabase;

    private function createSubscription(
        string $plan = 'Pro',
        string $price = '1500.00',
        string $currency = 'USD',
        string $cycle = 'yearly',
        string $status = 'active',
    ): array {
        $customer = Customer::factory()->create();
        $product = Product::factory()->active()->create();

        return [
            'customer_id' => $customer->id,
            'product_id' => $product->id,
            'plan_name' => $plan,
            'price' => $price,
            'currency' => $currency,
            'billing_cycle' => $cycle,
            'starts_at' => '2026-01-01',
            'status' => $status,
        ];
    }

    private function actingAsScoped(array $permissions): User
    {
        $role = Role::factory()->create([
            'slug' => 'subscription_'.uniqid(),
            'permissions' => $permissions,
        ]);
        $user = User::factory()->create(['role_id' => $role->id, 'is_active' => true]);
        Sanctum::actingAs($user, ['admin']);

        return $user;
    }

    // ── Write path ────────────────────────────────────────────────────

    public function test_super_admin_can_create_and_money_stays_decimal_strings(): void
    {
        $this->actingAsSuperAdmin();
        $payload = $this->createSubscription();

        $this->postJson('/api/v1/admin/subscriptions', $payload)
            ->assertStatus(201)
            ->assertJsonPath('data.price', '1500.00')
            ->assertJsonPath('data.monthly_equivalent', '125.00')
            ->assertJsonPath('data.currency', 'USD')
            ->assertJsonPath('data.billing_cycle', 'yearly')
            ->assertJsonPath('data.status', 'active');

        $this->assertDatabaseHas('subscriptions', [
            'customer_id' => $payload['customer_id'],
            'product_id' => $payload['product_id'],
            'price' => '1500.00',
        ]);
        $this->assertDatabaseHas('audit_logs', ['action' => 'subscription.created', 'resource_type' => 'Subscription']);
    }

    public function test_monthly_equivalents_are_exact_decimal_strings(): void
    {
        $this->actingAsSuperAdmin();

        $cases = [
            ['100.00', 'monthly', '100.00'],
            ['100.00', 'quarterly', '33.33'],
            ['600.00', 'biannual', '100.00'],
            ['120.00', 'yearly', '10.00'],
            ['0.01', 'yearly', '0.00'],
        ];

        foreach ($cases as [$price, $cycle, $expected]) {
            $this->postJson('/api/v1/admin/subscriptions', $this->createSubscription(price: $price, cycle: $cycle))
                ->assertStatus(201)
                ->assertJsonPath('data.price', $price)
                ->assertJsonPath('data.monthly_equivalent', $expected);
        }
    }

    public function test_create_rejects_unknown_billing_cycle_and_status(): void
    {
        $this->actingAsSuperAdmin();

        $this->postJson('/api/v1/admin/subscriptions', $this->createSubscription(cycle: 'weekly'))
            ->assertStatus(422)
            ->assertJsonValidationErrors('billing_cycle');

        $this->postJson('/api/v1/admin/subscriptions', $this->createSubscription(status: 'paused'))
            ->assertStatus(422)
            ->assertJsonValidationErrors('status');
    }

    public function test_create_rejects_money_out_of_schema_precision(): void
    {
        $this->actingAsSuperAdmin();

        $this->postJson('/api/v1/admin/subscriptions', $this->createSubscription(price: '99.999'))
            ->assertStatus(422)
            ->assertJsonValidationErrors('price');

        $this->postJson('/api/v1/admin/subscriptions', $this->createSubscription(price: '-5'))
            ->assertStatus(422)
            ->assertJsonValidationErrors('price');
    }

    public function test_create_rejects_ends_at_before_starts_at(): void
    {
        $this->actingAsSuperAdmin();
        $payload = $this->createSubscription();
        $payload['ends_at'] = '2025-12-31';

        $this->postJson('/api/v1/admin/subscriptions', $payload)
            ->assertStatus(422)
            ->assertJsonValidationErrors('ends_at');
    }

    public function test_without_manage_subscriptions_permission_mutation_is_forbidden(): void
    {
        $this->actingAsScoped(['view_projects']);

        $this->postJson('/api/v1/admin/subscriptions', $this->createSubscription())
            ->assertStatus(403);

        $this->getJson('/api/v1/admin/subscriptions')
            ->assertStatus(403);
    }

    public function test_product_scoped_admin_without_access_row_cannot_create(): void
    {
        $this->actingAsScoped(['manage_subscriptions', 'view_projects']);

        $this->postJson('/api/v1/admin/subscriptions', $this->createSubscription())
            ->assertStatus(403);
    }

    public function test_product_scoped_admin_only_sees_their_products_subscriptions(): void
    {
        $user = $this->actingAsScoped(['manage_subscriptions', 'view_projects']);

        $customer = Customer::factory()->create();
        $mine = Product::factory()->active()->create();
        $theirs = Product::factory()->active()->create();
        $user->products()->attach($mine->id);

        Subscription::factory()->create(['customer_id' => $customer->id, 'product_id' => $mine->id, 'price' => '50.00']);
        Subscription::factory()->create(['customer_id' => $customer->id, 'product_id' => $theirs->id, 'price' => '99.00']);

        $this->getJson('/api/v1/admin/subscriptions')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.product.id', $mine->id);
    }

    public function test_product_scoped_access_to_the_product_is_enforced_on_create(): void
    {
        $user = $this->actingAsScoped(['manage_subscriptions', 'view_projects']);
        $customer = Customer::factory()->create();
        $product = Product::factory()->active()->create();
        $user->products()->attach($product->id);

        $payload = $this->createSubscription();
        $payload['customer_id'] = $customer->id;
        $payload['product_id'] = $product->id;

        $this->postJson('/api/v1/admin/subscriptions', $payload)
            ->assertStatus(201)
            ->assertJsonPath('data.product.id', $product->id);
    }

    public function test_product_scoped_admin_cannot_create_subscription_for_another_products_customer(): void
    {
        $user = $this->actingAsScoped(['manage_subscriptions', 'view_projects']);
        $mine = Product::factory()->active()->create();
        $theirs = Product::factory()->active()->create();
        $user->products()->attach($mine->id);

        // The customer is anchored to a product the actor cannot access —
        // creating a subscription would smuggle another tenant's customer
        // data into the actor's scope.
        $foreignCustomer = Customer::factory()->create(['product_id' => $theirs->id]);

        $payload = $this->createSubscription();
        $payload['customer_id'] = $foreignCustomer->id;
        $payload['product_id'] = $mine->id;

        $this->postJson('/api/v1/admin/subscriptions', $payload)
            ->assertStatus(403);

        $this->assertDatabaseCount('subscriptions', 0);
    }

    public function test_product_scoped_admin_can_create_subscription_for_their_own_products_customer(): void
    {
        $user = $this->actingAsScoped(['manage_subscriptions', 'view_projects']);
        $mine = Product::factory()->active()->create();
        $user->products()->attach($mine->id);

        $ownCustomer = Customer::factory()->create(['product_id' => $mine->id]);

        $payload = $this->createSubscription();
        $payload['customer_id'] = $ownCustomer->id;
        $payload['product_id'] = $mine->id;

        $this->postJson('/api/v1/admin/subscriptions', $payload)
            ->assertStatus(201)
            ->assertJsonPath('data.customer.id', $ownCustomer->id);
    }

    // ── Update path ───────────────────────────────────────────────────

    public function test_update_rejects_ends_at_before_effective_starts_at(): void
    {
        $this->actingAsSuperAdmin();
        $subscription = Subscription::factory()->create([
            'starts_at' => '2026-01-01',
            'ends_at' => '2026-12-31',
        ]);

        // Only ends_at sent — compared against the existing starts_at.
        $this->putJson("/api/v1/admin/subscriptions/{$subscription->id}", ['ends_at' => '2025-06-01'])
            ->assertStatus(422)
            ->assertJsonValidationErrors('ends_at');

        // Both sent — compared against the submitted starts_at.
        $this->putJson("/api/v1/admin/subscriptions/{$subscription->id}", [
            'starts_at' => '2026-07-01',
            'ends_at' => '2026-06-15',
        ])->assertStatus(422)
            ->assertJsonValidationErrors('ends_at');

        // Legitimate later date still passes.
        $this->putJson("/api/v1/admin/subscriptions/{$subscription->id}", ['ends_at' => '2027-06-30'])
            ->assertOk()
            ->assertJsonPath('data.ends_at', '2027-06-30');
    }

    public function test_update_rejects_money_out_of_schema_precision(): void
    {
        $this->actingAsSuperAdmin();
        $subscription = Subscription::factory()->create();

        $this->putJson("/api/v1/admin/subscriptions/{$subscription->id}", ['price' => '10.123'])
            ->assertStatus(422)
            ->assertJsonValidationErrors('price');
    }

    public function test_update_cannot_reassign_customer(): void
    {
        $this->actingAsSuperAdmin();
        $subscription = Subscription::factory()->create();
        $other = Customer::factory()->create();

        // The field is not in the whitelist — silently ignored by design.
        $this->putJson("/api/v1/admin/subscriptions/{$subscription->id}", [
            'customer_id' => $other->id,
            'price' => '75.00',
        ])->assertOk()
            ->assertJsonPath('data.price', '75.00');

        $this->assertNotEquals($other->id, $subscription->fresh()->customer_id);
    }

    public function test_update_audits_changes(): void
    {
        $this->actingAsSuperAdmin();
        $subscription = Subscription::factory()->create();

        $this->putJson("/api/v1/admin/subscriptions/{$subscription->id}", ['price' => '200.00'])
            ->assertOk();

        $this->assertDatabaseHas('audit_logs', ['action' => 'subscription.updated', 'resource_type' => 'Subscription']);
    }

    // ── Delete / dashboard ────────────────────────────────────────────

    public function test_delete_is_blocked_financial_rows_are_permanent(): void
    {
        $this->actingAsSuperAdmin();
        $subscription = Subscription::factory()->create();

        $this->deleteJson("/api/v1/admin/subscriptions/{$subscription->id}")
            ->assertStatus(422);

        $this->assertDatabaseHas('subscriptions', ['id' => $subscription->id]);
    }

    public function test_dashboard_exposes_no_subscription_metrics(): void
    {
        $this->actingAsSuperAdmin();
        Subscription::factory()->count(3)->create();

        $this->getJson('/api/v1/admin/dashboard/stats')
            ->assertOk()
            ->assertJsonMissingPath('data.counts.subscriptions')
            ->assertJsonMissingPath('data.counts.mrr')
            ->assertJsonMissingPath('data.counts.active_subscriptions');
    }

    public function test_subscription_list_caps_oversized_per_page(): void
    {
        $this->actingAsSuperAdmin();
        Subscription::factory()->count(2)->create();

        $this->getJson('/api/v1/admin/subscriptions?per_page=9999')
            ->assertOk()
            ->assertJsonPath('meta.per_page', 100);
    }
}
