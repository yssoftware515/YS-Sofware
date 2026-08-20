<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Projects ← Contact Requests.
 *
 * A project born out of an inquiry keeps a pointer to the originating
 * request. One request may give birth to several projects; a project
 * points back to at most one request. The link is always set explicitly
 * by an admin (request detail page) and survives the request being
 * deleted — history is never silently broken.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('projects', function (Blueprint $table) {
            $table->foreignUuid('contact_request_id')
                ->nullable()
                ->after('customer_id')
                ->constrained('contact_requests')
                ->nullOnDelete();
            $table->index('contact_request_id');
        });
    }

    public function down(): void
    {
        Schema::table('projects', function (Blueprint $table) {
            $table->dropIndex(['contact_request_id']);
            $table->dropForeign(['contact_request_id']);
            $table->dropColumn('contact_request_id');
        });
    }
};
