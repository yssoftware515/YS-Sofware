<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * The sessions table was created with foreignId('user_id') which
     * produces a bigint column, but users.id is UUID. PostgreSQL rejects
     * "invalid input syntax for type bigint" when a UUID is written.
     *
     * Fix: drop the bigint column and replace it with a proper uuid.
     * Data loss is acceptable — session rows are ephemeral (2h TTL).
     */
    public function up(): void
    {
        Schema::table('sessions', function (Blueprint $table) {
            $table->dropIndex(['user_id']);
            $table->dropColumn('user_id');
        });

        Schema::table('sessions', function (Blueprint $table) {
            $table->uuid('user_id')->nullable()->index();
        });
    }

    public function down(): void
    {
        Schema::table('sessions', function (Blueprint $table) {
            $table->dropIndex(['user_id']);
            $table->dropColumn('user_id');
        });

        Schema::table('sessions', function (Blueprint $table) {
            $table->foreignId('user_id')->nullable()->index();
        });
    }
};
