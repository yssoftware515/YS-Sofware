<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('personal_access_tokens', function (Blueprint $table) {
            $table->id();

            // uuidMorphs (not morphs) — tokenable_id must be UUID to match
            // the User model's primary key type (HasUuids trait). The default
            // morphs() creates a bigint column, which breaks Sanctum's token
            // cleanup queries against UUID-keyed models with a Postgres
            // "invalid input syntax for type bigint" error.
            $table->uuidMorphs('tokenable');

            $table->string('name');
            $table->string('token', 64)->unique();
            $table->text('abilities')->nullable();
            $table->timestamp('last_used_at')->nullable();
            $table->timestamp('expires_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('personal_access_tokens');
    }
};
