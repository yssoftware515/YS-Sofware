<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Group H — drop the last two product-scoped columns from retained tables.
 *
 * `customers.product_id` and `audit_logs.product_id` were the only
 * remaining anchors to the removed Product domain. Row visibility is now
 * permission-gated only (the `accessibleBy` scopes are already no-ops),
 * so both columns are dead weight:
 *   - nothing reads them for filtering,
 *   - the AuditService write-path that populated them is removed in the
 *     same change set (otherwise every audit write would fail with
 *     SQLSTATE 42703).
 *
 * `audit_logs` keeps its RLS policies and append-only guarantees; only
 * the column is removed.
 *
 * The `customers.product_id` FK (`→ products`) was already dropped by the
 * companion tables migration (000001), so here we drop the columns
 * directly — PostgreSQL removes any dependent constraint automatically.
 * `hasColumn` guards make the migration idempotent-safe.
 *
 * IRREVERSIBLE BY DESIGN — see the companion tables migration.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasColumn('customers', 'product_id')) {
            Schema::table('customers', function (Blueprint $table) {
                $table->dropColumn('product_id');
            });
        }

        if (Schema::hasColumn('audit_logs', 'product_id')) {
            Schema::table('audit_logs', function (Blueprint $table) {
                $table->dropColumn('product_id');
            });
        }
    }

    public function down(): void
    {
        throw new RuntimeException(
            'Group H dropped product_id from customers/audit_logs. '
            .'This migration is irreversible by design; restore the data from a database backup.'
        );
    }
};
