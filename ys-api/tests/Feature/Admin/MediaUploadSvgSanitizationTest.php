<?php

namespace Tests\Feature\Admin;

use App\Domains\Auth\Models\User;
use App\Domains\System\Models\Media;
use App\Domains\System\Services\MediaUploadService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * SVG uploads are re-serialized through a DOM sanitizer before they are
 * stored: the bytes served to site visitors are never the raw upload,
 * so script/foreignObject/use/<animate>/event-handlers cannot ship XSS.
 */
class MediaUploadSvgSanitizationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('local');
        Sanctum::actingAs(User::factory()->create(), ['admin']);
    }

    private function uploadSvg(string $contents): Media
    {
        $file = UploadedFile::fake()->createWithContent('logo.svg', $contents);

        return app(MediaUploadService::class)->upload($file, 'media', disk: 'local');
    }

    public function test_svg_script_and_foreignobject_elements_are_stripped(): void
    {
        $media = $this->uploadSvg(
            '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script>'.
            '<foreignObject><div>html</div></foreignObject>'.
            '<rect width="10" height="10"/></svg>'
        );

        $stored = Storage::disk('local')->get($media->path);

        $this->assertStringNotContainsString('script', $stored);
        $this->assertStringNotContainsString('foreignObject', $stored);
        $this->assertStringContainsString('rect', $stored);
    }

    public function test_svg_event_handler_and_javascript_href_attributes_are_stripped(): void
    {
        $media = $this->uploadSvg(
            '<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)">'.
            '<circle cx="5" cy="5" r="4" onclick="steal()"/>'.
            '<a href="javascript:alert(2)"><text>x</text></a>'.
            '<use href="https://evil.example/x.svg#i"/></svg>'
        );

        $stored = Storage::disk('local')->get($media->path);

        $this->assertStringNotContainsString('onload', $stored);
        $this->assertStringNotContainsString('onclick', $stored);
        $this->assertStringNotContainsString('javascript:', $stored);
        $this->assertStringNotContainsString('href', $stored);
        $this->assertStringNotContainsString('<use', $stored);
        $this->assertStringNotContainsString('<a ', $stored);
    }

    public function test_svg_animation_and_style_elements_are_stripped(): void
    {
        $media = $this->uploadSvg(
            '<svg xmlns="http://www.w3.org/2000/svg">'.
            '<style>@import url("https://evil.example/x");</style>'.
            '<animate attributeName="x" from="0" to="100"/>'.
            '<path d="M0 0"/></svg>'
        );

        $stored = Storage::disk('local')->get($media->path);

        $this->assertStringNotContainsString('style', $stored);
        $this->assertStringNotContainsString('animate', $stored);
        $this->assertStringContainsString('path', $stored);
    }

    public function test_benign_svg_survives_sanitization_intact(): void
    {
        $svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">'.
            '<rect x="1" y="1" width="22" height="22" fill="#c00"/></svg>';

        $media = $this->uploadSvg($svg);

        $stored = Storage::disk('local')->get($media->path);
        $this->assertStringContainsString('rect', $stored);
        $this->assertStringContainsString('fill="#c00"', $stored);
        $this->assertStringContainsString('viewBox', $stored);
    }

    public function test_malformed_svg_is_rejected(): void
    {
        $this->expectException(ValidationException::class);
        $this->expectExceptionMessage('invalid or malformed');

        $this->uploadSvg('<svg><not-closed></svg>');
    }

    public function test_non_svg_uploads_are_not_touched(): void
    {
        $file = UploadedFile::fake()->createWithContent('pic.png', "\x89PNG\r\n\x1a\nrest-of-bytes");

        $media = app(MediaUploadService::class)->upload($file, 'media', disk: 'local');

        $this->assertSame("\x89PNG\r\n\x1a\nrest-of-bytes", Storage::disk('local')->get($media->path));
    }

    public function test_namespace_prefixed_script_is_stripped(): void
    {
        $media = $this->uploadSvg(
            '<svg xmlns="http://www.w3.org/2000/svg" xmlns:svg="http://www.w3.org/2000/svg">'.
            '<svg:script>alert(document.domain)</svg:script>'.
            '<rect width="10" height="10"/></svg>'
        );

        $stored = Storage::disk('local')->get($media->path);

        $this->assertStringNotContainsString('script', $stored);
        $this->assertStringNotContainsString('svg:', $stored);
        $this->assertStringContainsString('rect', $stored);
    }

    public function test_foreign_namespace_element_is_stripped(): void
    {
        $media = $this->uploadSvg(
            '<svg xmlns="http://www.w3.org/2000/svg" xmlns:evil="http://evil.example/xhtml">'.
            '<evil:script>alert(1)</evil:script>'.
            '<evil:iframe src="https://evil.example/x"/>'.
            '<path d="M0 0"/></svg>'
        );

        $stored = Storage::disk('local')->get($media->path);

        $this->assertStringNotContainsString('evil:', $stored);
        $this->assertStringNotContainsString('script', $stored);
        $this->assertStringNotContainsString('iframe', $stored);
        $this->assertStringContainsString('path', $stored);
    }

    public function test_xlink_onload_attribute_is_stripped(): void
    {
        $media = $this->uploadSvg(
            '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">'.
            '<circle cx="5" cy="5" r="4" xlink:onload="alert(1)"/>'.
            '<use xlink:href="#i"/></svg>'
        );

        $stored = Storage::disk('local')->get($media->path);

        $this->assertStringNotContainsString('onload', $stored);
        $this->assertStringNotContainsString('xlink', $stored);
        $this->assertStringNotContainsString('<use', $stored);
    }

    public function test_whitespace_obfuscated_javascript_scheme_is_stripped(): void
    {
        $media = $this->uploadSvg(
            '<svg xmlns="http://www.w3.org/2000/svg">'.
            '<circle cx="5" cy="5" r="4" filter="java&#9;script:alert(1)"/>'.
            '<rect width="10" height="10"/></svg>'
        );

        $stored = Storage::disk('local')->get($media->path);

        $this->assertStringNotContainsString('javascript', $stored);
        $this->assertStringNotContainsString('filter', $stored);
    }

    public function test_doctype_with_entity_is_rejected(): void
    {
        $this->expectException(ValidationException::class);
        $this->expectExceptionMessage('invalid or malformed');

        $this->uploadSvg(
            '<!DOCTYPE svg [<!ENTITY xxe SYSTEM "https://attacker.example/x">]>'.
            '<svg xmlns="http://www.w3.org/2000/svg">&xxe;<rect width="10" height="10"/></svg>'
        );
    }

    public function test_plain_doctype_is_stripped(): void
    {
        $media = $this->uploadSvg(
            '<!DOCTYPE svg><svg xmlns="http://www.w3.org/2000/svg"><rect width="10" height="10"/></svg>'
        );

        $stored = Storage::disk('local')->get($media->path);

        $this->assertStringNotContainsString('<!DOCTYPE', $stored);
        $this->assertStringContainsString('rect', $stored);
    }

    public function test_xml_base_and_xmlns_declarations_are_stripped(): void
    {
        $media = $this->uploadSvg(
            '<svg xmlns="http://www.w3.org/2000/svg" xml:base="https://evil.example/" '.
            'xmlns:evil="http://evil.example/xhtml" xml:space="preserve">'.
            '<text xml:lang="en">hi</text></svg>'
        );

        $stored = Storage::disk('local')->get($media->path);

        $this->assertStringNotContainsString('xml:base', $stored);
        $this->assertStringNotContainsString('xmlns:', $stored);
        $this->assertStringNotContainsString('xml:space', $stored);
        $this->assertStringNotContainsString('xml:lang', $stored);
    }
}
