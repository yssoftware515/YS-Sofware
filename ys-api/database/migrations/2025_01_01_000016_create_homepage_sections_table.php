<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('homepage_sections', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('type'); // hero, stats, why_choose, products, cta
            $table->string('title_en')->nullable();
            $table->string('title_ar')->nullable();
            $table->string('subtitle_en')->nullable();
            $table->string('subtitle_ar')->nullable();
            $table->jsonb('content')->nullable(); // type-specific data
            $table->boolean('is_enabled')->default(true);
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->timestamps();

            $table->index('type');
            $table->index('is_enabled');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('homepage_sections');
    }
};
