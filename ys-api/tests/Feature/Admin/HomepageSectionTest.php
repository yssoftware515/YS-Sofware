<?php

namespace Tests\Feature\Admin;

use App\Domains\Auth\Models\Role;
use App\Domains\Auth\Models\User;
use App\Domains\Cms\Models\HomepageSection;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class HomepageSectionTest extends TestCase
{
    use RefreshDatabase;

    private function restrictedUser(): User
    {
        $role = Role::factory()->create([
            'slug' => 'content_editor',
            'permissions' => ['view_homepage'],
        ]);
        $user = User::factory()->create([
            'role_id' => $role->id,
            'is_active' => true,
        ]);
        Sanctum::actingAs($user, ['admin']);

        return $user;
    }
    // ── INT-002: the admin section-type contract must match the public
    // homepage surface. The public page renders sections of type
    // hero, why_choose, products, services, process, capabilities, cta —
    // every one of those must be creatable through the admin API.

    public function test_super_admin_can_create_every_rendered_section_type(): void
    {
        $this->actingAsSuperAdmin();

        foreach (['hero', 'stats', 'why_choose', 'capabilities', 'services', 'products', 'process', 'cta'] as $type) {
            $response = $this->postJson('/api/v1/admin/homepage-sections', [
                'type' => $type,
                'title_en' => 'Section '.$type,
                'title_ar' => 'قسم '.$type,
                'is_enabled' => true,
            ]);

            $response->assertStatus(201)
                ->assertJsonPath('success', true)
                ->assertJsonPath('data.type', $type);
        }

        $this->assertDatabaseCount('homepage_sections', 8);
    }

    public function test_super_admin_can_update_section_type(): void
    {
        $this->actingAsSuperAdmin();
        $section = HomepageSection::factory()->create(['type' => 'hero']);

        $response = $this->putJson("/api/v1/admin/homepage-sections/{$section->id}", [
            'type' => 'services',
            'title_en' => 'Our Services',
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('data.type', 'services');
    }

    public function test_unknown_section_type_is_still_rejected(): void
    {
        $this->actingAsSuperAdmin();

        $response = $this->postJson('/api/v1/admin/homepage-sections', [
            'type' => 'not_a_real_type',
            'title_en' => 'Broken',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['type']);
    }

    public function test_user_without_manage_homepage_cannot_create_section(): void
    {
        $this->restrictedUser();

        $response = $this->postJson('/api/v1/admin/homepage-sections', [
            'type' => 'hero',
            'title_en' => 'Hero',
        ]);

        $response->assertStatus(403);
    }

    public function test_public_index_returns_only_enabled_sections_in_order(): void
    {
        $this->actingAsSuperAdmin();
        HomepageSection::factory()->create(['type' => 'hero', 'sort_order' => 1, 'is_enabled' => true]);
        HomepageSection::factory()->create(['type' => 'cta', 'sort_order' => 2, 'is_enabled' => false]);

        $response = $this->getJson('/api/v1/public/homepage-sections');

        $response->assertStatus(200)
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.type', 'hero');
    }
}
