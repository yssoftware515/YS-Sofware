<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('users', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('role_id')->constrained('roles')->restrictOnDelete();

            $table->string('name');
            $table->string('email')->unique();

            // Default bcrypt driver (config hashing driver is framework default)
            $table->string('password');

            $table->boolean('is_active')->default(true);
            $table->timestamp('last_login_at')->nullable();
            $table->string('last_login_ip', 45)->nullable();

            // Password reset
            $table->string('password_reset_token')->nullable();
            $table->timestamp('password_reset_expires_at')->nullable();

            $table->rememberToken();
            $table->timestamps();

            // Soft delete — admin accounts are audited, not permanently removed
            $table->softDeletes();

            $table->index(['email', 'is_active']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('users');
    }
};
