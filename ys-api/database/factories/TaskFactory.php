<?php

namespace Database\Factories;

use App\Domains\Auth\Models\User;
use App\Domains\Operations\Models\Project;
use App\Domains\Operations\Models\Task;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Task>
 */
class TaskFactory extends Factory
{
    protected $model = Task::class;

    public function definition(): array
    {
        return [
            'project_id' => Project::factory(),
            'title' => $this->faker->sentence(4),
            'description' => $this->faker->paragraph(),
            'status' => Task::STATUS_TODO,
            'priority' => $this->faker->randomElement(Task::PRIORITIES),
            'due_date' => $this->faker->date(),
            'created_by' => User::factory(),
        ];
    }
}
