<?php

namespace App\Http\Controllers\Admin;

use App\Domains\Cms\Actions\CreateHomepageSectionAction;
use App\Domains\Cms\Actions\UpdateHomepageSectionAction;
use App\Domains\Cms\Models\HomepageSection;
use App\Domains\System\Services\AuditService;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Validation\Rule;

class HomepageSectionController extends Controller
{
    /**
     * All section types the product surface renders. `services`, `process`
     * and `capabilities` are consumed by the public homepage
     * (app/[locale]/(public)/page.tsx) — the admin contract must accept
     * every type the public UI looks up.
     */
    private const TYPES = ['hero', 'stats', 'why_choose', 'capabilities', 'services', 'products', 'process', 'cta'];

    public function __construct(
        private readonly CreateHomepageSectionAction $createSection,
        private readonly UpdateHomepageSectionAction $updateSection,
        private readonly AuditService $auditService,
    ) {}

    public function index(): JsonResponse
    {
        $this->authorize('manage_homepage');

        $sections = HomepageSection::ordered()->get();

        return response()->json(['success' => true, 'data' => $sections]);
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorize('manage_homepage');

        $validated = $request->validate([
            'type' => ['required', Rule::in(self::TYPES)],
            'title_en' => ['nullable', 'string', 'max:255'],
            'title_ar' => ['nullable', 'string', 'max:255'],
            'subtitle_en' => ['nullable', 'string', 'max:500'],
            'subtitle_ar' => ['nullable', 'string', 'max:500'],
            'content' => ['nullable', 'array'],
            'is_enabled' => ['sometimes', 'boolean'],
            'sort_order' => ['sometimes', 'integer', 'min:0', 'max:9999'],
        ]);

        $section = $this->createSection->execute($validated);
        $this->auditService->logModelChange('homepage_section.created', $section);

        return response()->json(['success' => true, 'data' => $section], Response::HTTP_CREATED);
    }

    public function show(HomepageSection $section): JsonResponse
    {
        $this->authorize('manage_homepage');

        return response()->json(['success' => true, 'data' => $section]);
    }

    public function update(Request $request, HomepageSection $section): JsonResponse
    {
        $this->authorize('manage_homepage');

        $validated = $request->validate([
            'type' => ['sometimes', Rule::in(self::TYPES)],
            'title_en' => ['nullable', 'string', 'max:255'],
            'title_ar' => ['nullable', 'string', 'max:255'],
            'subtitle_en' => ['nullable', 'string', 'max:500'],
            'subtitle_ar' => ['nullable', 'string', 'max:500'],
            'content' => ['nullable', 'array'],
            'is_enabled' => ['sometimes', 'boolean'],
            'sort_order' => ['sometimes', 'integer', 'min:0', 'max:9999'],
        ]);

        $updated = $this->updateSection->execute($section, $validated);
        $this->auditService->logModelChange('homepage_section.updated', $updated);

        return response()->json(['success' => true, 'data' => $updated]);
    }

    public function destroy(HomepageSection $section): JsonResponse
    {
        $this->authorize('manage_homepage');

        $this->auditService->logModelChange('homepage_section.deleted', $section);
        $section->delete();

        return response()->json(['success' => true, 'message' => 'Section deleted.']);
    }
}
