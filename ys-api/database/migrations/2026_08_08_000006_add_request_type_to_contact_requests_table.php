<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Customer request entry points (Sprint 2 — "What do you need?").
     * Adds the request-type dimension to the public contact form so
     * potential customers are guided to the right channel, without a
     * giant questionnaire. The existing `type` column (general|sales|
     * support|partnership) stays — it maps the channel internally;
     * `request_type` is what the customer says they need.
     */
    public function up(): void
    {
        Schema::table('contact_requests', function (Blueprint $table) {
            // website | web_platform | mobile_app | saas | ai_solution |
            // ai_agent | automation | crm | ui_ux | branding |
            // custom_software | integration | other
            $table->string('request_type')->nullable()->after('type');
            $table->index('request_type');
        });
    }

    public function down(): void
    {
        Schema::table('contact_requests', function (Blueprint $table) {
            $table->dropIndex(['request_type']);
            $table->dropColumn('request_type');
        });
    }
};
