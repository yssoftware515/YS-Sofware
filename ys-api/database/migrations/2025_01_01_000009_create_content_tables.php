<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // ── ROADMAP ──────────────────────────────────────────────────
        Schema::create('roadmap_items', function (Blueprint $table) {
            $table->uuid('id')->primary();

            $table->foreignUuid('product_id')->nullable()->constrained('products')->nullOnDelete();

            $table->string('title_en');
            $table->string('title_ar');
            $table->text('description_en')->nullable();
            $table->text('description_ar')->nullable();

            // planned | in_progress | completed | cancelled
            $table->string('status')->default('planned');

            // low | medium | high | critical
            $table->string('priority')->default('medium');

            $table->string('target_version')->nullable();
            $table->string('target_quarter')->nullable();  // "Q2 2025"

            $table->boolean('is_public')->default(true);
            $table->unsignedSmallInteger('sort_order')->default(0);

            $table->foreignUuid('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['status', 'sort_order']);
            $table->index(['product_id', 'status']);
        });

        // ── UPDATES / ANNOUNCEMENTS ───────────────────────────────────
        Schema::create('updates', function (Blueprint $table) {
            $table->uuid('id')->primary();

            $table->foreignUuid('product_id')->nullable()->constrained('products')->nullOnDelete();

            $table->string('title_en');
            $table->string('title_ar');
            $table->text('content_en');
            $table->text('content_ar');

            // announcement | blog | news | release
            $table->string('type')->default('announcement');

            $table->boolean('is_featured')->default(false);
            $table->timestamp('published_at')->nullable();  // null = draft

            $table->foreignUuid('author_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['published_at', 'type']);
            $table->index('is_featured');
        });

        // ── DOCUMENTATION CATEGORIES ──────────────────────────────────
        Schema::create('documentation_categories', function (Blueprint $table) {
            $table->uuid('id')->primary();

            $table->foreignUuid('product_id')->nullable()->constrained('products')->nullOnDelete();

            // Self-referencing FK — PostgreSQL requires explicit references() on UUID PKs
            // Using constrained() fails because PostgreSQL needs the referenced column
            // to be explicitly declared as UNIQUE or PRIMARY KEY in the constraint definition.
            $table->uuid('parent_id')->nullable();

            $table->string('slug')->unique();
            $table->string('title_en');
            $table->string('title_ar');
            $table->unsignedSmallInteger('sort_order')->default(0);

            $table->timestamps();

            $table->index(['product_id', 'sort_order']);
            $table->index('parent_id');
        });

        // Add the self-referencing FK after table creation
        // This is the correct PostgreSQL pattern for UUID self-relations
        Schema::table('documentation_categories', function (Blueprint $table) {
            $table->foreign('parent_id')
                ->references('id')
                ->on('documentation_categories')
                ->nullOnDelete();
        });

        // ── DOCUMENTATION ARTICLES ────────────────────────────────────
        Schema::create('documentation_articles', function (Blueprint $table) {
            $table->uuid('id')->primary();

            $table->foreignUuid('category_id')->constrained('documentation_categories')->cascadeOnDelete();

            $table->string('slug')->unique();
            $table->string('title_en');
            $table->string('title_ar');
            $table->longText('content_en');
            $table->longText('content_ar');

            // e.g. "v2.x" — null = applies to all versions
            $table->string('version_tag')->nullable();

            $table->unsignedSmallInteger('reading_time_minutes')->nullable();
            $table->boolean('is_published')->default(false);
            $table->unsignedSmallInteger('sort_order')->default(0);

            $table->foreignUuid('author_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['category_id', 'sort_order']);
            $table->index('is_published');
        });

        // ── CONTACT REQUESTS ──────────────────────────────────────────
        Schema::create('contact_requests', function (Blueprint $table) {
            $table->uuid('id')->primary();

            $table->string('name');
            $table->string('email');
            $table->string('subject')->nullable();
            $table->text('message');

            // general | sales | support | partnership
            $table->string('type')->default('general');

            // new | read | replied | archived
            $table->string('status')->default('new');

            // Security & anti-spam
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->float('spam_score')->default(0.0);

            $table->foreignUuid('handled_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('handled_at')->nullable();

            $table->timestamps();

            $table->index(['status', 'type']);
            $table->index('created_at');
        });

        // ── CAREERS ───────────────────────────────────────────────────
        Schema::create('careers', function (Blueprint $table) {
            $table->uuid('id')->primary();

            $table->string('title_en');
            $table->string('title_ar');
            $table->string('department');
            $table->string('location')->default('Remote');

            // full_time | part_time | contract | internship
            $table->string('type')->default('full_time');

            $table->text('description_en')->nullable();
            $table->text('description_ar')->nullable();
            $table->jsonb('requirements')->nullable();    // ["Req 1", "Req 2"]
            $table->jsonb('responsibilities')->nullable();

            // open | closed | draft
            $table->string('status')->default('draft');

            $table->boolean('is_featured')->default(false);
            $table->unsignedSmallInteger('sort_order')->default(0);

            $table->foreignUuid('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['status', 'department']);
        });

        // ── COMPANY TIMELINE ──────────────────────────────────────────
        Schema::create('timeline_entries', function (Blueprint $table) {
            $table->uuid('id')->primary();

            $table->string('title_en');
            $table->string('title_ar');
            $table->text('description_en')->nullable();
            $table->text('description_ar')->nullable();

            $table->date('event_date');

            // founding | product_launch | milestone | award | partnership
            $table->string('type')->default('milestone');

            $table->foreignUuid('product_id')->nullable()->constrained('products')->nullOnDelete();

            $table->boolean('is_public')->default(true);
            $table->unsignedSmallInteger('sort_order')->default(0);

            $table->timestamps();

            $table->index(['event_date', 'type']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('timeline_entries');
        Schema::dropIfExists('careers');
        Schema::dropIfExists('contact_requests');
        Schema::dropIfExists('documentation_articles');

        // Drop self-referencing FK before dropping the table
        if (Schema::hasTable('documentation_categories')) {
            Schema::table('documentation_categories', function (Blueprint $table) {
                $table->dropForeign(['parent_id']);
            });
        }
        Schema::dropIfExists('documentation_categories');

        Schema::dropIfExists('updates');
        Schema::dropIfExists('roadmap_items');
    }
};
