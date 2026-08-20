<?php

namespace Database\Factories;

use App\Domains\Cms\Models\Menu;
use App\Domains\Cms\Models\MenuItem;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<MenuItem>
 */
class MenuItemFactory extends Factory
{
    protected $model = MenuItem::class;

    public function definition(): array
    {
        return [
            'menu_id' => Menu::factory(),
            'parent_id' => null,
            'title_en' => $this->faker->words(2, true),
            'title_ar' => $this->faker->words(2, true),
            'url' => '/'.$this->faker->slug(),
            'icon' => null,
            'target' => '_self',
            'sort_order' => 0,
            'is_active' => true,
        ];
    }
}
