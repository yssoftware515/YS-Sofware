<?php

namespace Database\Factories;

use App\Domains\Auth\Models\User;
use App\Domains\Operations\Models\Milestone;
use App\Domains\Operations\Models\Project;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Milestone>
 */
class MilestoneFactory extends Factory
{
    protected $model = Milestone::class;

    public function definition(): array
    {
        return [
            'project_id' => Project::factory(),
            'title' => $this->faker->sentence(3),
            'description' => $this->faker->paragraph(),
            'status' => Milestone::STATUS_PENDING,
            'target_date' => $this->faker->date(),
            'sort_order' => $this->faker->numberBetween(0, 100),
            'created_by' => User::factory(),
        ];
    }
}
