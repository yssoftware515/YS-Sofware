<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Sprint 7 — business control & data integrity.
 *
 * 1. `services.service_class` — a closed, admin-only business
 *    classification for the services catalog so management can answer
 *    "what are we selling and where" without free-text guessing:
 *      custom       → external/custom-delivery services (consulting, integrations)
 *      product       → service offerings related to the YS product catalog
 *      subscription  → recurring/subscription-style service offerings
 *    NULL = unclassified. Deliberately NOT exposed on public API routes.
 *
 * 2. Operational indexes for the filters and "needs attention"
 *    queries introduced in this sprint:
 *      customers.type / customers.status          (list filters)
 *      projects.project_type                      (list filter)
 *      projects.expected_completion_date          (overdue detection)
 *      contact_requests.customer_id               (link/unlink lookups)
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('services', function (Blueprint $table) {
            $table->string('service_class', 20)->nullable()->after('category');
        });

        Schema::table('customers', function (Blueprint $table) {
            $table->index('type');
            $table->index('status');
        });

        Schema::table('projects', function (Blueprint $table) {
            $table->index('project_type');
            $table->index('expected_completion_date');
        });

        Schema::table('contact_requests', function (Blueprint $table) {
            $table->index('customer_id');
        });
    }

    public function down(): void
    {
        Schema::table('contact_requests', function (Blueprint $table) {
            $table->dropIndex(['customer_id']);
        });

        Schema::table('projects', function (Blueprint $table) {
            $table->dropIndex(['project_type']);
            $table->dropIndex(['expected_completion_date']);
        });

        Schema::table('customers', function (Blueprint $table) {
            $table->dropIndex(['type']);
            $table->dropIndex(['status']);
        });

        Schema::table('services', function (Blueprint $table) {
            $table->dropColumn('service_class');
        });
    }
};
