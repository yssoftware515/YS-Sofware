<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('audit_logs', function (Blueprint $table) {
            $table->uuid('id')->primary();

            // Nullable — some actions happen before/without a logged-in user
            $table->foreignUuid('user_id')->nullable()->constrained('users')->nullOnDelete();

            $table->string('action');             // e.g. "product.created"
            $table->string('resource_type');      // e.g. "Product"
            $table->uuid('resource_id')->nullable();

            // State snapshots
            $table->jsonb('old_values')->nullable();
            $table->jsonb('new_values')->nullable();

            // Request context
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();

            // Extra context (HTTP method, URL, etc.)
            $table->jsonb('context')->nullable();

            // Immutable: created_at only. No updated_at, no deleted_at.
            $table->timestamp('created_at')->useCurrent();

            // Indexes for admin queries
            $table->index(['resource_type', 'resource_id']);
            $table->index(['user_id', 'created_at']);
            $table->index('action');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('audit_logs');
    }
};
