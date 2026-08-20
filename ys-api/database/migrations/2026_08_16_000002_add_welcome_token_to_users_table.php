<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * One-time sign-in token for a freshly created admin. Only the
     * SHA-256 hash is persisted — the plaintext travels exclusively in
     * the welcome email and is consumed on first login.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('welcome_token_hash')->nullable()->after('password');
            $table->timestamp('welcome_token_expires_at')->nullable()->after('welcome_token_hash');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['welcome_token_hash', 'welcome_token_expires_at']);
        });
    }
};
