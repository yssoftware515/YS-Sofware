<?php

namespace Database\Factories;

use App\Domains\Auth\Models\Role;
use Illuminate\Database\Eloquent\Factories\Factory;

class RoleFactory extends Factory
{
    protected $model = Role::class;

    public function definition(): array
    {
        return [
            'name' => $this->faker->jobTitle(),
            'slug' => $this->faker->unique()->slug(2),
            'permissions' => ['view_products'],
            'description' => $this->faker->sentence(),
        ];
    }

    public function superAdmin(): static
    {
        return $this->state([
            'name' => 'Super Admin',
            'slug' => 'super_admin',
            'permissions' => ['*'],
        ]);
    }
}
