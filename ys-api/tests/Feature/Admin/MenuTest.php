<?php

namespace Tests\Feature\Admin;

use App\Domains\Auth\Models\Role;
use App\Domains\Auth\Models\User;
use App\Domains\Cms\Models\Menu;
use App\Domains\Cms\Models\MenuItem;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class MenuTest extends TestCase
{
    use RefreshDatabase;

    private function restrictedUser(string $permission): User
    {
        $role = Role::factory()->create([
            'slug' => 'menu_editor',
            'permissions' => [$permission],
        ]);
        $user = User::factory()->create([
            'role_id' => $role->id,
            'is_active' => true,
        ]);
        Sanctum::actingAs($user, ['admin']);

        return $user;
    }

    // ── Menus ────────────────────────────────────────────────────────

    public function test_super_admin_can_list_menus(): void
    {
        $this->actingAsSuperAdmin();
        Menu::factory()->count(2)->create();

        $response = $this->getJson('/api/v1/admin/menus');

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonCount(2, 'data');
    }

    public function test_unauthenticated_user_cannot_list_menus(): void
    {
        $response = $this->getJson('/api/v1/admin/menus');
        $response->assertStatus(401);
    }

    public function test_user_without_manage_menus_cannot_create_menu(): void
    {
        $this->restrictedUser('view_products');

        $response = $this->postJson('/api/v1/admin/menus', [
            'name' => 'Header Navigation',
            'location' => 'header',
        ]);

        $response->assertStatus(403);
    }

    public function test_super_admin_can_create_menu(): void
    {
        $this->actingAsSuperAdmin();

        $response = $this->postJson('/api/v1/admin/menus', [
            'name' => 'Header Navigation',
            'location' => 'header',
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.name', 'Header Navigation');

        $this->assertDatabaseHas('menus', ['location' => 'header', 'name' => 'Header Navigation']);
    }

    public function test_menu_creation_requires_name(): void
    {
        $this->actingAsSuperAdmin();

        $response = $this->postJson('/api/v1/admin/menus', [
            'location' => 'header',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['name']);
    }

    public function test_menu_creation_rejects_duplicate_location(): void
    {
        $this->actingAsSuperAdmin();
        Menu::factory()->create(['location' => 'header']);

        $response = $this->postJson('/api/v1/admin/menus', [
            'name' => 'Another Header',
            'location' => 'header',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['location']);
    }

    public function test_super_admin_can_update_menu(): void
    {
        $this->actingAsSuperAdmin();
        $menu = Menu::factory()->create(['location' => 'header', 'name' => 'Old Name']);

        $response = $this->putJson("/api/v1/admin/menus/{$menu->id}", [
            'name' => 'New Name',
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('data.name', 'New Name');

        $this->assertDatabaseHas('menus', ['id' => $menu->id, 'name' => 'New Name']);
    }

    public function test_super_admin_can_delete_menu(): void
    {
        $this->actingAsSuperAdmin();
        $menu = Menu::factory()->create();
        MenuItem::factory()->create(['menu_id' => $menu->id]);

        $response = $this->deleteJson("/api/v1/admin/menus/{$menu->id}");

        $response->assertStatus(200)
            ->assertJsonPath('success', true);

        $this->assertDatabaseMissing('menus', ['id' => $menu->id]);
        $this->assertDatabaseMissing('menu_items', ['menu_id' => $menu->id]);
    }

    // ── Menu Items ───────────────────────────────────────────────────

    public function test_super_admin_can_create_menu_item(): void
    {
        $this->actingAsSuperAdmin();
        $menu = Menu::factory()->create();

        $response = $this->postJson('/api/v1/admin/menu-items', [
            'menu_id' => $menu->id,
            'title_en' => 'Products',
            'title_ar' => 'المنتجات',
            'url' => '/products',
            'target' => '_self',
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.title_en', 'Products');

        $this->assertDatabaseHas('menu_items', ['menu_id' => $menu->id, 'url' => '/products']);
    }

    public function test_menu_item_creation_requires_menu_id(): void
    {
        $this->actingAsSuperAdmin();

        $response = $this->postJson('/api/v1/admin/menu-items', [
            'title_en' => 'Products',
            'title_ar' => 'المنتجات',
            'url' => '/products',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['menu_id']);
    }

    public function test_menu_item_rejects_executable_url_scheme(): void
    {
        $this->actingAsSuperAdmin();
        $menu = Menu::factory()->create();

        $response = $this->postJson('/api/v1/admin/menu-items', [
            'menu_id' => $menu->id,
            'title_en' => 'Bad',
            'title_ar' => 'سيء',
            'url' => 'javascript:alert(1)',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['url']);
    }

    public function test_super_admin_can_update_and_delete_menu_item(): void
    {
        $this->actingAsSuperAdmin();
        $menu = Menu::factory()->create();
        $item = MenuItem::factory()->create(['menu_id' => $menu->id, 'url' => '/old']);

        $update = $this->putJson("/api/v1/admin/menu-items/{$item->id}", [
            'url' => '/new',
        ]);

        $update->assertStatus(200)
            ->assertJsonPath('data.url', '/new');
        $this->assertDatabaseHas('menu_items', ['id' => $item->id, 'url' => '/new']);

        $delete = $this->deleteJson("/api/v1/admin/menu-items/{$item->id}");

        $delete->assertStatus(200);
        $this->assertDatabaseMissing('menu_items', ['id' => $item->id]);
    }

    public function test_menu_item_parent_relationship_persists(): void
    {
        $this->actingAsSuperAdmin();
        $menu = Menu::factory()->create();
        $parent = MenuItem::factory()->create(['menu_id' => $menu->id]);

        $response = $this->postJson('/api/v1/admin/menu-items', [
            'menu_id' => $menu->id,
            'parent_id' => $parent->id,
            'title_en' => 'Child',
            'title_ar' => 'طفل',
            'url' => '/child',
        ]);

        $response->assertStatus(201);
        $this->assertDatabaseHas('menu_items', ['parent_id' => $parent->id, 'url' => '/child']);
    }
}