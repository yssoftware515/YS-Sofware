<?php

namespace Tests\Feature\Admin;

use App\Domains\Auth\Models\Role;
use App\Domains\Auth\Models\User;
use App\Domains\Content\Models\DocumentationArticle;
use App\Domains\Content\Models\DocumentationCategory;
use App\Domains\Product\Models\Product;
use App\Domains\Services\Models\Service;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * VULN-06: ungrouped `orWhere` in search filters attaches the OR
 * clauses at the TOP level of the WHERE statement, so a match on any
 * OR'd column bypasses the product scope AND every preceding filter
 * (status, role, category). All OR branches must be grouped inside a
 * `where(fn ...)` closure so precedence stays (scope AND filters AND
 * search).
 */
class ProductScopedContentSearchTest extends TestCase
{
    use RefreshDatabase;

    private Product $productA;

    private Product $productB;

    private User $scopedAdmin;

    protected function setUp(): void
    {
        parent::setUp();

        $this->productA = Product::factory()->active()->create(['slug' => 'product-a']);
        $this->productB = Product::factory()->active()->create(['slug' => 'product-b-only-me']);

        $role = Role::factory()->create([
            'slug' => 'content_scoped_'.uniqid(),
            'permissions' => [
                'manage_products',
                'manage_documentation',
                'view_services',
                'manage_users',
            ],
        ]);
        $this->scopedAdmin = User::factory()->create([
            'role_id' => $role->id,
            'is_active' => true,
        ]);
        $this->scopedAdmin->products()->attach($this->productA->id);

        Sanctum::actingAs($this->scopedAdmin, ['admin']);
    }

    public function test_product_search_cannot_reach_out_of_scope_product(): void
    {
        $this->getJson('/api/v1/admin/products?search=product-b-only-me')
            ->assertOk()
            ->assertJsonPath('meta.total', 0);
    }

    public function test_product_search_cannot_bypass_status_filter(): void
    {
        $probe = Product::factory()->active()->create(['slug' => 'in-scope-status-active']);
        $this->scopedAdmin->products()->attach($probe->id);

        $this->getJson('/api/v1/admin/products?search=in-scope-status-active&status=planned')
            ->assertOk()
            ->assertJsonPath('meta.total', 0);

        $this->getJson('/api/v1/admin/products?search=in-scope-status-active&status=active')
            ->assertOk()
            ->assertJsonPath('meta.total', 1);
    }

    public function test_product_search_still_finds_in_scope_rows_by_any_ored_column(): void
    {
        $probe = Product::factory()->active()->create(['slug' => 'in-scope-or-match']);
        $this->scopedAdmin->products()->attach($probe->id);

        $this->getJson('/api/v1/admin/products?search=in-scope-or-match')
            ->assertOk()
            ->assertJsonPath('meta.total', 1);
    }

    public function test_docs_article_search_cannot_reach_out_of_scope_category(): void
    {
        $foreignCategory = DocumentationCategory::factory()->create(['product_id' => $this->productB->id]);
        DocumentationArticle::factory()->create([
            'category_id' => $foreignCategory->id,
            'title_en' => 'secret-other-product-title',
        ]);

        $this->getJson('/api/v1/admin/docs/articles?search=secret-other-product-title')
            ->assertOk()
            ->assertJsonPath('meta.total', 0);
    }

    public function test_docs_article_search_respects_category_filter_and_finds_own(): void
    {
        $ownCategory = DocumentationCategory::factory()->create(['product_id' => $this->productA->id]);
        $otherCategory = DocumentationCategory::factory()->create(['product_id' => $this->productA->id]);
        $ownArticle = DocumentationArticle::factory()->published()->create([
            'category_id' => $ownCategory->id,
            'title_en' => 'unique-own-article-title',
        ]);
        DocumentationArticle::factory()->published()->create([
            'category_id' => $otherCategory->id,
            'title_en' => 'unique-own-article-title',
        ]);

        $response = $this->getJson('/api/v1/admin/docs/articles?search=unique-own-article-title')
            ->assertOk();
        $this->assertSame(2, $response->json('meta.total'));

        $response = $this->getJson('/api/v1/admin/docs/articles?search=unique-own-article-title&category_id='.$ownCategory->id)
            ->assertOk();
        $this->assertSame(1, $response->json('meta.total'));
        $this->assertSame($ownArticle->id, $response->json('data.0.id'));
    }

    public function test_service_search_cannot_bypass_status_filter(): void
    {
        Service::factory()->active()->create(['slug' => 'service-status-probe']);
        Service::factory()->create(['slug' => 'service-status-probe-2', 'status' => Service::STATUS_INACTIVE]);

        $this->getJson('/api/v1/admin/services?search=service-status-probe&status=inactive')
            ->assertOk()
            ->assertJsonPath('meta.total', 1);

        $this->getJson('/api/v1/admin/services?search=service-status-probe&status=active')
            ->assertOk()
            ->assertJsonPath('meta.total', 1);
    }

    public function test_user_search_cannot_bypass_role_filter(): void
    {
        $targetRole = Role::factory()->create(['slug' => 'target-role-'.uniqid()]);
        $otherRole = Role::factory()->create(['slug' => 'other-role-'.uniqid()]);

        User::factory()->create([
            'role_id' => $targetRole->id,
            'email' => 'role-target-probe@example.com',
        ]);

        $this->getJson('/api/v1/admin/users?search=role-target-probe&role='.$otherRole->slug)
            ->assertOk()
            ->assertJsonPath('meta.total', 0);

        $this->getJson('/api/v1/admin/users?search=role-target-probe&role='.$targetRole->slug)
            ->assertOk()
            ->assertJsonPath('meta.total', 1);
    }
}
