<?php

namespace Tests\Feature\Public;

use App\Domains\Content\Models\Career;
use App\Domains\Content\Models\DocumentationArticle;
use App\Domains\Content\Models\DocumentationCategory;
use App\Domains\Content\Models\Update;
use App\Domains\Product\Models\Product;
use App\Domains\Search\Contracts\SearchDriver;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/**
 * VULN-19: the search driver must push LIMIT into each per-type SQL
 * query BEFORE hydration (never fetch the full match set and take() in
 * PHP), and derive `total` from real COUNT queries. Ranking and the
 * final limit behavior must be unchanged.
 */
class SearchLimitPushdownTest extends TestCase
{
    use RefreshDatabase;

    private function seedSearchFixtures(): void
    {
        // 40 matching products — far more than any test limit. The
        // exact-title product ("matrix") must rank above the others.
        foreach (range(1, 40) as $i) {
            Product::factory()->active()->create([
                'name_en' => $i === 1
                    ? 'matrix'
                    : 'matrix engine release '.$i.' '.implode(' ', array_fill(0, 12, 'extension')),
                'slug' => "matrix-product-{$i}",
            ]);
        }

        // Cross-type matches so the merged result spans all four types.
        $category = DocumentationCategory::factory()->create(['title_en' => 'Docs']);
        DocumentationArticle::factory()->published()->create([
            'category_id' => $category->id,
            'title_en' => 'matrix platform article',
        ]);
        Career::factory()->open()->create(['title_en' => 'matrix engineer']);
        Update::factory()->published()->create(['title_en' => 'matrix release update']);
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
        foreach (['products', 'documentation_articles', 'careers', 'updates'] as $table) {
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

        // The exact-title product is the top hit.
        $this->assertSame('product', $result->results->first()->type);
        $this->assertSame('matrix-product-1', $result->results->first()->url);
    }

    public function test_total_is_a_real_count_across_all_types(): void
    {
        $this->seedSearchFixtures();

        $result = app(SearchDriver::class)->search('matrix', [], 'en', 10);

        $this->assertSame(43, $result->total); // 40 products + 1 article + 1 career + 1 update
        $this->assertCount(10, $result->results);
    }

    public function test_public_endpoint_contract_is_unchanged(): void
    {
        $this->seedSearchFixtures();

        $this->getJson('/api/v1/public/search?q=matrix&locale=en&limit=10')
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.meta.total', 43)
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
        $this->getJson('/api/v1/public/search?q=matrix&types[]=product&limit=5')
            ->assertOk()
            ->assertJsonPath('data.meta.total', 40)
            ->assertJsonCount(5, 'data.results');
    }
}
