<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('menus', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name');
            $table->string('location')->unique(); // header, footer_products, footer_company, footer_resources, footer_legal
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('menu_items', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('menu_id')->constrained()->cascadeOnDelete();
            $table->uuid('parent_id')->nullable();
            $table->string('title_en');
            $table->string('title_ar');
            $table->string('url');
            $table->string('icon')->nullable();
            $table->string('target')->default('_self'); // _self, _blank
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index('menu_id');
            $table->index('parent_id');
        });

        Schema::table('menu_items', function (Blueprint $table) {
            $table->foreign('parent_id')->references('id')->on('menu_items')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('menu_items');
        Schema::dropIfExists('menus');
    }
};
