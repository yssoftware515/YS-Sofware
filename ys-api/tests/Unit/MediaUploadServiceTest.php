<?php

namespace Tests\Unit;

use App\Domains\System\Services\MediaUploadService;
use Illuminate\Http\UploadedFile;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

/**
 * MediaUploadService hard guards — file integrity before anything else.
 */
class MediaUploadServiceTest extends TestCase
{
    public function test_upload_rejects_a_file_that_failed_to_receive(): void
    {
        $file = new UploadedFile(
            'broken.png',
            'broken.png',
            'image/png',
            UPLOAD_ERR_PARTIAL           // transport said "incomplete upload"
        );

        $this->expectException(ValidationException::class);
        $this->expectExceptionMessage('invalid');

        app(MediaUploadService::class)->upload($file);
    }
}
