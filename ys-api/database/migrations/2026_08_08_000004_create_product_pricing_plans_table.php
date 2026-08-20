<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Product pricing presentation — tiers/plans shown on the public page.
     * This is PRESENTATION data for the company platform ("the platform
     * may present subscription pricing"). Billing itself belongs to each
     * product system — nothing here performs billing. Money is
     * decimal(12,2) (string-cast), never float.
     */
    public function up(): void
    {
        Schema::create('product_pricing_plans', function (Blueprint $table) {
            $table->uuid('id')->primary();

            $table->foreignUuid('product_id')->constrained('products')->cascadeOnDelete();

            $table->string('name_en');
            $table->string('name_ar');

            // fixed | starting_at | custom_quote | free
            $table->string('pricing_type')->default('fixed');

            $table->decimal('price', 12, 2)->nullable();
            $table->char('currency', 3)->default('USD');

            // monthly | yearly | one_time | per_project
            $table->string('billing_cycle')->nullable();

            $table->boolean('is_featured')->default(false);
            $table->unsignedSmallInteger('sort_order')->default(0);

            $table->timestamps();

            $table->index(['product_id', 'sort_order']);
            $table->index('is_featured');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('product_pricing_plans');
    }
};
