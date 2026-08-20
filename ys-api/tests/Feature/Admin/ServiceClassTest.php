<?php

namespace Tests\Feature\Admin;

use App\Domains\Services\Models\Service;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ServiceClassTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_classify_a_service(): void
    {
        $this->actingAsSuperAdmin();

        $response = $this->postJson('/api/v1/admin/services', [
            'slug' => 'custom-ai-automation',
            'name_en' => 'AI Automation',
            'name_ar' => 'أتمتة الذكاء الاصطناعي',
            'pricing_type' => 'custom_quote',
            'service_class' => 'custom',
            'status' => 'active',
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.service_class', 'custom');

        $this->assertDatabaseHas('services', ['slug' => 'custom-ai-automation', 'service_class' => 'custom']);
    }

    public function test_service_class_rejects_unknown_values(): void
    {
        $this->actingAsSuperAdmin();

        $this->postJson('/api/v1/admin/services', [
            'slug' => 'mystery-service',
            'name_en' => 'Mystery',
            'name_ar' => 'غموض',
            'pricing_type' => 'fixed',
            'service_class' => 'quantum',
        ])->assertStatus(422);
    }

    public function test_service_class_is_nullable_and_updateable(): void
    {
        $this->actingAsSuperAdmin();
        $service = Service::factory()->create(['service_class' => null]);

        $this->patchJson("/api/v1/admin/services/{$service->id}", [
            'service_class' => 'subscription',
        ])->assertStatus(200)
            ->assertJsonPath('data.service_class', 'subscription');
    }

    public function test_admin_index_filters_by_service_class(): void
    {
        $this->actingAsSuperAdmin();
        Service::factory()->create(['service_class' => 'custom', 'name_en' => 'Consulting']);
        Service::factory()->create(['service_class' => 'product', 'name_en' => 'Implementation']);
        Service::factory()->create(['service_class' => null, 'name_en' => 'Legacy Row']);

        $response = $this->getJson('/api/v1/admin/services?service_class=custom');

        $response->assertStatus(200)
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.name_en', 'Consulting');
    }

    public function test_public_services_never_expose_service_class(): void
    {
        Service::factory()->create([
            'service_class' => 'custom',
            'status' => 'active',
        ]);

        $response = $this->getJson('/api/v1/public/services');

        $response->assertStatus(200)
            ->assertJsonMissingPath('data.0.service_class');

        $service = Service::where('status', 'active')->first();
        $this->getJson("/api/v1/public/services/{$service->slug}")
            ->assertStatus(200)
            ->assertJsonMissingPath('data.service_class');
    }
}
