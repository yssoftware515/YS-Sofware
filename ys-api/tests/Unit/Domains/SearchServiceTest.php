<?php

namespace Tests\Unit\Domains;

use App\Domains\Search\Contracts\SearchDriver;
use App\Domains\Search\DTOs\SearchResultCollection;
use App\Domains\Search\SearchRules;
use App\Domains\Search\Services\SearchService;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/**
 * SearchService owns the request-independent decisions (locale fallback,
 * limit clamping) while the driver owns execution. These tests pin that
 * split without touching the database.
 */
class SearchServiceTest extends TestCase
{
    private RecordingSearchDriver $driver;

    private SearchService $service;

    protected function setUp(): void
    {
        parent::setUp();

        $this->driver = new RecordingSearchDriver;
        $this->service = new SearchService($this->driver);
    }

    public function test_it_forwards_explicit_query_types_locale_and_limit(): void
    {
        $this->service->search('matrix', ['service'], 'ar', 7);

        $this->assertSame([[
            'query' => 'matrix',
            'types' => ['service'],
            'locale' => 'ar',
            'limit' => 7,
        ]], $this->driver->calls);
    }

    public function test_it_defaults_locale_to_the_application_locale(): void
    {
        app()->setLocale('ar');

        $this->service->search('matrix');

        $this->assertSame('ar', $this->driver->calls[0]['locale']);
        $this->assertSame([], $this->driver->calls[0]['types']);
    }

    public function test_it_defaults_limit_to_the_contract_default(): void
    {
        $this->service->search('matrix');

        $this->assertSame(SearchRules::DEFAULT_LIMIT, $this->driver->calls[0]['limit']);
    }

    public function test_it_clamps_limit_to_the_contract_bounds(): void
    {
        $this->service->search('matrix', [], 'en', 999);
        $this->service->search('matrix', [], 'en', 0);
        $this->service->search('matrix', [], 'en', -5);

        $this->assertSame(SearchRules::MAX_LIMIT, $this->driver->calls[0]['limit']);
        $this->assertSame(1, $this->driver->calls[1]['limit']);
        $this->assertSame(1, $this->driver->calls[2]['limit']);
    }

    public function test_it_adds_no_database_queries(): void
    {
        DB::flushQueryLog();
        DB::enableQueryLog();

        $this->service->search('matrix', [], 'en', 10);

        $this->assertSame([], DB::getQueryLog());
    }
}

/**
 * Records the criteria passed through the service; returns an empty
 * result so the test never needs a database.
 */
final class RecordingSearchDriver implements SearchDriver
{
    /** @var array<int, array{query: string, types: array<int, string>, locale: string, limit: int}> */
    public array $calls = [];

    public function search(
        string $query,
        array $types = [],
        string $locale = 'en',
        int $limit = SearchRules::DEFAULT_LIMIT,
    ): SearchResultCollection {
        $this->calls[] = compact('query', 'types', 'locale', 'limit');

        return new SearchResultCollection(
            results: collect(),
            total: 0,
            query: $query,
            driver: 'recording',
            tookMs: 0.0,
        );
    }
}
