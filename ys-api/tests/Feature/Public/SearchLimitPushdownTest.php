<?php

namespace Tests\Feature\Public;

use App\Domains\Search\Contracts\SearchDriver;
use App\Domains\Search\Services\SearchService;
use App\Domains\Services\Models\Service;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\TestCase;

/**
 * VULN-19: the search driver must push LIMIT into each per-type SQL
 * query BEFORE hydration (never fetch the full match set and take() in
 * PHP), and derive `total` from real COUNT queries. Ranking and the
 * final limit behavior must be unchanged.
 *
 * Scope note (Group C): the searchable types are the public content that
 * still has a live route — services, static pages and FAQs. The CMS
 * models/endpoints were removed, but the tables are retained (no schema
 * change), so the page/FAQ rows are inserted directly here to keep the
 * VULN-19 guarantee regression-tested.
 */
class SearchLimitPushdownTest extends TestCase
{
    use RefreshDatabase;

    private function seedSearchFixtures(): void
    {
        // 40 matching services — far more than any test limit. The
        // exact-title service ("matrix") sorts above the others.
        foreach (range(1, 40) as $i) {
            Service::factory()->active()->create([
                'name_en' => $i === 1
                    ? 'matrix'
                    : 'matrix engine release '.$i.' '.implode(' ', array_fill(0, 12, 'extension')),
                'slug' => "matrix-service-{$i}",
            ]);
        }

        // Cross-type matches so the merged result spans all three types.
        // The CMS domain was removed in Group C; the tables remain, so the
        // rows are inserted directly instead of through a factory.
        $now = now();
        DB::table('static_pages')->insert([
            'id' => (string) Str::uuid(),
            'slug' => 'matrix-platform',
            'title_en' => 'matrix platform page',
            'title_ar' => 'صفحة منصة',
            'excerpt_en' => null,
            'excerpt_ar' => null,
            'status' => 'published',
            'published_at' => $now,
            'sort_order' => 0,
            'created_at' => $now,
            'updated_at' => $now,
        ]);
        DB::table('faqs')->insert([
            'id' => (string) Str::uuid(),
            'question_en' => 'matrix question?',
            'question_ar' => 'سؤال؟',
            'answer_en' => 'matrix answer',
            'answer_ar' => 'إجابة',
            'category' => null,
            'status' => 'published',
            'sort_order' => 0,
            'created_at' => $now,
            'updated_at' => $now,
        ]);
    }

    public function test_search_queries_contain_sql_limit_and_count_pushdown(): void
    {
        $this->seedSearchFixtures();

        DB::flushQueryLog();
        DB::enableQueryLog();

        app(SearchDriver::class)->search('matrix', [], 'en', 10);

        $queries = collect(DB::getQueryLog())->pluck('query')->implode("\n");

        // Every per-type query must be SQL-bounded (LIMIT ?), not
        // hydrated in full and trimmed in PHP.
        foreach (['services', 'static_pages', 'faqs'] as $table) {
            $this->assertMatchesRegularExpression(
                '/from "'.preg_quote($table, '/').'".*limit/si',
                $queries,
                "Expected an SQL LIMIT on the {$table} query"
            );
        }

        // total must come from COUNT aggregates, not collection sizes.
        $this->assertMatchesRegularExpression('/select count\(\*\) as aggregate/si', $queries);
    }

    public function test_results_are_ranked_and_limited(): void
    {
        $this->seedSearchFixtures();

        $result = app(SearchDriver::class)->search('matrix', [], 'en', 10);

        $this->assertCount(10, $result->results);
        $this->assertSame(10, $result->results->unique('id')->count());

        // Ranked by relevance, descending.
        $ranks = $result->results->pluck('rank')->all();
        $descending = $ranks;
        rsort($descending);
        $this->assertSame($descending, $ranks);

        // Services come first (type order), and within them the exact
        // title sorts first.
        $this->assertSame('service', $result->results->first()->type);
        $this->assertSame('/en/services/matrix-service-1', $result->results->first()->url);
    }

    public function test_total_is_a_real_count_across_all_types(): void
    {
        $this->seedSearchFixtures();

        $result = app(SearchDriver::class)->search('matrix', [], 'en', 10);

        $this->assertSame(42, $result->total); // 40 services + 1 page + 1 faq
        $this->assertCount(10, $result->results);
    }

    public function test_public_endpoint_contract_is_unchanged(): void
    {
        $this->seedSearchFixtures();

        $this->getJson('/api/v1/public/search?q=matrix&locale=en&limit=10')
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.meta.total', 42)
            ->assertJsonPath('data.meta.driver', 'postgres')
            ->assertJsonCount(10, 'data.results')
            ->assertJsonStructure([
                'data' => [
                    'results' => [
                        ['type', 'id', 'title', 'excerpt', 'url', 'rank', 'meta'],
                    ],
                    'grouped',
                    'meta' => ['total', 'query', 'took_ms', 'driver'],
                ],
            ]);

        // Type-filtered search still works and counts only that type.
        $this->getJson('/api/v1/public/search?q=matrix&types[]=service&limit=5')
            ->assertOk()
            ->assertJsonPath('data.meta.total', 40)
            ->assertJsonCount(5, 'data.results');
    }

    public function test_service_layer_delegates_to_the_bound_driver(): void
    {
        $this->seedSearchFixtures();

        $result = app(SearchService::class)->search('matrix', [], 'en', 5);

        $this->assertSame('postgres', $result->driver);
        $this->assertSame(42, $result->total);
        $this->assertCount(5, $result->results);
    }

    public function test_grouped_results_keep_one_key_per_type(): void
    {
        $this->seedSearchFixtures();

        $grouped = $this->getJson('/api/v1/public/search?q=matrix&limit=50')
            ->assertOk()
            ->json('data.grouped');

        $this->assertArrayHasKey('service', $grouped);
        $this->assertArrayHasKey('page', $grouped);
        $this->assertArrayHasKey('faq', $grouped);
    }

    public function test_unknown_search_types_are_rejected(): void
    {
        $this->seedSearchFixtures();

        $this->getJson('/api/v1/public/search?q=matrix&types[]=career')
            ->assertStatus(422)
            ->assertJsonValidationErrors(['types.0']);
    }

    public function test_unknown_locale_is_rejected(): void
    {
        $this->seedSearchFixtures();

        $this->getJson('/api/v1/public/search?q=matrix&locale=fr')
            ->assertStatus(422)
            ->assertJsonValidationErrors(['locale']);
    }

    public function test_out_of_range_limits_are_rejected(): void
    {
        $this->seedSearchFixtures();

        $this->getJson('/api/v1/public/search?q=matrix&limit=0')
            ->assertStatus(422)
            ->assertJsonValidationErrors(['limit']);

        $this->getJson('/api/v1/public/search?q=matrix&limit=51')
            ->assertStatus(422)
            ->assertJsonValidationErrors(['limit']);
    }
}
