<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Add PostgreSQL GENERATED ALWAYS AS tsvector columns to all searchable tables.
 *
 * Two columns per table (EN + AR) to support correct stemming per language.
 * GIN indexes for O(log n) full-text search performance.
 * websearch_to_tsquery() used in queries — handles arbitrary user input safely.
 */
return new class extends Migration
{
    public function up(): void
    {
        // ── Products ─────────────────────────────────────────────────
        DB::statement("
            ALTER TABLE products
            ADD COLUMN search_vector_en tsvector
                GENERATED ALWAYS AS (
                    setweight(to_tsvector('english', coalesce(name_en, '')), 'A') ||
                    setweight(to_tsvector('english', coalesce(short_desc_en, '')), 'B') ||
                    setweight(to_tsvector('english', coalesce(long_desc_en, '')), 'C')
                ) STORED
        ");

        DB::statement("
            ALTER TABLE products
            ADD COLUMN search_vector_ar tsvector
                GENERATED ALWAYS AS (
                    setweight(to_tsvector('arabic', coalesce(name_ar, '')), 'A') ||
                    setweight(to_tsvector('arabic', coalesce(short_desc_ar, '')), 'B') ||
                    setweight(to_tsvector('arabic', coalesce(long_desc_ar, '')), 'C')
                ) STORED
        ");

        DB::statement('CREATE INDEX idx_products_fts_en ON products USING GIN (search_vector_en)');
        DB::statement('CREATE INDEX idx_products_fts_ar ON products USING GIN (search_vector_ar)');

        // ── Documentation Articles ────────────────────────────────────
        DB::statement("
            ALTER TABLE documentation_articles
            ADD COLUMN search_vector_en tsvector
                GENERATED ALWAYS AS (
                    setweight(to_tsvector('english', coalesce(title_en, '')), 'A') ||
                    setweight(to_tsvector('english', coalesce(content_en, '')), 'B')
                ) STORED
        ");

        DB::statement("
            ALTER TABLE documentation_articles
            ADD COLUMN search_vector_ar tsvector
                GENERATED ALWAYS AS (
                    setweight(to_tsvector('arabic', coalesce(title_ar, '')), 'A') ||
                    setweight(to_tsvector('arabic', coalesce(content_ar, '')), 'B')
                ) STORED
        ");

        DB::statement('CREATE INDEX idx_docs_fts_en ON documentation_articles USING GIN (search_vector_en)');
        DB::statement('CREATE INDEX idx_docs_fts_ar ON documentation_articles USING GIN (search_vector_ar)');

        // ── Careers ───────────────────────────────────────────────────
        DB::statement("
            ALTER TABLE careers
            ADD COLUMN search_vector_en tsvector
                GENERATED ALWAYS AS (
                    setweight(to_tsvector('english', coalesce(title_en, '')), 'A') ||
                    setweight(to_tsvector('english', coalesce(department, '')), 'A') ||
                    setweight(to_tsvector('english', coalesce(description_en, '')), 'B')
                ) STORED
        ");

        DB::statement("
            ALTER TABLE careers
            ADD COLUMN search_vector_ar tsvector
                GENERATED ALWAYS AS (
                    setweight(to_tsvector('arabic', coalesce(title_ar, '')), 'A') ||
                    setweight(to_tsvector('arabic', coalesce(description_ar, '')), 'B')
                ) STORED
        ");

        DB::statement('CREATE INDEX idx_careers_fts_en ON careers USING GIN (search_vector_en)');
        DB::statement('CREATE INDEX idx_careers_fts_ar ON careers USING GIN (search_vector_ar)');

        // ── Updates ───────────────────────────────────────────────────
        DB::statement("
            ALTER TABLE updates
            ADD COLUMN search_vector_en tsvector
                GENERATED ALWAYS AS (
                    setweight(to_tsvector('english', coalesce(title_en, '')), 'A') ||
                    setweight(to_tsvector('english', coalesce(content_en, '')), 'B')
                ) STORED
        ");

        DB::statement("
            ALTER TABLE updates
            ADD COLUMN search_vector_ar tsvector
                GENERATED ALWAYS AS (
                    setweight(to_tsvector('arabic', coalesce(title_ar, '')), 'A') ||
                    setweight(to_tsvector('arabic', coalesce(content_ar, '')), 'B')
                ) STORED
        ");

        DB::statement('CREATE INDEX idx_updates_fts_en ON updates USING GIN (search_vector_en)');
        DB::statement('CREATE INDEX idx_updates_fts_ar ON updates USING GIN (search_vector_ar)');
    }

    public function down(): void
    {
        // Drop indexes first, then columns
        foreach (['products', 'documentation_articles', 'careers', 'updates'] as $table) {
            DB::statement("DROP INDEX IF EXISTS idx_{$table}_fts_en");
            DB::statement("DROP INDEX IF EXISTS idx_{$table}_fts_ar");
            DB::statement("ALTER TABLE {$table} DROP COLUMN IF EXISTS search_vector_en");
            DB::statement("ALTER TABLE {$table} DROP COLUMN IF EXISTS search_vector_ar");
        }
    }
};
