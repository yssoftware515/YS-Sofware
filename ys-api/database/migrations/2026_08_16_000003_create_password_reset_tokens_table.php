<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * VULN-13: dedicated password-reset token table. Only the SHA-256
     * token HASH is persisted (a DB leak cannot replay resets); the
     * plaintext token travels exclusively in the reset email, like the
     * welcome-token design (FIX-05).
     */
    public function up(): void
    {
        Schema::create('password_reset_tokens', function (Blueprint $table) {
            $table->id();
            $table->string('email')->index();
            $table->string('token_hash', 64);
            $table->timestamp('created_at')->nullable();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('password_reset_tokens');
    }
};
