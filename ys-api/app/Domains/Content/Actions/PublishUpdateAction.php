<?php

namespace App\Domains\Content\Actions;

use App\Domains\Content\Models\Update;

class PublishUpdateAction
{
    public function execute(Update $update): Update
    {
        if ($update->isDraft()) {
            $update->update(['published_at' => now()]);
        }

        return $update->fresh();
    }
}
