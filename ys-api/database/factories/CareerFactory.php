<?php

namespace Database\Factories;

use App\Domains\Content\Models\Career;
use Illuminate\Database\Eloquent\Factories\Factory;

class CareerFactory extends Factory
{
    protected $model = Career::class;

    public function definition(): array
    {
        return [
            'title_en' => $this->faker->jobTitle(),
            'title_ar' => $this->faker->jobTitle(),
            'department' => $this->faker->randomElement(['Engineering', 'Design', 'Marketing', 'Product']),
            'location' => 'Remote',
            'type' => 'full_time',
            'description_en' => $this->faker->paragraph(),
            'description_ar' => $this->faker->paragraph(),
            'requirements' => [$this->faker->sentence(), $this->faker->sentence()],
            'responsibilities' => [$this->faker->sentence(), $this->faker->sentence()],
            'status' => 'draft',
            'is_featured' => false,
            'sort_order' => 0,
        ];
    }

    public function open(): static
    {
        return $this->state(['status' => 'open']);
    }

    public function closed(): static
    {
        return $this->state(['status' => 'closed']);
    }
}
