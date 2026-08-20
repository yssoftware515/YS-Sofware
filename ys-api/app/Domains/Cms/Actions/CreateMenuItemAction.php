<?php

namespace App\Domains\Cms\Actions;

use App\Domains\Cms\Models\MenuItem;

class CreateMenuItemAction
{
    public function execute(array $data): MenuItem
    {
        return MenuItem::create([
            'menu_id' => $data['menu_id'],
            'parent_id' => $data['parent_id'] ?? null,
            'title_en' => $data['title_en'],
            'title_ar' => $data['title_ar'],
            'url' => $data['url'],
            'icon' => $data['icon'] ?? null,
            'target' => $data['target'] ?? '_self',
            'sort_order' => $data['sort_order'] ?? 0,
            'is_active' => (bool) ($data['is_active'] ?? true),
        ]);
    }
}
