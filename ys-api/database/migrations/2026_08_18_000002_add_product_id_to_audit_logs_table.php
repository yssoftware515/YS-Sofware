<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * F-003 (Phase 5A): audit rows now carry the tenant anchor (product_id)
 * captured at write time, so product-scoped admins can only read audit
 * events belonging to products they can access.
 *
 * NULL product_id = system/global event (auth, users, roles, settings,
 * global customers, unlinked contact requests...) — visible to every
 * view_audit_logs holder, mirroring the global-content convention.
 *
 * No FK is added deliberately: audit rows are immutable history and must
 * survive resource deletion (products are soft-deleted; the audit trail
 * is append-only evidence, not referential data).
 *
 * Backfill: existing rows whose tenant ownership can still be determined
 * from live resources are stamped; rows whose resource is gone remain
 * NULL (company-level) — ownership is no longer determinable for them.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('audit_logs', function (Blueprint $table) {
            $table->uuid('product_id')->nullable()->after('resource_id');
            $table->index('product_id');
        });

        // ── Backfill: product-scoped resource types ────────────────────

        DB::statement(<<<'SQL'
            UPDATE audit_logs a
            SET product_id = c.product_id
            FROM customers c
            WHERE a.resource_type = 'Customer' AND a.resource_id::text = c.id::text AND a.product_id IS NULL
        SQL);

        DB::statement(<<<'SQL'
            UPDATE audit_logs a
            SET product_id = c.product_id
            FROM contact_requests cr
            JOIN customers c ON c.id = cr.customer_id
            WHERE a.resource_type = 'ContactRequest' AND a.resource_id::text = cr.id::text AND a.product_id IS NULL
        SQL);

        DB::statement(<<<'SQL'
            UPDATE audit_logs a
            SET product_id = c.product_id
            FROM projects p
            JOIN customers c ON c.id = p.customer_id
            WHERE a.resource_type = 'Project' AND a.resource_id::text = p.id::text AND a.product_id IS NULL
        SQL);

        DB::statement(<<<'SQL'
            UPDATE audit_logs a
            SET product_id = c.product_id
            FROM tasks t
            JOIN projects p ON p.id = t.project_id
            JOIN customers c ON c.id = p.customer_id
            WHERE a.resource_type = 'Task' AND a.resource_id::text = t.id::text AND a.product_id IS NULL
        SQL);

        DB::statement(<<<'SQL'
            UPDATE audit_logs a
            SET product_id = c.product_id
            FROM milestones m
            JOIN projects p ON p.id = m.project_id
            JOIN customers c ON c.id = p.customer_id
            WHERE a.resource_type = 'Milestone' AND a.resource_id::text = m.id::text AND a.product_id IS NULL
        SQL);

        DB::statement(<<<'SQL'
            UPDATE audit_logs a
            SET product_id = s.product_id
            FROM subscriptions s
            WHERE a.resource_type = 'Subscription' AND a.resource_id::text = s.id::text AND a.product_id IS NULL
        SQL);

        DB::statement(<<<'SQL'
            UPDATE audit_logs a
            SET product_id = r.product_id
            FROM product_releases r
            WHERE a.resource_type = 'ProductRelease' AND a.resource_id::text = r.id::text AND a.product_id IS NULL
        SQL);

        DB::statement(<<<'SQL'
            UPDATE audit_logs a
            SET product_id = f.product_id
            FROM feature_flags f
            WHERE a.resource_type = 'FeatureFlag' AND a.resource_id::text = f.id::text AND a.product_id IS NULL
        SQL);

        DB::statement(<<<'SQL'
            UPDATE audit_logs a
            SET product_id = r.product_id
            FROM roadmap_items r
            WHERE a.resource_type = 'RoadmapItem' AND a.resource_id::text = r.id::text AND a.product_id IS NULL
        SQL);

        DB::statement(<<<'SQL'
            UPDATE audit_logs a
            SET product_id = u.product_id
            FROM updates u
            WHERE a.resource_type = 'Update' AND a.resource_id::text = u.id::text AND a.product_id IS NULL
        SQL);

        DB::statement(<<<'SQL'
            UPDATE audit_logs a
            SET product_id = t.product_id
            FROM timeline_entries t
            WHERE a.resource_type = 'TimelineEntry' AND a.resource_id::text = t.id::text AND a.product_id IS NULL
        SQL);

        DB::statement(<<<'SQL'
            UPDATE audit_logs a
            SET product_id = c.product_id
            FROM documentation_categories c
            WHERE a.resource_type = 'DocumentationCategory' AND a.resource_id::text = c.id::text AND a.product_id IS NULL
        SQL);

        DB::statement(<<<'SQL'
            UPDATE audit_logs a
            SET product_id = c.product_id
            FROM documentation_articles art
            JOIN documentation_categories c ON c.id = art.category_id
            WHERE a.resource_type = 'DocumentationArticle' AND a.resource_id::text = art.id::text AND a.product_id IS NULL
        SQL);

        DB::statement(<<<'SQL'
            UPDATE audit_logs a
            SET product_id = p.id
            FROM products p
            WHERE a.resource_type = 'Product' AND a.resource_id::text = p.id::text AND a.product_id IS NULL
        SQL);
    }

    public function down(): void
    {
        Schema::table('audit_logs', function (Blueprint $table) {
            $table->dropIndex(['product_id']);
            $table->dropColumn('product_id');
        });
    }
};