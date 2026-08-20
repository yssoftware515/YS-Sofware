<?php

namespace App\Domains\Auth\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Relations\Pivot;

/**
 * The admin_product_access pivot carries its own UUID primary key, but
 * Laravel's stock Pivot class inserts only the relation columns — which
 * makes every insert violate the NOT NULL id column (symptom: product
 * access could only ever be granted by the original backfill migration).
 * Giving the pivot HasUuids lets Eloquent generate the key on attach/sync
 * just like every other table in this codebase.
 */
class AdminProductAccess extends Pivot
{
    use HasUuids;
}
