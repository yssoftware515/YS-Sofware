<?php

namespace App\Http\Controllers\Admin;

use App\Domains\Cms\Actions\CreateStaticPageAction;
use App\Domains\Cms\Actions\UpdateStaticPageAction;
use App\Domains\Cms\Models\StaticPage;
use App\Domains\System\Services\AuditService;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Validation\Rule;

class StaticPageController extends Controller
{
    public function __construct(
        private readonly CreateStaticPageAction $createPage,
        private readonly UpdateStaticPageAction $updatePage,
        private readonly AuditService $auditService,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $this->authorize('manage_static_pages');

        $pages = StaticPage::with('cover')
            ->when($request->query('status'), fn ($q, $s) => $q->where('status', $s))
            ->ordered()
            ->paginate($this->perPage($request, 15));

        return response()->json([
            'success' => true,
            'data' => $pages->items(),
            'meta' => ['current_page' => $pages->currentPage(), 'last_page' => $pages->lastPage(), 'total' => $pages->total()],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorize('manage_static_pages');

        $validated = $request->validate([
            'slug' => ['required', 'string', 'max:100', 'alpha_dash', 'unique:static_pages,slug'],
            'title_en' => ['required', 'string', 'max:255'],
            'title_ar' => ['required', 'string', 'max:255'],
            'excerpt_en' => ['nullable', 'string', 'max:500'],
            'excerpt_ar' => ['nullable', 'string', 'max:500'],
            'content_en' => ['nullable', 'string'],
            'content_ar' => ['nullable', 'string'],
            'seo_title_en' => ['nullable', 'string', 'max:70'],
            'seo_title_ar' => ['nullable', 'string', 'max:70'],
            'seo_description_en' => ['nullable', 'string', 'max:160'],
            'seo_description_ar' => ['nullable', 'string', 'max:160'],
            'cover_media_id' => ['nullable', 'uuid', 'exists:media,id'],
            'status' => ['sometimes', Rule::in(['draft', 'published', 'archived'])],
            'published_at' => ['nullable', 'date'],
            'sort_order' => ['sometimes', 'integer', 'min:0', 'max:9999'],
        ]);

        $page = $this->createPage->execute($validated);
        $this->auditService->logModelChange('static_page.created', $page);

        return response()->json(['success' => true, 'data' => $page], Response::HTTP_CREATED);
    }

    public function show(StaticPage $staticPage): JsonResponse
    {
        $this->authorize('manage_static_pages');

        return response()->json(['success' => true, 'data' => $staticPage->load('cover')]);
    }

    public function update(Request $request, StaticPage $staticPage): JsonResponse
    {
        $this->authorize('manage_static_pages');

        $validated = $request->validate([
            'slug' => ['sometimes', 'string', 'max:100', 'alpha_dash', Rule::unique('static_pages', 'slug')->ignore($staticPage->id)],
            'title_en' => ['sometimes', 'string', 'max:255'],
            'title_ar' => ['sometimes', 'string', 'max:255'],
            'excerpt_en' => ['nullable', 'string', 'max:500'],
            'excerpt_ar' => ['nullable', 'string', 'max:500'],
            'content_en' => ['nullable', 'string'],
            'content_ar' => ['nullable', 'string'],
            'seo_title_en' => ['nullable', 'string', 'max:70'],
            'seo_title_ar' => ['nullable', 'string', 'max:70'],
            'seo_description_en' => ['nullable', 'string', 'max:160'],
            'seo_description_ar' => ['nullable', 'string', 'max:160'],
            'cover_media_id' => ['nullable', 'uuid', 'exists:media,id'],
            'status' => ['sometimes', Rule::in(['draft', 'published', 'archived'])],
            'published_at' => ['nullable', 'date'],
            'sort_order' => ['sometimes', 'integer', 'min:0', 'max:9999'],
        ]);

        $updated = $this->updatePage->execute($staticPage, $validated);
        $this->auditService->logModelChange('static_page.updated', $updated);

        return response()->json(['success' => true, 'data' => $updated]);
    }

    public function destroy(StaticPage $staticPage): JsonResponse
    {
        $this->authorize('manage_static_pages');

        $this->auditService->logModelChange('static_page.deleted', $staticPage);
        $staticPage->delete();

        return response()->json(['success' => true, 'message' => 'Page deleted.']);
    }
}
