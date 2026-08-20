<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Normalize legacy contact-request statuses.
 *
 * The first contact-request model only knew 'read'/'replied'; the status
 * lifecycle ('new' … 'archived') came later and mapped both onto
 * 'reviewing' at render time (see ContactRequest::normalizeStatus). That
 * left stale values in the database: the admin list filter for
 * 'reviewing' silently missed every legacy row because it filters on the
 * raw column. This migration re-writes the value once, so the column
 * only ever holds lifecycle values and the filter is correct for all
 * rows.
 */
return new class extends Migration
{
    public function up(): void
    {
        DB::table('contact_requests')
            ->whereIn('status', ['read', 'replied'])
            ->update(['status' => 'reviewing']);
    }

    public function down(): void
    {
        // No reversible value mapping exists; the migration is a
        // one-way data fix, so nothing to do.
    }
};
