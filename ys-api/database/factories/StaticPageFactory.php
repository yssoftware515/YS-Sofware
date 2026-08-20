<?php

namespace Database\Factories;

use App\Domains\Auth\Models\User;
use App\Domains\Cms\Models\StaticPage;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<StaticPage>
 */
class StaticPageFactory extends Factory
{
    protected $model = StaticPage::class;

    public function definition(): array
    {
        return [
            'slug' => $this->faker->unique()->slug(2),
            'title_en' => $this->faker->sentence(3),
            'title_ar' => $this->faker->sentence(3),
            'excerpt_en' => $this->faker->sentence(),
            'excerpt_ar' => $this->faker->sentence(),
            'content_en' => $this->faker->paragraphs(2, true),
            'content_ar' => $this->faker->paragraphs(2, true),
            'status' => 'published',
            'published_at' => now(),
            'sort_order' => 0,
            'created_by' => User::factory(),
        ];
    }
}
