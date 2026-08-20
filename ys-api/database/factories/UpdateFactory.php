<?php

namespace Database\Factories;

use App\Domains\Content\Models\Update;
use Illuminate\Database\Eloquent\Factories\Factory;

class UpdateFactory extends Factory
{
    protected $model = Update::class;

    public function definition(): array
    {
        return [
            'title_en' => $this->faker->sentence(6),
            'title_ar' => $this->faker->sentence(6),
            'content_en' => $this->faker->paragraphs(2, true),
            'content_ar' => $this->faker->paragraphs(2, true),
            'type' => $this->faker->randomElement(['announcement', 'blog', 'news', 'release']),
            'is_featured' => false,
            'published_at' => null,
        ];
    }

    public function published(): static
    {
        return $this->state(['published_at' => now()->subDays(rand(1, 30))]);
    }
}
