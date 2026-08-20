<?php

namespace App\Http\Controllers\Admin;

use App\Domains\System\Models\FeatureFlag;
use App\Domains\System\Services\AuditService;
use App\Domains\System\Services\FeatureFlagService;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;

class FeatureFlagController extends Controller
{
    public function __construct(
        private readonly FeatureFlagService $flagService,
        private readonly AuditService $auditService,
    ) {}

    public function index(): JsonResponse
    {
        $this->authorize('manage_feature_flags');

        $flags = FeatureFlag::with('product:id,name_en,slug')
            // Product-scoping: global flags (product_id null) stay
            // visible; product flags only to admins granted that product.
            ->when(! Auth::user()->isSuperAdmin(), fn ($q) => $q->where(function ($sub) {
                $sub->whereNull('product_id')
                    ->orWhereIn('product_id', Auth::user()->products()->pluck('products.id'));
            })
            )
            ->orderBy('key')
            ->get();

        return response()->json(['success' => true, 'data' => $flags]);
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorize('manage_feature_flags');

        $validated = $request->validate([
            'key' => ['required', 'string', 'max:100', 'regex:/^[a-z0-9_.-]+$/', 'unique:feature_flags,key'],
            'is_enabled' => ['sometimes', 'boolean'],
            'description' => ['nullable', 'string', 'max:300'],
            'product_id' => ['nullable', 'uuid', 'exists:products,id'],
            'environment' => ['sometimes', Rule::in(['all', 'production', 'staging', 'local'])],
            'enabled_for' => ['nullable', 'array'],
            'enabled_for.users' => ['nullable', 'array'],
            'enabled_for.roles' => ['nullable', 'array'],
        ]);

        // A scoped admin may only attach a flag to a product they own.
        if (isset($validated['product_id']) && ! Auth::user()->canAccessProduct($validated['product_id'])) {
            abort(403, 'You do not have access to this product.');
        }

        $flag = FeatureFlag::create(array_merge($validated, [
            'updated_by' => Auth::id(),
        ]));

        // Invalidate cache immediately
        $this->flagService->invalidate();

        $this->auditService->log('feature_flag.created', 'FeatureFlag', $flag->id,
            newValues: ['key' => $flag->key, 'is_enabled' => $flag->is_enabled]
        );

        return response()->json([
            'success' => true,
            'message' => 'Feature flag created.',
            'data' => $flag,
        ], Response::HTTP_CREATED);
    }

    public function update(Request $request, FeatureFlag $featureFlag): JsonResponse
    {
        $this->authorize('manage_feature_flags');

        // A scoped admin may only touch flags attached to products they own.
        if ($featureFlag->product_id !== null && ! Auth::user()->canAccessProduct($featureFlag->product_id)) {
            abort(403, 'You do not have access to this product.');
        }

        $validated = $request->validate([
            'is_enabled' => ['sometimes', 'boolean'],
            'description' => ['nullable', 'string', 'max:300'],
            'environment' => ['sometimes', Rule::in(['all', 'production', 'staging', 'local'])],
            'enabled_for' => ['nullable', 'array'],
        ]);

        $old = $featureFlag->only(['is_enabled', 'environment']);

        $featureFlag->update(array_merge($validated, ['updated_by' => Auth::id()]));

        // Invalidate cache immediately after every change
        $this->flagService->invalidate();

        $this->auditService->log('feature_flag.updated', 'FeatureFlag', $featureFlag->id,
            oldValues: $old,
            newValues: $validated,
        );

        return response()->json([
            'success' => true,
            'message' => 'Feature flag updated.',
            'data' => $featureFlag->fresh(),
        ]);
    }

    public function destroy(FeatureFlag $featureFlag): JsonResponse
    {
        $this->authorize('manage_feature_flags');

        if ($featureFlag->product_id !== null && ! Auth::user()->canAccessProduct($featureFlag->product_id)) {
            abort(403, 'You do not have access to this product.');
        }

        $this->auditService->log('feature_flag.deleted', 'FeatureFlag', $featureFlag->id,
            oldValues: ['key' => $featureFlag->key]
        );

        $featureFlag->delete();

        // Invalidate cache
        $this->flagService->invalidate();

        return response()->json(['success' => true, 'message' => 'Feature flag deleted.']);
    }
}
