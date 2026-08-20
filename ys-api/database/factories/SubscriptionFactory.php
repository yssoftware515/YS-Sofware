<?php

namespace Database\Factories;

use App\Domains\Billing\Models\Customer;
use App\Domains\Billing\Models\Subscription;
use App\Domains\Product\Models\Product;
use Illuminate\Database\Eloquent\Factories\Factory;

class SubscriptionFactory extends Factory
{
    protected $model = Subscription::class;

    public function definition(): array
    {
        return [
            'customer_id' => Customer::factory(),
            'product_id' => Product::factory()->active(),
            'plan_name' => $this->faker->randomElement(['Starter', 'Pro', 'Enterprise']),
            'price' => $this->faker->randomElement(['49.00', '99.00', '199.00', '499.00']),
            'currency' => 'USD',
            'billing_cycle' => $this->faker->randomElement(['monthly', 'quarterly', 'biannual', 'yearly']),
            'starts_at' => '2026-01-01',
            'ends_at' => '2026-12-31',
            'status' => 'active',
            'is_manual_entry' => true,
            'created_by' => null,
        ];
    }
}
