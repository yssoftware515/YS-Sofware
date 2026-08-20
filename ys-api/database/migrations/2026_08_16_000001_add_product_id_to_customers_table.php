<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Anchor each customer to the product its business belongs to.
     * NULL means company-level (global) — visible to every scoped admin,
     * mirroring the content modules' "global row" convention.
     *
     * A customer subscribing to several products is anchored to the
     * FIRST subscription's product (by creation time); the record's
     * product can be adjusted by an admin afterwards.
     */
    public function up(): void
    {
        Schema::table('customers', function (Blueprint $table) {
            $table->foreignUuid('product_id')
                ->nullable()
                ->after('company')
                ->constrained('products')
                ->nullOnDelete();
        });

        DB::statement(<<<'SQL'
            UPDATE customers c
            SET product_id = s.product_id
            FROM (
                SELECT DISTINCT ON (customer_id) customer_id, product_id
                FROM subscriptions
                ORDER BY customer_id, created_at
            ) s
            WHERE s.customer_id = c.id
              AND c.product_id IS NULL
        SQL);
    }

    public function down(): void
    {
        Schema::table('customers', function (Blueprint $table) {
            $table->dropConstrainedForeignId('product_id');
        });
    }
};
