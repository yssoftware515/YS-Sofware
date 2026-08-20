<?php

namespace Database\Factories;

use App\Domains\Product\Models\Product;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

class ProductFactory extends Factory
{
    protected $model = Product::class;

    public function definition(): array
    {
        $name = $this->faker->words(2, true);

        return [
            'slug' => Str::slug($name).'-'.$this->faker->randomNumber(3),
            'name_en' => ucwords($name),
            'name_ar' => $this->faker->words(2, true),
            'short_desc_en' => $this->faker->sentence(),
            'short_desc_ar' => $this->faker->sentence(),
            'status' => $this->faker->randomElement(['active', 'beta', 'planned', 'archived']),
            'is_featured' => false,
            'sort_order' => $this->faker->numberBetween(0, 100),
        ];
    }

    public function active(): static
    {
        return $this->state(['status' => 'active']);
    }

    public function planned(): static
    {
        return $this->state(['status' => 'planned']);
    }
}
