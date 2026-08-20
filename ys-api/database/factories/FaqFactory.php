<?php

namespace Database\Factories;

use App\Domains\Auth\Models\User;
use App\Domains\Cms\Models\Faq;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Faq>
 */
class FaqFactory extends Factory
{
    protected $model = Faq::class;

    public function definition(): array
    {
        return [
            'question_en' => $this->faker->sentence(),
            'question_ar' => $this->faker->sentence(),
            'answer_en' => $this->faker->paragraph(),
            'answer_ar' => $this->faker->paragraph(),
            'category' => 'general',
            'status' => 'published',
            'sort_order' => 0,
            'created_by' => User::factory(),
        ];
    }
}
