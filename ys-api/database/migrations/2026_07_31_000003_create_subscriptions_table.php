<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * A customer subscribing to N products is simply N rows here, each
     * tied to one product — not a many-to-many pivot with a separate
     * "subscription" concept layered on top. This is intentionally the
     * simplest shape that supports "one customer, multiple products,
     * different plans/prices/cycles per product," which is exactly what
     * was asked for — no more, no less.
     *
     * Designed to be filled manually today (is_manual_entry / created_by
     * track who entered it) and by an automated payment provider webhook
     * later — that later integration only needs to INSERT into this same
     * table, not migrate to a new shape.
     */
    public function up(): void
    {
        Schema::create('subscriptions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('customer_id')->constrained('customers')->cascadeOnDelete();
            $table->foreignUuid('product_id')->constrained('products')->restrictOnDelete();

            $table->string('plan_name');
            $table->decimal('price', 10, 2);
            $table->char('currency', 3)->default('USD');
            $table->enum('billing_cycle', ['monthly', 'quarterly', 'biannual', 'yearly']);

            $table->date('starts_at');
            $table->date('ends_at');
            $table->enum('status', ['active', 'expired', 'cancelled'])->default('active');

            $table->boolean('is_manual_entry')->default(true);
            $table->foreignUuid('created_by')->nullable()->constrained('users')->nullOnDelete();

            $table->timestamps();

            // Matches the exact query patterns the financial dashboard and
            // the "who's expiring soon" admin view will need.
            $table->index(['product_id', 'status']);
            $table->index(['status', 'ends_at']);
            $table->index('customer_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('subscriptions');
    }
};
