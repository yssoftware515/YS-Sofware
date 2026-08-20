<?php

namespace App\Http\Controllers\Admin;

use App\Domains\Cms\Models\StaticPage;
use App\Domains\Product\Models\Product;
use App\Domains\Product\Models\ProductMedia;
use App\Domains\Services\Models\Service;
use App\Domains\System\Models\Media;
use App\Domains\System\Services\AuditService;
use App\Domains\System\Services\MediaUploadService;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class MediaController extends Controller
{
    public function __construct(
        private readonly MediaUploadService $uploadService,
        private readonly AuditService $auditService,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $this->authorize('manage_media');

        $media = Media::with('uploader:id,name')
            ->when($request->query('type'), function ($q, $type) {
                if ($type === 'image') {
                    return $q->images();
                }

                return $q->where('mime_type', 'like', "%{$type}%");
            })
            ->when($request->query('search'), fn ($q, $s) => $q->where('original_name', 'ilike', "%{$s}%")
            )
            ->orderByDesc('created_at')
            ->paginate($this->perPage($request, 24));

        return response()->json([
            'success' => true,
            'data' => $media->map(fn ($m) => [
                'id' => $m->id,
                'url' => $m->url,
                'filename' => $m->filename,
                'original_name' => $m->original_name,
                'mime_type' => $m->mime_type,
                'size' => $m->size,
                'human_size' => $m->human_size,
                'alt_text_en' => $m->alt_text_en,
                'alt_text_ar' => $m->alt_text_ar,
                'uploaded_by' => $m->uploader?->name,
                'created_at' => $m->created_at->toIso8601String(),
            ]),
            'meta' => ['current_page' => $media->currentPage(), 'last_page' => $media->lastPage(), 'total' => $media->total()],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorize('manage_media');

        $request->validate([
            'file' => ['required', 'file', 'max:10240'],
            'alt_text_en' => ['nullable', 'string', 'max:200'],
            'alt_text_ar' => ['nullable', 'string', 'max:200'],
        ]);

        $media = $this->uploadService->upload(
            file: $request->file('file'),
            directory: 'media/'.now()->format('Y/m'),
            disk: 'public',
            altTextEn: $request->input('alt_text_en'),
            altTextAr: $request->input('alt_text_ar'),
        );

        $this->auditService->log('media.uploaded', 'Media', $media->id, newValues: [
            'filename' => $media->filename,
            'mime_type' => $media->mime_type,
            'size' => $media->size,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'File uploaded successfully.',
            'data' => [
                'id' => $media->id,
                'url' => $media->url,
                'filename' => $media->filename,
                'human_size' => $media->human_size,
                'mime_type' => $media->mime_type,
            ],
        ], Response::HTTP_CREATED);
    }

    public function destroy(Media $medium): JsonResponse
    {
        $this->authorize('manage_media');

        $references = $this->referenceCounts($medium);
        if ($references !== []) {
            return response()->json([
                'success' => false,
                'message' => 'This file is still in use and cannot be deleted. Unassign it from the referenced items first.',
                'errors' => ['references' => $references],
            ], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $this->auditService->log('media.deleted', 'Media', $medium->id);
        $this->uploadService->delete($medium);

        return response()->json(['success' => true, 'message' => 'File deleted successfully.']);
    }

    /**
     * Count live references to a media file across the content model.
     * Files that are assigned as product covers/logos, service covers,
     * static-page covers, or product gallery images are protected from
     * accidental deletion (database FKs would otherwise silently null
     * those columns and break the rendered pages).
     *
     * @return array<string, int> Map of reference type => count (empty = safe to delete)
     */
    private function referenceCounts(Media $medium): array
    {
        $counts = [];

        $productCount = Product::query()
            ->where('cover_image_id', $medium->id)
            ->orWhere('logo_image_id', $medium->id)
            ->count();
        if ($productCount > 0) {
            $counts['products'] = $productCount;
        }

        $serviceCount = Service::where('cover_image_id', $medium->id)->count();
        if ($serviceCount > 0) {
            $counts['services'] = $serviceCount;
        }

        $pageCount = StaticPage::where('cover_media_id', $medium->id)->count();
        if ($pageCount > 0) {
            $counts['static_pages'] = $pageCount;
        }

        $galleryCount = ProductMedia::where('media_id', $medium->id)->count();
        if ($galleryCount > 0) {
            $counts['product_media'] = $galleryCount;
        }

        return $counts;
    }
}
