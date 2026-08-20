<?php

namespace Database\Factories;

use App\Domains\Product\Models\Product;
use App\Domains\Product\Models\ProductRelease;
use Illuminate\Database\Eloquent\Factories\Factory;

class ProductReleaseFactory extends Factory
{
    protected $model = ProductRelease::class;

    public function definition(): array
    {
        return [
            'product_id' => Product::factory(),
            'version' => $this->faker->randomDigitNotNull().'.'.$this->faker->randomDigit().'.'.$this->faker->randomDigit(),
            'release_date' => $this->faker->date(),
            'type' => $this->faker->randomElement(['major', 'minor', 'patch', 'hotfix']),
            'release_notes_en' => $this->faker->paragraph(),
            'release_notes_ar' => $this->faker->paragraph(),
            'changelog' => [
                'improvements' => [$this->faker->sentence()],
                'fixes' => [$this->faker->sentence()],
                'breaking' => [],
            ],
            'is_published' => true,
        ];
    }

    public function draft(): static
    {
        return $this->state(fn () => ['is_published' => false]);
    }

    public function hotfix(): static
    {
        return $this->state(fn () => ['type' => 'hotfix']);
    }
}
