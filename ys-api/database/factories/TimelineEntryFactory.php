<?php

namespace Database\Factories;

use App\Domains\Content\Models\TimelineEntry;
use Illuminate\Database\Eloquent\Factories\Factory;

class TimelineEntryFactory extends Factory
{
    protected $model = TimelineEntry::class;

    public function definition(): array
    {
        return [
            'title_en' => $this->faker->sentence(4),
            'title_ar' => $this->faker->sentence(4),
            'event_date' => $this->faker->dateTimeBetween('-5 years', 'now'),
            'type' => $this->faker->randomElement(['founding', 'product_launch', 'milestone', 'award']),
            'is_public' => true,
            'sort_order' => 0,
        ];
    }
}
