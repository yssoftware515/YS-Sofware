<?php

namespace Tests\Feature\Admin;

use App\Domains\Auth\Models\Role;
use App\Domains\Auth\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class FailedJobObservabilityTest extends TestCase
{
    use RefreshDatabase;

    private function actingAsRoleWith(string $slug, array $permissions): User
    {
        $role = Role::factory()->create(['slug' => $slug, 'permissions' => $permissions]);
        $user = User::factory()->create(['role_id' => $role->id, 'is_active' => true]);
        Sanctum::actingAs($user, ['admin']);

        return $user;
    }

    public function test_unauthenticated_request_is_rejected(): void
    {
        $this->getJson('/api/v1/admin/ops/failed-jobs')->assertStatus(401);
    }

    public function test_operator_without_view_audit_logs_is_forbidden(): void
    {
        $this->actingAsRoleWith('content_editor', ['manage_products']);

        $this->getJson('/api/v1/admin/ops/failed-jobs')->assertStatus(403);
    }

    public function test_view_audit_logs_holder_sees_failed_jobs_newest_first(): void
    {
        $this->actingAsRoleWith('operator', ['view_audit_logs']);

        $older = DB::table('failed_jobs')->insertGetId([
            'uuid' => (string) Str::uuid(),
            'connection' => 'database',
            'queue' => 'default',
            'payload' => '{"displayName":"App\\\\Jobs\\\\Something"}',
            'exception' => "RuntimeException: first failure\nat /app/app/jobs/Something.php:12",
            'failed_at' => now()->subDay(),
        ]);
        $newer = DB::table('failed_jobs')->insertGetId([
            'uuid' => (string) Str::uuid(),
            'connection' => 'redis',
            'queue' => 'emails',
            'payload' => '{"displayName":"App\\\\Jobs\\\\MailJob","data":[]}',
            'exception' => "RuntimeException: mail transport down\nat /app/app/jobs/MailJob.php:9",
            'failed_at' => now(),
        ]);

        $response = $this->getJson('/api/v1/admin/ops/failed-jobs');

        $response->assertStatus(200)->assertJsonPath('success', true);
        $this->assertSame($newer, $response->json('data.0.id'));
        $this->assertSame($older, $response->json('data.1.id'));
        $this->assertSame(2, $response->json('meta.total'));
    }

    public function test_payload_is_never_exposed_and_exception_is_truncated_to_first_line(): void
    {
        $this->actingAsRoleWith('operator', ['view_audit_logs']);

        $secret = 'secret@example.com';
        $longTrace = "RuntimeException: nope\nat /app/a.php:1\n".str_repeat('at /app/b.php:2 --- ', 200);
        DB::table('failed_jobs')->insert([
            'uuid' => (string) Str::uuid(),
            'connection' => 'database',
            'queue' => 'default',
            'payload' => '{"displayName":"EmailJob","to":"'.$secret.'","password":"hunter2"}',
            'exception' => $longTrace,
            'failed_at' => now(),
        ]);

        $response = $this->getJson('/api/v1/admin/ops/failed-jobs');

        $response->assertStatus(200);
        $this->assertSame('RuntimeException: nope', $response->json('data.0.exception'));
        $content = $response->getContent();
        $this->assertStringNotContainsString($secret, $content);
        $this->assertStringNotContainsString('hunter2', $content);
    }

    public function test_no_retry_or_delete_routes_exist(): void
    {
        $this->assertFalse(Route::has('admin.ops.failed-jobs.retry'));
        $this->assertFalse(Route::has('admin.ops.failed-jobs.destroy'));
    }
}
