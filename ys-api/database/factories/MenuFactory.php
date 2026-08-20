<?php

namespace Database\Factories;

use App\Domains\Cms\Models\Menu;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Menu>
 */
class MenuFactory extends Factory
{
    protected $model = Menu::class;

    public function definition(): array
    {
        return [
            'name' => $this->faker->words(2, true),
            'location' => $this->faker->unique()->slug(2),
            'is_active' => true,
        ];
    }
}
