<?php

namespace Tests\Feature\Admin;

use App\Domains\Auth\Models\Role;
use App\Domains\Auth\Models\User;
use App\Domains\Content\Actions\UpdateDocumentationCategoryAction;
use App\Domains\Content\Models\DocumentationArticle;
use App\Domains\Content\Models\DocumentationCategory;
use App\Domains\Product\Models\Product;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Tests\TestCase;

class DocumentationTest extends TestCase
{
    use RefreshDatabase;

    // ── Categories ───────────────────────────────────────────────────

    public function test_can_create_documentation_category(): void
    {
        $this->actingAsSuperAdmin();

        $response = $this->postJson('/api/v1/admin/docs/categories', [
            'slug' => 'getting-started',
            'title_en' => 'Getting Started',
            'title_ar' => 'البدء',
        ]);

        $response->assertStatus(201)->assertJsonPath('data.slug', 'getting-started');
        $this->assertDatabaseHas('documentation_categories', ['slug' => 'getting-started']);
    }

    public function test_category_slug_must_be_unique(): void
    {
        $this->actingAsSuperAdmin();
        DocumentationCategory::factory()->create(['slug' => 'getting-started']);

        $response = $this->postJson('/api/v1/admin/docs/categories', [
            'slug' => 'getting-started',
            'title_en' => 'Another',
            'title_ar' => 'آخر',
        ]);

        $response->assertStatus(422)->assertJsonValidationErrors(['slug']);
    }

    public function test_cannot_set_category_as_its_own_parent(): void
    {
        $this->actingAsSuperAdmin();
        $category = DocumentationCategory::factory()->create();

        $response = $this->putJson("/api/v1/admin/docs/categories/{$category->id}", [
            'parent_id' => $category->id,
        ]);

        $response->assertStatus(422);
    }

    public function test_cannot_delete_category_with_articles(): void
    {
        $this->actingAsSuperAdmin();
        $category = DocumentationCategory::factory()->create();
        DocumentationArticle::factory()->create(['category_id' => $category->id]);

        $response = $this->deleteJson("/api/v1/admin/docs/categories/{$category->id}");

        $response->assertStatus(422);
        $this->assertDatabaseHas('documentation_categories', ['id' => $category->id]);
    }

    // ── Articles ─────────────────────────────────────────────────────

    public function test_can_create_documentation_article(): void
    {
        $this->actingAsSuperAdmin();
        $category = DocumentationCategory::factory()->create();

        $response = $this->postJson('/api/v1/admin/docs/articles', [
            'category_id' => $category->id,
            'slug' => 'installation-guide',
            'title_en' => 'Installation Guide',
            'title_ar' => 'دليل التثبيت',
            'content_en' => 'This guide walks you through the installation process step by step.',
            'content_ar' => 'يرشدك هذا الدليل خلال عملية التثبيت خطوة بخطوة.',
        ]);

        $response->assertStatus(201)->assertJsonPath('data.slug', 'installation-guide');
    }

    public function test_article_reading_time_is_auto_calculated(): void
    {
        $this->actingAsSuperAdmin();
        $category = DocumentationCategory::factory()->create();

        // ~400 words = ~2 minutes reading time
        $content = implode(' ', array_fill(0, 400, 'word'));

        $response = $this->postJson('/api/v1/admin/docs/articles', [
            'category_id' => $category->id,
            'slug' => 'long-article',
            'title_en' => 'Long Article',
            'title_ar' => 'مقالة طويلة',
            'content_en' => $content,
            'content_ar' => 'محتوى',
        ]);

        $response->assertStatus(201);
        $this->assertGreaterThanOrEqual(2, $response->json('data.reading_time_minutes'));
    }

    public function test_published_articles_appear_in_public_api(): void
    {
        $category = DocumentationCategory::factory()->create();
        DocumentationArticle::factory()->create([
            'category_id' => $category->id,
            'slug' => 'public-article',
            'is_published' => true,
        ]);

        $response = $this->getJson('/api/v1/public/docs/public-article');

        $response->assertStatus(200)->assertJsonPath('data.slug', 'public-article');
    }

    public function test_unpublished_articles_are_hidden_from_public(): void
    {
        $category = DocumentationCategory::factory()->create();
        DocumentationArticle::factory()->create([
            'category_id' => $category->id,
            'slug' => 'draft-article',
            'is_published' => false,
        ]);

        $response = $this->getJson('/api/v1/public/docs/draft-article');

        $response->assertStatus(404);
    }

    // ── INT-009: product_id tenant-scoping on category update ─────────

    public function test_admin_can_update_category_product_id(): void
    {
        $this->actingAsSuperAdmin();
        $product = Product::factory()->create();
        $category = DocumentationCategory::factory()->create();

        $response = $this->putJson("/api/v1/admin/docs/categories/{$category->id}", [
            'product_id' => $product->id,
        ]);

        $response->assertStatus(200);
        $this->assertDatabaseHas('documentation_categories', ['id' => $category->id, 'product_id' => $product->id]);
    }

