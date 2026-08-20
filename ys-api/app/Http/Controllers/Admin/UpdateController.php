<?php

namespace App\Http\Controllers\Admin;

use App\Domains\Content\Actions\CreateUpdateAction;
use App\Domains\Content\Actions\PublishUpdateAction;
use App\Domains\Content\Actions\UnpublishUpdateAction;
use App\Domains\Content\Models\Update;
use App\Domains\System\Services\AuditService;
use App\Domains\System\Services\HtmlSanitizerService;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;

class UpdateController extends Controller
{
    public function __construct(
        private readonly CreateUpdateAction $createUpdate,
        private readonly PublishUpdateAction $publishUpdate,
        private readonly UnpublishUpdateAction $unpublishUpdate,
        private readonly AuditService $auditService,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $this->authorize('manage_updates');

        $updates = Update::with('product:id,name_en,slug', 'author:id,name')
            // Product-scoping: global updates (product_id null) stay
            // visible to every admin; product updates only to admins
            // explicitly granted that product (see User::canAccessProduct).
            ->when(! Auth::user()->isSuperAdmin(), fn ($q) => $q->where(function ($sub) {
                $sub->whereNull('product_id')
                    ->orWhereIn('product_id', Auth::user()->products()->pluck('products.id'));
            })
            )
            ->when($request->query('type'), fn ($q, $t) => $q->ofType($t))
            ->when($request->query('product_id'), fn ($q, $id) => $q->where('product_id', $id))
            ->when($request->query('published'), fn ($q, $p) => $p === 'true' ? $q->published() : $q->whereNull('published_at')
            )
            ->orderByDesc('created_at')
            ->paginate($this->perPage($request, 15));

        return response()->json([
            'success' => true,
            'data' => $updates->items(),
            'meta' => ['current_page' => $updates->currentPage(), 'last_page' => $updates->lastPage(), 'total' => $updates->total()],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorize('manage_updates');

        $validated = $request->validate([
            'product_id' => ['nullable', 'uuid', 'exists:products,id'],
            'title_en' => ['required', 'string', 'max:200'],
            'title_ar' => ['required', 'string', 'max:200'],
            'content_en' => ['required', 'string'],
            'content_ar' => ['required', 'string'],
            'type' => ['sometimes', Rule::in(['announcement', 'blog', 'news', 'release'])],
            'is_featured' => ['sometimes', 'boolean'],
            'published_at' => ['nullable', 'date'],
        ]);

        // A scoped admin may only create updates for products they own.
        if (isset($validated['product_id']) && ! Auth::user()->canAccessProduct($validated['product_id'])) {
            abort(403, 'You do not have access to this product.');
        }

        $update = $this->createUpdate->execute($validated);
        $this->auditService->logModelChange('update.created', $update);

        return response()->json(['success' => true, 'data' => $update], Response::HTTP_CREATED);
    }

    private function canAccessUpdate(?string $productId): bool
    {
        // Global updates (no product) are visible to every admin.
        return $productId === null || Auth::user()->canAccessProduct($productId);
    }

    public function show(Update $update): JsonResponse
    {
        $this->authorize('manage_updates');
        abort_unless($this->canAccessUpdate($update->product_id), 403, 'You do not have access to this product.');

        return response()->json(['success' => true, 'data' => $update->load(['product:id,name_en', 'author:id,name'])]);
    }

    public function update(Request $request, Update $update): JsonResponse
    {
        $this->authorize('manage_updates');
        abort_unless($this->canAccessUpdate($update->product_id), 403, 'You do not have access to this product.');

        $validated = $request->validate([
            'title_en' => ['sometimes', 'string', 'max:200'],
            'title_ar' => ['sometimes', 'string', 'max:200'],
            'content_en' => ['sometimes', 'string'],
            'content_ar' => ['sometimes', 'string'],
            'type' => ['sometimes', Rule::in(['announcement', 'blog', 'news', 'release'])],
            'is_featured' => ['sometimes', 'boolean'],
            'published_at' => ['nullable', 'date'],
        ]);

        // VULN-04: sanitize HTML markup in update content at the write
        // boundary (mirrors CreateUpdateAction).
        $sanitizer = app(HtmlSanitizerService::class);
        if (array_key_exists('content_en', $validated)) {
            $validated['content_en'] = $sanitizer->sanitizeIfHtml($validated['content_en']);
        }
        if (array_key_exists('content_ar', $validated)) {
            $validated['content_ar'] = $sanitizer->sanitizeIfHtml($validated['content_ar']);
        }

        $update->update(array_filter($validated, fn ($v) => $v !== null));
        $this->auditService->logModelChange('update.updated', $update);

        return response()->json(['success' => true, 'data' => $update->fresh()]);
    }

    public function publish(Update $update): JsonResponse
    {
        $this->authorize('manage_updates');
        abort_unless($this->canAccessUpdate($update->product_id), 403, 'You do not have access to this product.');
        $updated = $this->publishUpdate->execute($update);
        $this->auditService->logModelChange('update.published', $updated);

        return response()->json(['success' => true, 'data' => $updated]);
    }

    public function unpublish(Update $update): JsonResponse
    {
        $this->authorize('manage_updates');
        abort_unless($this->canAccessUpdate($update->product_id), 403, 'You do not have access to this product.');
        $updated = $this->unpublishUpdate->execute($update);
        $this->auditService->logModelChange('update.unpublished', $updated);

        return response()->json(['success' => true, 'data' => $updated]);
    }

    public function destroy(Update $update): JsonResponse
    {
        $this->authorize('manage_updates');
        abort_unless($this->canAccessUpdate($update->product_id), 403, 'You do not have access to this product.');

        if (! $update->isDraft()) {
            abort(422, 'Cannot delete a published update. Unpublish it first.');
        }

        $update->delete();

        return response()->json(['success' => true, 'message' => 'Update deleted.']);
    }
}
