<?php

namespace App\Http\Controllers\Admin;

use App\Domains\Content\Actions\CreateTimelineEntryAction;
use App\Domains\Content\Actions\UpdateTimelineEntryAction;
use App\Domains\Content\Models\TimelineEntry;
use App\Domains\System\Services\AuditService;
use App\Http\Controllers\Controller;
use App\Http\Resources\Admin\TimelineResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;

class TimelineController extends Controller
{
    public function __construct(
        private readonly CreateTimelineEntryAction $createEntry,
        private readonly UpdateTimelineEntryAction $updateEntry,
        private readonly AuditService $auditService,
    ) {}

    public function index(): JsonResponse
    {
        $this->authorize('manage_timeline');

        $entries = TimelineEntry::with('product:id,name_en,slug')
            // Product-scoping: company-level entries (product_id null)
            // stay visible to every admin; product-linked entries only
            // to admins explicitly granted that product.
            ->when(! Auth::user()->isSuperAdmin(), fn ($q) => $q->where(function ($sub) {
                $sub->whereNull('product_id')
                    ->orWhereIn('product_id', Auth::user()->products()->pluck('products.id'));
            })
            )
            ->ordered()
            ->get();

        return response()->json(['success' => true, 'data' => TimelineResource::collection($entries)]);
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorize('manage_timeline');

        $validated = $request->validate([
            'title_en' => ['required', 'string', 'max:200'],
            'title_ar' => ['required', 'string', 'max:200'],
            'description_en' => ['nullable', 'string'],
            'description_ar' => ['nullable', 'string'],
            'event_date' => ['required', 'date'],
            'type' => ['sometimes', Rule::in(['founding', 'product_launch', 'milestone', 'award', 'partnership'])],
            'product_id' => ['nullable', 'uuid', 'exists:products,id'],
            'is_public' => ['sometimes', 'boolean'],
            'sort_order' => ['sometimes', 'integer'],
        ]);

        // A scoped admin may only link an entry to a product they own.
        if (isset($validated['product_id']) && ! Auth::user()->canAccessProduct($validated['product_id'])) {
            abort(403, 'You do not have access to this product.');
        }

        $entry = $this->createEntry->execute($validated);

        return response()->json(['success' => true, 'data' => new TimelineResource($entry->load('product'))], Response::HTTP_CREATED);
    }

    private function canAccessEntry(?string $productId): bool
    {
        // Company-level entries (no product) are visible to every admin.
        return $productId === null || Auth::user()->canAccessProduct($productId);
    }

    public function update(Request $request, TimelineEntry $timelineEntry): JsonResponse
    {
        $this->authorize('manage_timeline');
        abort_unless($this->canAccessEntry($timelineEntry->product_id), 403, 'You do not have access to this product.');

        $validated = $request->validate([
            'title_en' => ['sometimes', 'string', 'max:200'],
            'title_ar' => ['sometimes', 'string', 'max:200'],
            'description_en' => ['nullable', 'string'],
            'description_ar' => ['nullable', 'string'],
            'event_date' => ['sometimes', 'date'],
            'type' => ['sometimes', Rule::in(['founding', 'product_launch', 'milestone', 'award', 'partnership'])],
            'is_public' => ['sometimes', 'boolean'],
            'sort_order' => ['sometimes', 'integer'],
        ]);

        $updated = $this->updateEntry->execute($timelineEntry, $validated);

        return response()->json(['success' => true, 'data' => new TimelineResource($updated->load('product'))]);
    }

    public function destroy(TimelineEntry $timelineEntry): JsonResponse
    {
        $this->authorize('manage_timeline');
        abort_unless($this->canAccessEntry($timelineEntry->product_id), 403, 'You do not have access to this product.');
        $timelineEntry->delete();

        return response()->json(['success' => true, 'message' => 'Timeline entry deleted.']);
    }
}
