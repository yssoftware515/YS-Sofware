<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * VULN-13: drop the dead password_reset_token / expiry columns on
     * users (no flow ever wrote to them) and add password_changed_at —
     * the anchor for the upcoming "force password change" feature and
     * for auditing rotation activity.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['password_reset_token', 'password_reset_expires_at']);
            $table->timestamp('password_changed_at')->nullable()->after('last_login_ip');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('password_changed_at');
            $table->string('password_reset_token')->nullable();
            $table->timestamp('password_reset_expires_at')->nullable();
        });
    }
};
