<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Business-operations fields for the customer record (Sprint 6).
 *
 * `customers` is the platform's single real-world-entity table for
 * people/companies that buy or request work from YS System. The existing
 * table already holds identity + contact data; this migration adds the
 * minimal business-operations columns required to distinguish individuals
 * from companies, capture an optional WhatsApp contact, and support a
 * soft "archive instead of delete" lifecycle.
 *
 * Deliberately NOT added (no business requirement yet): title, address,
 * tax ids, tags, segments, consent history — a future YS-CRM owns those.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('customers', function (Blueprint $table) {
            $table->string('type', 20)->default('company')->after('id'); // individual | company
            $table->string('whatsapp', 30)->nullable()->after('phone');
            $table->string('status', 20)->default('active')->after('whatsapp'); // active | archived
        });
    }

    public function down(): void
    {
        Schema::table('customers', function (Blueprint $table) {
            foreach (['type', 'whatsapp', 'status'] as $column) {
                DB::statement("ALTER TABLE customers DROP COLUMN IF EXISTS {$column}");
            }
        });
    }
};
