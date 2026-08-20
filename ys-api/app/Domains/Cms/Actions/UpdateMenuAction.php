<?php

namespace App\Domains\Cms\Actions;

use App\Domains\Cms\Models\Menu;

class UpdateMenuAction
{
    public function execute(Menu $menu, array $data): Menu
    {
        $menu->update(array_filter($data, fn ($v) => $v !== null));

        return $menu->fresh();
    }
}
