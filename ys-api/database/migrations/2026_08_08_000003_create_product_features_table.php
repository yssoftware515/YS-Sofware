<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Product features — major capabilities shown as a structured list on
     * the public product page (bilingual title + optional short
     * description). Admin-managed, not code.
     */
    public function up(): void
    {
        Schema::create('product_features', function (Blueprint $table) {
            $table->uuid('id')->primary();

            $table->foreignUuid('product_id')->constrained('products')->cascadeOnDelete();

            $table->string('title_en');
            $table->string('title_ar');
            $table->text('description_en')->nullable();
            $table->text('description_ar')->nullable();

            $table->unsignedSmallInteger('sort_order')->default(0);

            $table->timestamps();

            $table->index(['product_id', 'sort_order']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('product_features');
    }
};
