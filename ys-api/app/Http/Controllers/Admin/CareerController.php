<?php

namespace App\Http\Controllers\Admin;

use App\Domains\Content\Actions\CreateCareerAction;
use App\Domains\Content\Actions\UpdateCareerAction;
use App\Domains\Content\Models\Career;
use App\Domains\System\Services\AuditService;
use App\Http\Controllers\Controller;
use App\Http\Resources\Admin\CareerResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Validation\Rule;

class CareerController extends Controller
{
    public function __construct(
        private readonly CreateCareerAction $createCareer,
        private readonly UpdateCareerAction $updateCareer,
        private readonly AuditService $auditService,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $this->authorize('manage_careers');

        $careers = Career::with('creator')
            ->when($request->query('status'), fn ($q, $s) => $q->where('status', $s))
            ->when($request->query('department'), fn ($q, $d) => $q->byDepartment($d))
            ->ordered()
            ->paginate($this->perPage($request, 15));

        return response()->json([
            'success' => true,
            'data' => CareerResource::collection($careers->items()),
            'meta' => ['current_page' => $careers->currentPage(), 'last_page' => $careers->lastPage(), 'total' => $careers->total()],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorize('manage_careers');

        $validated = $request->validate([
            'title_en' => ['required', 'string', 'max:150'],
            'title_ar' => ['required', 'string', 'max:150'],
            'department' => ['required', 'string', 'max:100'],
            'location' => ['sometimes', 'string', 'max:100'],
            'type' => ['sometimes', Rule::in(['full_time', 'part_time', 'contract', 'internship'])],
            'description_en' => ['nullable', 'string'],
            'description_ar' => ['nullable', 'string'],
            'requirements' => ['nullable', 'array'],
            'requirements.*' => ['string', 'max:300'],
            'responsibilities' => ['nullable', 'array'],
            'responsibilities.*' => ['string', 'max:300'],
            'status' => ['sometimes', Rule::in(['open', 'closed', 'draft'])],
            'is_featured' => ['sometimes', 'boolean'],
            'sort_order' => ['sometimes', 'integer', 'min:0'],
        ]);

        $career = $this->createCareer->execute($validated);
        $this->auditService->logModelChange('career.created', $career);

        return response()->json(['success' => true, 'data' => new CareerResource($career)], Response::HTTP_CREATED);
    }

    public function show(Career $career): JsonResponse
    {
        $this->authorize('manage_careers');

        return response()->json(['success' => true, 'data' => new CareerResource($career->load('creator'))]);
    }

    public function update(Request $request, Career $career): JsonResponse
    {
        $this->authorize('manage_careers');

        $validated = $request->validate([
            'title_en' => ['sometimes', 'string', 'max:150'],
            'title_ar' => ['sometimes', 'string', 'max:150'],
            'department' => ['sometimes', 'string', 'max:100'],
            'location' => ['sometimes', 'string', 'max:100'],
            'type' => ['sometimes', Rule::in(['full_time', 'part_time', 'contract', 'internship'])],
            'description_en' => ['nullable', 'string'],
            'description_ar' => ['nullable', 'string'],
            'requirements' => ['nullable', 'array'],
            'responsibilities' => ['nullable', 'array'],
            'status' => ['sometimes', Rule::in(['open', 'closed', 'draft'])],
            'is_featured' => ['sometimes', 'boolean'],
            'sort_order' => ['sometimes', 'integer', 'min:0'],
        ]);

        $updated = $this->updateCareer->execute($career, $validated);
        $this->auditService->logModelChange('career.updated', $updated);

        return response()->json(['success' => true, 'data' => new CareerResource($updated)]);
    }

    public function destroy(Career $career): JsonResponse
    {
        $this->authorize('manage_careers');

        $this->auditService->logModelChange('career.deleted', $career);
        $career->delete();

        return response()->json(['success' => true, 'message' => 'Career listing deleted.']);
    }
}
