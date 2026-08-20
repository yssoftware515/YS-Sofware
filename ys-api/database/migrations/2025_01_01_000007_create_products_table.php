<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('products', function (Blueprint $table) {
            $table->uuid('id')->primary();

            $table->string('slug')->unique();
            $table->string('name_en');
            $table->string('name_ar');

            $table->text('short_desc_en')->nullable();
            $table->text('short_desc_ar')->nullable();

            $table->longText('long_desc_en')->nullable();
            $table->longText('long_desc_ar')->nullable();

            // active | beta | planned | archived
            $table->string('status')->default('planned');

            // Convenience field — kept in sync by product_releases observer
            $table->string('current_version')->nullable();

            $table->foreignUuid('cover_image_id')->nullable()->constrained('media')->nullOnDelete();

            $table->boolean('is_featured')->default(false);
            $table->unsignedSmallInteger('sort_order')->default(0);

            // SEO: { title_en, title_ar, description_en, description_ar, og_image_id }
            $table->jsonb('seo_meta')->nullable();

            $table->foreignUuid('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['status', 'sort_order']);
            $table->index('is_featured');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('products');
    }
};