    public function test_admin_can_move_category_back_to_general_with_null_product_id(): void
    {
        $this->actingAsSuperAdmin();
        $product = Product::factory()->create();
        $category = DocumentationCategory::factory()->create(['product_id' => $product->id]);

        $response = $this->putJson("/api/v1/admin/docs/categories/{$category->id}", [
            'product_id' => null,
        ]);

        $response->assertStatus(200);
        $this->assertDatabaseHas('documentation_categories', ['id' => $category->id, 'product_id' => null]);
    }

    public function test_scoped_admin_can_assign_category_to_an_owned_product(): void
    {
        [$user, $productA] = $this->scopedDocsAdmin();
        $category = DocumentationCategory::factory()->create();

        $response = $this->putJson("/api/v1/admin/docs/categories/{$category->id}", [
            'product_id' => $productA->id,
        ]);

        $response->assertStatus(200);
        $this->assertDatabaseHas('documentation_categories', ['id' => $category->id, 'product_id' => $productA->id]);
    }

    public function test_scoped_admin_cannot_assign_category_to_an_out_of_scope_product(): void
    {
        [$user, $productA] = $this->scopedDocsAdmin();
        $foreignProduct = Product::factory()->create();
        $category = DocumentationCategory::factory()->create();

        $response = $this->putJson("/api/v1/admin/docs/categories/{$category->id}", [
            'product_id' => $foreignProduct->id,
        ]);

        $response->assertStatus(403);
        $this->assertDatabaseHas('documentation_categories', ['id' => $category->id, 'product_id' => null]);
    }

    public function test_scoped_admin_cannot_update_a_category_of_a_product_they_do_not_own(): void
    {
        [$user, $productA] = $this->scopedDocsAdmin();
        $foreignProduct = Product::factory()->create();
        $category = DocumentationCategory::factory()->create(['product_id' => $foreignProduct->id]);

        $response = $this->putJson("/api/v1/admin/docs/categories/{$category->id}", [
            'title_en' => 'Sneaky title',
        ]);

        $response->assertStatus(403);
        $this->assertDatabaseHas('documentation_categories', ['id' => $category->id, 'title_en' => $category->title_en]);
    }

    public function test_user_without_manage_documentation_cannot_update_category(): void
    {
        $role = Role::factory()->create(['slug' => 'docs_denied_'.uniqid(), 'permissions' => ['manage_faqs']]);
        $user = User::factory()->create(['role_id' => $role->id, 'is_active' => true]);
        Sanctum::actingAs($user, ['admin']);
        $category = DocumentationCategory::factory()->create();

        $response = $this->putJson("/api/v1/admin/docs/categories/{$category->id}", [
            'title_en' => 'Nope',
        ]);

        $response->assertStatus(403);
    }

    public function test_update_category_without_product_id_preserves_existing_product(): void
    {
        $this->actingAsSuperAdmin();
        $product = Product::factory()->create();
        $category = DocumentationCategory::factory()->create(['product_id' => $product->id]);

        $response = $this->putJson("/api/v1/admin/docs/categories/{$category->id}", [
            'title_en' => 'Renamed',
        ]);

        $response->assertStatus(200);
        $this->assertDatabaseHas('documentation_categories', ['id' => $category->id, 'product_id' => $product->id, 'title_en' => 'Renamed']);
    }

    public function test_action_layer_rejects_out_of_scope_product_when_called_directly(): void
    {
        // The invariant lives in the action (domain layer), not only in
        // the HTTP controller — a future job/CLI caller cannot bypass it.
        [$user, $productA] = $this->scopedDocsAdmin();
        $foreignProduct = Product::factory()->create();
        $category = DocumentationCategory::factory()->create();

        $action = app(UpdateDocumentationCategoryAction::class);

        try {
            $action->execute($category, ['product_id' => $foreignProduct->id]);
            $this->fail('The action must reject an out-of-scope product_id.');
        } catch (HttpException $e) {
            $this->assertSame(403, $e->getStatusCode());
        }

        $this->assertDatabaseHas('documentation_categories', ['id' => $category->id, 'product_id' => null]);
    }

    private function scopedDocsAdmin(): array
    {
        $role = Role::factory()->create([
            'slug' => 'docs_scoped_'.uniqid(),
            'permissions' => ['manage_documentation'],
        ]);
        $user = User::factory()->create(['role_id' => $role->id, 'is_active' => true]);
        $product = Product::factory()->create();
        $user->products()->attach($product->id);
        Sanctum::actingAs($user, ['admin']);

        return [$user, $product];
    }
}
