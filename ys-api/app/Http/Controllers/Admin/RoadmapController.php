<?php

namespace App\Http\Controllers\Admin;

use App\Domains\Content\Actions\CreateRoadmapItemAction;
use App\Domains\Content\Actions\UpdateRoadmapItemAction;
use App\Domains\Content\Models\RoadmapItem;
use App\Domains\System\Services\AuditService;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;

class RoadmapController extends Controller
{
    public function __construct(
        private readonly CreateRoadmapItemAction $createItem,
        private readonly UpdateRoadmapItemAction $updateItem,
        private readonly AuditService $auditService,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $this->authorize('manage_roadmap');

        $items = RoadmapItem::with('product:id,name_en,slug')
            // Product-scoping: global items (product_id null) stay
            // visible to every admin; product items only to admins
            // explicitly granted that product (see User::canAccessProduct).
            ->when(! Auth::user()->isSuperAdmin(), fn ($q) => $q->where(function ($sub) {
                $sub->whereNull('product_id')
                    ->orWhereIn('product_id', Auth::user()->products()->pluck('products.id'));
            })
            )
            ->when($request->query('product_id'), fn ($q, $id) => $q->where('product_id', $id))
            ->when($request->query('status'), fn ($q, $s) => $q->byStatus($s))
            ->when($request->query('priority'), fn ($q, $p) => $q->where('priority', $p))
            ->ordered()
            ->paginate($this->perPage($request, 20));

        return response()->json([
            'success' => true,
            'data' => $items->items(),
            'meta' => ['current_page' => $items->currentPage(), 'last_page' => $items->lastPage(), 'total' => $items->total()],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorize('manage_roadmap');

        $validated = $request->validate([
            'product_id' => ['nullable', 'uuid', 'exists:products,id'],
            'title_en' => ['required', 'string', 'max:200'],
            'title_ar' => ['required', 'string', 'max:200'],
            'description_en' => ['nullable', 'string'],
            'description_ar' => ['nullable', 'string'],
            'status' => ['sometimes', Rule::in(['planned', 'in_progress', 'completed', 'cancelled'])],
            'priority' => ['sometimes', Rule::in(['low', 'medium', 'high', 'critical'])],
            'target_version' => ['nullable', 'string', 'max:20'],
            'target_quarter' => ['nullable', 'string', 'max:20'],
            'is_public' => ['sometimes', 'boolean'],
            'sort_order' => ['sometimes', 'integer', 'min:0'],
        ]);

        // A scoped admin may only create items for products they own.
        if (isset($validated['product_id']) && ! Auth::user()->canAccessProduct($validated['product_id'])) {
            abort(403, 'You do not have access to this product.');
        }

        $item = $this->createItem->execute($validated);
        $this->auditService->logModelChange('roadmap_item.created', $item);

        return response()->json(['success' => true, 'data' => $item], Response::HTTP_CREATED);
    }

    private function canAccessItem(?string $productId): bool
    {
        // Global items (no product) are visible to every admin.
        return $productId === null || Auth::user()->canAccessProduct($productId);
    }

    public function show(RoadmapItem $roadmapItem): JsonResponse
    {
        $this->authorize('manage_roadmap');
        abort_unless($this->canAccessItem($roadmapItem->product_id), 403, 'You do not have access to this product.');

        return response()->json([
            'success' => true,
            'data' => $roadmapItem->load('product:id,name_en,slug'),
        ]);
    }

    public function update(Request $request, RoadmapItem $roadmapItem): JsonResponse
    {
        $this->authorize('manage_roadmap');
        abort_unless($this->canAccessItem($roadmapItem->product_id), 403, 'You do not have access to this product.');

        $validated = $request->validate([
            'title_en' => ['sometimes', 'string', 'max:200'],
            'title_ar' => ['sometimes', 'string', 'max:200'],
            'description_en' => ['nullable', 'string'],
            'description_ar' => ['nullable', 'string'],
            'status' => ['sometimes', Rule::in(['planned', 'in_progress', 'completed', 'cancelled'])],
            'priority' => ['sometimes', Rule::in(['low', 'medium', 'high', 'critical'])],
            'target_version' => ['nullable', 'string', 'max:20'],
            'target_quarter' => ['nullable', 'string', 'max:20'],
            'is_public' => ['sometimes', 'boolean'],
            'sort_order' => ['sometimes', 'integer', 'min:0'],
        ]);

        $updated = $this->updateItem->execute($roadmapItem, $validated);
        $this->auditService->logModelChange('roadmap_item.updated', $updated);

        return response()->json(['success' => true, 'data' => $updated]);
    }

    public function destroy(RoadmapItem $roadmapItem): JsonResponse
    {
        $this->authorize('manage_roadmap');
        abort_unless($this->canAccessItem($roadmapItem->product_id), 403, 'You do not have access to this product.');

        $this->auditService->logModelChange('roadmap_item.deleted', $roadmapItem);
        $roadmapItem->delete();

        return response()->json(['success' => true, 'message' => 'Roadmap item deleted.']);
    }
}
