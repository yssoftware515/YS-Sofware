<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Link contact requests to customers (Sprint 6).
 *
 * A request may come from a new person, an existing customer, or an
 * existing company. The link is ALWAYS created by an administrator —
 * never automatically, never deduplicated by email. The request row stays
 * historically intact whichever way the admin goes; `customer_id` is only
 * set when an admin explicitly links or converts.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('contact_requests', function (Blueprint $table) {
            $table->foreignUuid('customer_id')->nullable()->after('id')
                ->constrained('customers')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('contact_requests', function (Blueprint $table) {
            $table->dropConstrainedForeignId('customer_id');
        });
    }
};
