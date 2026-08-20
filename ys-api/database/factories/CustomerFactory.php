<?php

namespace Database\Factories;

use App\Domains\Auth\Models\User;
use App\Domains\Billing\Models\Customer;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Customer>
 */
class CustomerFactory extends Factory
{
    protected $model = Customer::class;

    public function definition(): array
    {
        return [
            'name' => $this->faker->name(),
            'email' => $this->faker->unique()->safeEmail(),
            'type' => $this->faker->randomElement(Customer::TYPES),
            'company' => $this->faker->company(),
            'phone' => $this->faker->phoneNumber(),
            'whatsapp' => $this->faker->phoneNumber(),
            'notes' => null,
            'status' => Customer::STATUS_ACTIVE,
            'created_by' => User::factory(),
        ];
    }
}
