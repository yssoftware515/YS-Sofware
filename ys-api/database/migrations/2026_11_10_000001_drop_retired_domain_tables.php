<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Group H — retire the tables left over from the removed domains.
 *
 * The Product, Subscription, Content (docs/roadmap/updates/careers/
 * timeline) and Feature Flag domains were removed in Groups A–F. Their
 * tables were deliberately kept at the time because the schema was
 * frozen; this migration is the approved forward-only cleanup.
 *
 * Only tables are dropped here — never the historical migrations that
 * created them. A fresh install still runs those migrations (creating the
 * tables) and then this one drops them, so schema and migration history
 * stay consistent and `migrate` works from an empty database.
 *
 * Order matters: children before `products`, and `subscriptions` before
 * `products` (its FK is RESTRICT, not CASCADE). `customers` is retained,
 * but its `product_id` FK (→ products) blocks dropping `products`, so that
 * FK is dropped here first; the `customers.product_id` column itself is
 * dropped by the companion migration 2026_11_10_000002.
 *
 * IRREVERSIBLE BY DESIGN: the data in these tables cannot be recreated.
 * `down()` refuses to run rather than pretend otherwise — restore from a
 * database backup if this was applied in error.
 */
return new class extends Migration
{
    /** @var string[] tables in dependency-safe drop order */
    private const TABLES = [
        'product_media',
        'product_features',
        'product_pricing_plans',
        'product_releases',
        'admin_product_access',
        'subscriptions',
        'documentation_articles',
        'documentation_categories',
        'roadmap_items',
        'updates',
        'timeline_entries',
        'careers',
        'feature_flags',
        'products',
    ];

    public function up(): void
    {
        // `customers` is retained, but its product_id → products FK blocks
        // dropping `products`. Drop the constraint now; the column is
        // removed by migration 000002 (after products is gone).
        if (Schema::hasColumn('customers', 'product_id')) {
            Schema::table('customers', function (Blueprint $table) {
                $table->dropForeign(['product_id']);
            });
        }

        foreach (self::TABLES as $table) {
            Schema::dropIfExists($table);
        }
    }

    public function down(): void
    {
        throw new RuntimeException(
            'Group H dropped retired domain tables (products, subscriptions, content, feature flags). '
            .'This migration is irreversible by design; restore the data from a database backup.'
        );
    }
};
