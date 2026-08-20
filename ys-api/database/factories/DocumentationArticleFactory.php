<?php

namespace Database\Factories;

use App\Domains\Content\Models\DocumentationArticle;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

class DocumentationArticleFactory extends Factory
{
    protected $model = DocumentationArticle::class;

    public function definition(): array
    {
        $title = $this->faker->sentence(4);

        return [
            'slug' => Str::slug($title).'-'.$this->faker->randomNumber(3),
            'title_en' => $title,
            'title_ar' => $this->faker->sentence(4),
            'content_en' => $this->faker->paragraphs(3, true),
            'content_ar' => $this->faker->paragraphs(3, true),
            'reading_time_minutes' => $this->faker->numberBetween(1, 15),
            'is_published' => false,
            'sort_order' => $this->faker->numberBetween(0, 100),
        ];
    }

    public function published(): static
    {
        return $this->state(['is_published' => true]);
    }
}
