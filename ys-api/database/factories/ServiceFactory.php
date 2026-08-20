<?php

namespace Database\Factories;

use App\Domains\Services\Models\Service;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

class ServiceFactory extends Factory
{
    protected $model = Service::class;

    public function definition(): array
    {
        $name = $this->faker->words(2, true);

        return [
            'slug' => Str::slug($name).'-'.$this->faker->randomNumber(3),
            'name_en' => ucwords($name),
            'name_ar' => $this->faker->words(2, true),
            'category' => $this->faker->randomElement(['web', 'mobile', 'ai', 'automation', 'design', 'consulting']),
            'short_desc_en' => $this->faker->sentence(),
            'short_desc_ar' => $this->faker->sentence(),
            'pricing_type' => Service::PRICING_TYPE_CUSTOM_QUOTE,
            'currency' => 'USD',
            'status' => Service::STATUS_INACTIVE,
            'is_featured' => false,
            'sort_order' => $this->faker->numberBetween(0, 100),
        ];
    }

    public function active(): static
    {
        return $this->state([
            'status' => Service::STATUS_ACTIVE,
            'pricing_type' => Service::PRICING_TYPE_STARTING_AT,
            'starting_price' => '1500.00',
        ]);
    }
}
