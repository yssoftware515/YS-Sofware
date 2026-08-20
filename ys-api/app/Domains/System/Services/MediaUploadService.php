<?php

namespace App\Domains\System\Services;

use App\Domains\System\Models\Media;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class MediaUploadService
{
    /**
     * Elements stripped from uploaded SVGs. SVGs are XML, not sandboxed
     * HTML: script/foreignObject can execute JavaScript, <use>/<image>/<a>
     * can reference external resources, <animate>/<set> can drive DOM
     * mutations, and <style> can carry CSS url() exfiltration.
     */
    private const array UNSAFE_SVG_ELEMENTS = [
        'script', 'foreignobject', 'use', 'image', 'a',
        'iframe', 'embed', 'object',
        'animate', 'animatemotion', 'animatetransform', 'set', 'style',
    ];

    private array $allowedMimeTypes;

    private array $blockedExtensions;

    private int $maxFileSizeKb;

    public function __construct()
    {
        $this->allowedMimeTypes = config('security.uploads.allowed_mime_types');
        $this->blockedExtensions = config('security.uploads.blocked_extensions');
        $this->maxFileSizeKb = config('security.uploads.max_file_size', 10240);
    }

    /**
     * Validate, store, and record a file upload.
     *
     * @throws ValidationException
     */
    public function upload(
        UploadedFile $file,
        string $directory = 'media',
        ?string $altTextEn = null,
        ?string $altTextAr = null,
        ?string $disk = null,
    ): Media {
        if (! $file->isValid()) {
            throw ValidationException::withMessages([
                'file' => 'The uploaded file is invalid or was not received completely.',
            ]);
        }

        $this->validateFile($file);

        // Explicit disk wins; otherwise the default (private `local`) disk.
        // Site-presented assets (product covers etc.) are stored on the
        // public disk by the caller so /storage can serve them.
        $disk ??= config('filesystems.default', 'local');
        $filename = $this->generateFilename($file);
        $path = $directory.'/'.$filename;

        // SVGs are re-serialized through a DOM sanitizer before storage —
        // the stored bytes are NEVER the raw upload, so a malicious SVG
        // can't ship script/foreignObject/use/<animate> to site visitors.
        $contents = $file->getContent();
        if ($file->getMimeType() === 'image/svg+xml') {
            $contents = $this->sanitizeSvg($contents);
        }

        Storage::disk($disk)->put($path, $contents);

        return Media::create([
            'disk' => $disk,
            'path' => $path,
            'filename' => $filename,
            'original_name' => $file->getClientOriginalName(),
            'mime_type' => $file->getMimeType(),
            'size' => $file->getSize(),
            'alt_text_en' => $altTextEn,
            'alt_text_ar' => $altTextAr,
            'uploaded_by' => Auth::id(),
        ]);
    }

    /**
     * Delete a media file from storage and database.
     */
    public function delete(Media $media): void
    {
        Storage::disk($media->disk)->delete($media->path);
        $media->delete();
    }

    // ── Validation ───────────────────────────────────────────────────

    /**
     * @throws ValidationException
     */
    private function validateFile(UploadedFile $file): void
    {
        // Size check
        $fileSizeKb = $file->getSize() / 1024;
        if ($fileSizeKb > $this->maxFileSizeKb) {
            throw ValidationException::withMessages([
                'file' => ["File size exceeds the maximum allowed size of {$this->maxFileSizeKb} KB."],
            ]);
        }

        // MIME type validation — use server-detected MIME, never trust client
        $detectedMime = $file->getMimeType();
        if (! in_array($detectedMime, $this->allowedMimeTypes, true)) {
            throw ValidationException::withMessages([
                'file' => ["File type '{$detectedMime}' is not allowed."],
            ]);
        }

        // Extension validation — double-check against blocked list
        $extension = strtolower($file->getClientOriginalExtension());
        if (in_array($extension, $this->blockedExtensions, true)) {
            throw ValidationException::withMessages([
                'file' => ["Files with '.{$extension}' extension are not allowed."],
            ]);
        }

        // Prevent double extensions: image.php.jpg
        $originalName = $file->getClientOriginalName();
        if (substr_count($originalName, '.') > 1) {
            $parts = explode('.', $originalName);
            // Remove the last extension and check remaining
            array_pop($parts);
            foreach ($parts as $part) {
                if (in_array(strtolower($part), $this->blockedExtensions, true)) {
                    throw ValidationException::withMessages([
                        'file' => ['File name contains a potentially dangerous extension.'],
                    ]);
                }
            }
        }
    }

    /**
     * Generate a randomized filename to prevent path traversal and guessing.
     */
    private function generateFilename(UploadedFile $file): string
    {
        $extension = $file->getClientOriginalExtension();
        $random = Str::uuid()->toString();

        return $random.'.'.strtolower($extension);
    }

    /**
     * Strip everything executable or resource-loading from an SVG and
     * re-serialize it. Parsing happens with network access disabled
     * (LIBXML_NONET) and entity substitution left OFF, so no external
     * resource can be pulled in during parsing itself.
     *
     * The blocklist is applied to LOCAL names (namespace prefixes are
     * stripped), so `<svg:script>`/`<evil:script>` and `xlink:onload`
     * are caught exactly like their unprefixed counterparts. Any
     * prefixed element or attribute — foreign namespaces, `xml:base`,
     * `xmlns:*` declarations — is removed outright, and a DOCTYPE is
     * never allowed through (browsers would otherwise fetch the SYSTEM
     * DTD when the stored file is navigated directly).
     *
     * @throws ValidationException when the payload is not well-formed XML
     */
    private function sanitizeSvg(string $contents): string
    {
        // Reject the whole file at parse level if a DOCTYPE survives the
        // strip below — stored bytes must never carry a DTD/entity block.
        $contents = preg_replace('/<!DOCTYPE\b[^\[>]*(?:\[[\s\S]*?\])?[^>]*>/i', '', $contents) ?? $contents;

        $previous = libxml_use_internal_errors(true);
        libxml_clear_errors();

        try {
            $dom = new \DOMDocument;
            $loaded = $dom->loadXML($contents, LIBXML_NONET | LIBXML_NOBLANKS | LIBXML_NOERROR);

            if (! $loaded) {
                throw ValidationException::withMessages([
                    'file' => ['The uploaded SVG file is invalid or malformed.'],
                ]);
            }

            if ($dom->doctype !== null) {
                throw ValidationException::withMessages([
                    'file' => ['The uploaded SVG file is invalid or malformed.'],
                ]);
            }

            $toRemove = [];
            foreach ($dom->getElementsByTagName('*') as $element) {
                // Local name comparison defeats namespace-prefixed
                // bypasses (<svg:script>, <evil:script>, …); any
                // prefixed node is a foreign-namespace construct.
                $localName = strtolower($element->localName ?? $element->nodeName);
                if (in_array($localName, self::UNSAFE_SVG_ELEMENTS, true)
                    || str_contains($element->nodeName, ':')) {
                    $toRemove[] = $element;

                    continue;
                }

                // Attribute sweep — event handlers, external references,
                // inline CSS, prefixed (xlink:/xml:/xmlns:) attributes and
                // whitespace-obfuscated URL schemes are all dropped.
                $unsafeAttributes = [];
                foreach ($element->attributes as $attribute) {
                    $localName = strtolower($attribute->localName ?? $attribute->nodeName);
                    $value = strtolower(trim($attribute->nodeValue));
                    $normalized = preg_replace('/[\x00-\x20\x7F]/', '', $value) ?? $value;
                    if (str_starts_with($localName, 'on')
                        || in_array($localName, ['href', 'src', 'style'], true)
                        || str_contains($attribute->nodeName, ':')
                        || str_starts_with($normalized, 'javascript:')) {
                        $unsafeAttributes[] = $attribute->nodeName;
                    }
                }
                foreach ($unsafeAttributes as $name) {
                    $element->removeAttribute($name);
                }
            }

            foreach ($toRemove as $element) {
                $element->parentNode?->removeChild($element);
            }

            if ($dom->documentElement === null) {
                throw ValidationException::withMessages([
                    'file' => ['The uploaded SVG file is invalid or malformed.'],
                ]);
            }

            $sanitized = $dom->saveXML();

            if ($sanitized === false) {
                return '';
            }

            // Namespace declarations are exposed by libxml as
            // DOMNameSpaceNode (not DOMAttr), so they cannot be removed
            // through the DOM API. Every prefixed node is gone by this
            // point, so any remaining `xmlns:prefix` declaration is
            // unused — drop it from the serialized bytes.
            return preg_replace('/\s+xmlns:[a-zA-Z_][\w.\-]*="[^"]*"/', '', $sanitized) ?? $sanitized;
        } finally {
            libxml_clear_errors();
            libxml_use_internal_errors($previous);
        }
    }
}
