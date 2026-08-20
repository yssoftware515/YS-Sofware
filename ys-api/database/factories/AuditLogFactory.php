<?php

namespace Database\Factories;

use App\Domains\Auth\Models\User;
use App\Domains\System\Models\AuditLog;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<AuditLog>
 */
class AuditLogFactory extends Factory
{
    protected $model = AuditLog::class;

    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'action' => $this->faker->randomElement(['created', 'updated', 'deleted', 'login']),
            'resource_type' => $this->faker->randomElement(['product', 'service', 'faq', 'user']),
            'resource_id' => (string) $this->faker->uuid(),
            'product_id' => null,
            'old_values' => [],
            'new_values' => [],
            'ip_address' => $this->faker->ipv4(),
            'user_agent' => $this->faker->userAgent(),
            'context' => [],
        ];
    }
}
