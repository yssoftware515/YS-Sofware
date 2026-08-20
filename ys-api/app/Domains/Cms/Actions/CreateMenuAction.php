<?php

namespace App\Domains\Cms\Actions;

use App\Domains\Cms\Models\Menu;

class CreateMenuAction
{
    public function execute(array $data): Menu
    {
        return Menu::create([
            'name' => $data['name'],
            'location' => $data['location'],
            'is_active' => (bool) ($data['is_active'] ?? true),
        ]);
    }
}
