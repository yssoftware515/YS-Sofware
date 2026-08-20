<?php

namespace Database\Factories;

use App\Domains\Content\Models\RoadmapItem;
use Illuminate\Database\Eloquent\Factories\Factory;

class RoadmapItemFactory extends Factory
{
    protected $model = RoadmapItem::class;

    public function definition(): array
    {
        return [
            'title_en' => $this->faker->sentence(5),
            'title_ar' => $this->faker->sentence(5),
            'description_en' => $this->faker->paragraph(),
            'description_ar' => $this->faker->paragraph(),
            'status' => $this->faker->randomElement(['planned', 'in_progress', 'completed', 'cancelled']),
            'priority' => $this->faker->randomElement(['low', 'medium', 'high', 'critical']),
            'is_public' => true,
            'sort_order' => $this->faker->numberBetween(0, 100),
        ];
    }

    public function private(): static
    {
        return $this->state(['is_public' => false]);
    }
}
