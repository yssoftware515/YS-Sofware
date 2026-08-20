<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Projects — the internal record of commercial/delivery engagements.
 *
 * A project is a real piece of work YS System is delivering (or has
 * delivered) for a Customer. It is NOT a task manager, NOT a product
 * (products are company-owned software with their own release machinery)
 * and NOT a contact request (requests become projects only when actual
 * work starts).
 *
 * `quoted_value` stores the RECORDED commercial value of the engagement
 * (from the admin's data). It is deliberately NOT labeled revenue,
 * invoiced amounts, or accounting figures — those belong to a future
 * financial layer.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('projects', function (Blueprint $table) {
            $table->uuid('id')->primary();

            $table->foreignUuid('customer_id')->nullable()->constrained('customers')->nullOnDelete();

            $table->string('name');
            // project_type: website | web_platform | mobile_app | custom_software |
            // ai_solution | ai_automation | ui_ux | branding | integration | other
            $table->string('project_type', 40)->nullable();
            $table->text('description')->nullable();

            // draft | active | on_hold | completed | cancelled
            $table->string('status', 20)->default('draft');

            $table->date('start_date')->nullable();
            $table->date('expected_completion_date')->nullable();
            $table->timestamp('completed_at')->nullable();

            // Recorded commercial value (explicitly not accounting-grade):
            $table->decimal('quoted_value', 12, 2)->nullable();
            $table->char('currency', 3)->default('USD');

            $table->text('internal_notes')->nullable();

            $table->foreignUuid('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['status', 'customer_id']);
            $table->index('start_date');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('projects');
    }
};
