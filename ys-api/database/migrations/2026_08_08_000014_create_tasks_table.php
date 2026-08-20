<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Tasks — the executable work inside a project (engagement delivery).
 *
 * A task is deliberately NOT a project and NOT a CRM follow-up: it is a
 * concrete, statused work item inside an admin-managed delivery. Tasks
 * live and die with their project (cascade delete) — an orphan task has
 * no meaning in this system.
 *
 * Status lifecycle: todo → in_progress → blocked / completed / cancelled
 * (small and closed, mirroring the project lifecycle conventions).
 * completed_at is ALWAYS reconciled with status by LifecycleService —
 * never stored by hand.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tasks', function (Blueprint $table) {
            $table->uuid('id')->primary();

            $table->foreignUuid('project_id')->constrained('projects')->cascadeOnDelete();

            $table->string('title', 180);
            $table->text('description')->nullable();

            // todo | in_progress | blocked | completed | cancelled
            $table->string('status', 20)->default('todo');
            // low | normal | high | urgent
            $table->string('priority', 10)->default('normal');

            $table->date('due_date')->nullable();
            $table->timestamp('completed_at')->nullable();

            $table->foreignUuid('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['project_id', 'status']);
            $table->index('due_date');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tasks');
    }
};
