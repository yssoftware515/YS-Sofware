<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('media', function (Blueprint $table) {
            $table->uuid('id')->primary();

            $table->string('disk')->default('local');    // local | s3 (future)
            $table->string('path');
            $table->string('filename');
            $table->string('original_name');
            $table->string('mime_type', 100);
            $table->unsignedBigInteger('size');          // bytes

            $table->string('alt_text_en')->nullable();
            $table->string('alt_text_ar')->nullable();

            // Polymorphic association — media can belong to products, articles, etc.
            $table->string('mediable_type')->nullable();
            $table->uuid('mediable_id')->nullable();

            $table->foreignUuid('uploaded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['mediable_type', 'mediable_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('media');
    }
};
