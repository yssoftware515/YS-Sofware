<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('product_releases', function (Blueprint $table) {
            $table->uuid('id')->primary();

            $table->foreignUuid('product_id')->constrained('products')->cascadeOnDelete();

            $table->string('version');
            $table->date('release_date');

            // major | minor | patch | hotfix
            $table->string('type')->default('minor');

            $table->text('release_notes_en')->nullable();
            $table->text('release_notes_ar')->nullable();

            // breaking_changes, improvements, fixes
            $table->jsonb('changelog')->nullable();

            $table->boolean('is_published')->default(false);

            $table->foreignUuid('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['product_id', 'version']);
            $table->index(['product_id', 'release_date']);
            $table->index('is_published');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('product_releases');
    }
};
