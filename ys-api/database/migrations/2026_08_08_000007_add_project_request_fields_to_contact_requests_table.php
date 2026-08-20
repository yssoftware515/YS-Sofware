<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Project-request fields that turn the generic contact form into a
 * structured request experience: the customer tells us what they need,
 * how they'd like to be reached, their rough budget and timeline, plus
 * a small set of optional contextual answers (JSON, free-form keys).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('contact_requests', function (Blueprint $table) {
            $table->string('company_name', 120)->nullable()->after('name');
            $table->string('contact_preference', 20)->nullable()->after('email');
            $table->string('phone', 30)->nullable()->after('contact_preference');
            $table->string('budget_range', 24)->nullable()->after('phone');
            $table->string('timeline', 24)->nullable()->after('budget_range');
            $table->json('details')->nullable()->after('message');
        });
    }

    public function down(): void
    {
        Schema::table('contact_requests', function (Blueprint $table) {
            // dropColumnIfExists is not available; use IF EXISTS so the
            // rollback also works for databases created from the earlier
            // revision of this migration (which lacked the phone column).
            foreach (['company_name', 'contact_preference', 'phone', 'budget_range', 'timeline', 'details'] as $column) {
                DB::statement("ALTER TABLE contact_requests DROP COLUMN IF EXISTS {$column}");
            }
        });
    }
};
