<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('settings', function (Blueprint $table) {
            $table->uuid('id')->primary();

            $table->string('group')->default('system');  // brand|social|seo|system
            $table->string('key')->unique();
            $table->jsonb('value')->nullable();
            $table->string('description')->nullable();

            // is_public: frontend can read this value via public API
            // is_public = false: sensitive, admin-only
            $table->boolean('is_public')->default(false);

            // Content versioning — future-proofing JSON shape changes
            $table->unsignedTinyInteger('content_version')->default(1);

            $table->foreignUuid('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index('group');
            $table->index(['group', 'is_public']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('settings');
    }
};
