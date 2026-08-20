<?php

namespace Tests\Unit\Domains;

use App\Domains\Content\Actions\CreateDocumentationArticleAction;
use App\Domains\Operations\Actions\SubmitContactRequestAction;
use App\Domains\System\Services\MediaUploadService;
use App\Jobs\SendContactRequestNotificationJob;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class ActionTest extends TestCase
{
    use RefreshDatabase;

    // ── DocumentationArticle reading time ────────────────────────────

    public function test_reading_time_is_calculated_from_word_count(): void
    {
        // 200 words = 1 minute, 400 words = 2 minutes
        // Resolved via the container (not `new`) because this Action now
        // depends on HtmlSanitizerService — letting Laravel wire it up is
        // the standard pattern and keeps this test from having to know
        // about dependencies it isn't actually testing.
        $action = $this->app->make(CreateDocumentationArticleAction::class);

        // estimateReadingTime() is public — testable directly, no reflection needed
        $this->assertEquals(1, $action->estimateReadingTime(implode(' ', array_fill(0, 150, 'word'))));
        $this->assertEquals(2, $action->estimateReadingTime(implode(' ', array_fill(0, 350, 'word'))));
        $this->assertEquals(5, $action->estimateReadingTime(implode(' ', array_fill(0, 950, 'word'))));
    }

    // ── Contact spam scoring ─────────────────────────────────────────

    public function test_clean_message_has_zero_spam_score(): void
    {
        Queue::fake(); // prevent SendContactRequestNotificationJob from actually dispatching

        $action = new SubmitContactRequestAction;
        $request = Request::create('/contact', 'POST');

        $contact = $action->execute([
            'name' => 'Test User',
            'email' => 'test@example.com',
            'message' => 'Hello, I would like to learn more about your products.',
            'type' => 'general',
        ], $request);

        $this->assertEquals(0.0, $contact->spam_score);
        Queue::assertPushed(SendContactRequestNotificationJob::class);
    }

    public function test_message_with_spam_keywords_scores_higher(): void
    {
        Queue::fake();

        $action = new SubmitContactRequestAction;
        $request = Request::create('/contact', 'POST');

        $contact = $action->execute([
            'name' => 'Spammer',
            'email' => 'spam@spam.com',
            'message' => 'Click here for free money! crypto investment opportunity!',
            'type' => 'general',
        ], $request);

        $this->assertGreaterThan(0.0, $contact->spam_score);
    }

    // ── Media upload security ─────────────────────────────────────────

    public function test_media_upload_rejects_php_files(): void
    {
        Storage::fake('local');
        $service = new MediaUploadService;

        $file = UploadedFile::fake()->create('malicious.php', 100, 'application/x-php');

        $this->expectException(ValidationException::class);
        $service->upload($file);
    }

    public function test_media_upload_rejects_oversized_files(): void
    {
        Storage::fake('local');
        $service = new MediaUploadService;

        // Create a file larger than max (10240 KB = 10MB)
        $file = UploadedFile::fake()->create('huge.jpg', 11000, 'image/jpeg');

        $this->expectException(ValidationException::class);
        $service->upload($file);
    }

    public function test_media_upload_accepts_valid_image(): void
    {
        Storage::fake('local');
        $this->actingAsSuperAdmin(); // Need auth user for uploaded_by

        $service = new MediaUploadService;
        $file = $this->makeRealJpegUploadedFile();

        $media = $service->upload($file, 'media/test');

        $this->assertNotNull($media->id);
        $this->assertEquals('image/jpeg', $media->mime_type);
        Storage::disk('local')->assertExists($media->path);
    }

    /**
     * Builds an UploadedFile backed by real JPEG bytes (a valid 1x1 pixel
     * image), rather than Laravel's UploadedFile::fake()->image() which
     * requires the GD extension to generate image content on the fly.
     * MediaUploadService validates the actual sniffed content-type via
     * finfo, so the test double must contain genuine JPEG binary data
     * for the "accepts valid image" assertion to be meaningful.
     */
    private function makeRealJpegUploadedFile(): UploadedFile
    {
        // Smallest valid JPEG: 1x1 white pixel, base64-encoded.
        $base64Jpeg = '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAMCAgICAgMCAgIDAwMDBAYEBAQEBAgGBgUGCQgKCgkICQkKDA8MCgsOCwkJDRENDg8QEBEQCgwSExIQEw8QEBD/2wBDAQMDAwQDBAgEBAgQCwkLEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBD/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAj/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=';

        $tmpPath = tempnam(sys_get_temp_dir(), 'jpeg_test_').'.jpg';
        file_put_contents($tmpPath, base64_decode($base64Jpeg));

        return new UploadedFile($tmpPath, 'photo.jpg', 'image/jpeg', null, true);
    }
}
