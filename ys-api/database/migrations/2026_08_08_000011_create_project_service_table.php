<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * project ↔ service many-to-many: the concrete deliverable services a
 * project engages (UI/UX design, mobile development, AI integration, ...).
 *
 * The pivot references the real `services` catalog instead of duplicating
 * free-text service names — a project's service list stays traceable,
 * countable, and filterable without inventing parallel entities.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('project_service', function (Blueprint $table) {
            $table->foreignUuid('project_id')->constrained('projects')->cascadeOnDelete();
            $table->foreignUuid('service_id')->constrained('services')->cascadeOnDelete();

            $table->primary(['project_id', 'service_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('project_service');
    }
};
