<?php

namespace Database\Factories;

use App\Domains\Cms\Models\HomepageSection;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<HomepageSection>
 */
class HomepageSectionFactory extends Factory
{
    protected $model = HomepageSection::class;

    public function definition(): array
    {
        return [
            'type' => 'hero',
            'title_en' => $this->faker->words(3, true),
            'title_ar' => $this->faker->words(3, true),
            'subtitle_en' => $this->faker->sentence(),
            'subtitle_ar' => $this->faker->sentence(),
            'content' => null,
            'is_enabled' => true,
            'sort_order' => 0,
        ];
    }
}
