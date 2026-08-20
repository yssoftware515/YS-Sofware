<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Milestones — the stage markers of a delivery (e.g. "Beta ready",
 * "Launch"). Milestones are per-project, keep an explicit order, and
 * share the same closed-status and completed_at reconciliation rules as
 * tasks.
 *
 * The plan scope: date + order + status. No Gantt, no dependencies, no
 * effort tracking — this is an operational marker, not a scheduling tool.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('milestones', function (Blueprint $table) {
            $table->uuid('id')->primary();

            $table->foreignUuid('project_id')->constrained('projects')->cascadeOnDelete();

            $table->string('title', 180);
            $table->text('description')->nullable();

            // pending | in_progress | completed | cancelled
            $table->string('status', 20)->default('pending');

            $table->date('target_date')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->unsignedInteger('sort_order')->default(0);

            $table->foreignUuid('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['project_id', 'status']);
            $table->index('target_date');
            $table->index(['project_id', 'sort_order']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('milestones');
    }
};
