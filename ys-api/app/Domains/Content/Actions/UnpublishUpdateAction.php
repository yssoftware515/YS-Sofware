<?php

namespace App\Domains\Content\Actions;

use App\Domains\Content\Models\Update;

class UnpublishUpdateAction
{
    public function execute(Update $update): Update
    {
        $update->update(['published_at' => null]);

        return $update->fresh();
    }
}
