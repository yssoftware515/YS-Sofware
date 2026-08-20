<?php

namespace Database\Factories;

use App\Domains\Content\Models\DocumentationCategory;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

class DocumentationCategoryFactory extends Factory
{
    protected $model = DocumentationCategory::class;

    public function definition(): array
    {
        $title = $this->faker->words(3, true);

        return [
            'slug' => Str::slug($title).'-'.$this->faker->randomNumber(3),
            'title_en' => ucwords($title),
            'title_ar' => $this->faker->words(3, true),
            'sort_order' => $this->faker->numberBetween(0, 50),
        ];
    }
}
