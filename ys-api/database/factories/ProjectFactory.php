<?php

namespace Database\Factories;

use App\Domains\Auth\Models\User;
use App\Domains\Billing\Models\Customer;
use App\Domains\Operations\Models\Project;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Project>
 */
class ProjectFactory extends Factory
{
    protected $model = Project::class;

    public function definition(): array
    {
        return [
            'name' => $this->faker->words(3, true),
            'customer_id' => Customer::factory(),
            'project_type' => $this->faker->randomElement(Project::PROJECT_TYPES),
            'description' => $this->faker->paragraph(),
            'status' => Project::STATUS_ACTIVE,
            'start_date' => $this->faker->date(),
            'expected_completion_date' => $this->faker->date(),
            'quoted_value' => $this->faker->numberBetween(1000, 100000),
            'currency' => 'USD',
            'created_by' => User::factory(),
        ];
    }
}
