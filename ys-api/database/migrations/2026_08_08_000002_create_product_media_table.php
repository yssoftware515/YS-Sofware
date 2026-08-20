<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Product media — the visual catalog of a product page presented on
     * the company platform (hero media, gallery shots, screenshots).
     * Media rows are reusable across the platform via the existing
     * `media` table; this pivot adds product placement + ordering.
     */
    public function up(): void
    {
        Schema::create('product_media', function (Blueprint $table) {
            $table->uuid('id')->primary();

            $table->foreignUuid('product_id')->constrained('products')->cascadeOnDelete();
            $table->foreignUuid('media_id')->constrained('media')->nullOnDelete();

            // hero | gallery | screenshot
            $table->string('kind')->default('gallery');

            $table->unsignedSmallInteger('sort_order')->default(0);

            $table->timestamps();

            $table->index(['product_id', 'sort_order']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('product_media');
    }
};
