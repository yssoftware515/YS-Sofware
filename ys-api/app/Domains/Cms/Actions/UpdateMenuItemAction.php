<?php

namespace App\Domains\Cms\Actions;

use App\Domains\Cms\Models\MenuItem;

class UpdateMenuItemAction
{
    public function execute(MenuItem $item, array $data): MenuItem
    {
        $item->update(array_filter($data, fn ($v) => $v !== null));

        return $item->fresh();
    }
}
