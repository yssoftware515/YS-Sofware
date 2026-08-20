<?php

namespace App\Domains\System\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Read-only view of the queue dead-letter table.
 *
 * Records are written by the queue worker when a job exhausts its retries.
 * This model exists for operator visibility (see FailedJobController) and is
 * deliberately immutable from the app: no fillable, no writes, no mass
 * assignment. `payload` is always excluded from API output — it can contain
 * serialized arguments (emails, ids, private data).
 */
class FailedJob extends Model
{
    protected $table = 'failed_jobs';

    public $timestamps = false;

    protected $guarded = [];

    protected $hidden = ['payload', 'exception'];

    protected function casts(): array
    {
        return [
            'failed_at' => 'datetime',
        ];
    }
}
