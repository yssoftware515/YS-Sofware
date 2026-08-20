<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Product-level access scoping for admin users.
     *
     * SECURITY MODEL (fail-closed, not fail-open):
     * - A user with the '*' (super_admin) permission bypasses this table
     *   entirely — always full access, checked in code, not stored here.
     * - A user with ZERO rows here has ZERO product access. This is the
     *   opposite of "no rows = unrestricted" on purpose: an admin account
     *   created without explicit scoping should never silently inherit
     *   access to a product nobody granted them.
     * - This table only gates PRODUCT-SCOPED actions (managing a specific
     *   product, its releases, its docs). Company-wide permissions
     *   (manage_careers, reply_messages, manage_admins, view_financials,
     *   etc.) are untouched by this table — they're not product-specific
     *   by nature.
     *
     * See User::canAccessProduct() for the runtime check, and the
     * accompanying data migration for backfilling every existing admin so
     * this ships with zero access-loss for current accounts.
     */
    public function up(): void
    {
        Schema::create('admin_product_access', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignUuid('product_id')->constrained('products')->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['user_id', 'product_id']);
            $table->index('user_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('admin_product_access');
    }
};
