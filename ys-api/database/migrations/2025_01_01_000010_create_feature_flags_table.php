<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('feature_flags', function (Blueprint $table) {
            $table->uuid('id')->primary();

            $table->string('key')->unique();
            $table->boolean('is_enabled')->default(false);
            $table->string('description')->nullable();

            // null = company-wide, uuid = product-specific flag
            $table->foreignUuid('product_id')->nullable()->constrained('products')->nullOnDelete();

            // all | production | staging | local
            $table->string('environment')->default('all');

            // Optional: enable only for specific user IDs or roles
            // Shape: { "users": ["uuid1"], "roles": ["super_admin"] }
            $table->jsonb('enabled_for')->nullable();

            $table->foreignUuid('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['key', 'is_enabled']);
            $table->index('environment');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('feature_flags');
    }
};
