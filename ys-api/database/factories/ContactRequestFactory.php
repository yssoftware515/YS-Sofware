<?php

namespace Database\Factories;

use App\Domains\Operations\Models\ContactRequest;
use Illuminate\Database\Eloquent\Factories\Factory;

class ContactRequestFactory extends Factory
{
    protected $model = ContactRequest::class;

    public function definition(): array
    {
        return [
            'name' => $this->faker->name(),
            'email' => $this->faker->safeEmail(),
            'subject' => $this->faker->sentence(),
            'message' => $this->faker->paragraph(),
            'type' => $this->faker->randomElement(['general', 'sales', 'support', 'partnership']),
            'status' => 'new',
            'ip_address' => $this->faker->ipv4(),
            'user_agent' => $this->faker->userAgent(),
            'spam_score' => 0.0,
        ];
    }
}
