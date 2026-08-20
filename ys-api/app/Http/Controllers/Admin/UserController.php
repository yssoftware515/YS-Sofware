<?php

namespace App\Http\Controllers\Admin;

use App\Domains\Auth\Models\Role;
use App\Domains\Auth\Models\User;
use App\Domains\System\Services\AuditService;
use App\Http\Controllers\Controller;
use App\Http\Resources\Auth\UserResource;
use App\Jobs\SendAdminUserCreatedJob;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;

class UserController extends Controller
{
    public function __construct(
        private readonly AuditService $auditService,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $this->authorize('manage_users');

        $users = User::with(['role', 'products:id'])
            ->when($request->query('role'), fn ($q, $r) => $q->whereHas('role', fn ($rq) => $rq->where('slug', $r))
            )
            ->when($request->query('search'), fn ($q, $s) => $q->where(fn ($sub) => $sub
                ->where('name', 'ilike', "%{$s}%")
                ->orWhere('email', 'ilike', "%{$s}%")
            )
            )
            ->orderBy('name')
            ->paginate($this->perPage($request, 15));

        return response()->json([
            'success' => true,
            'data' => UserResource::collection($users),
            'meta' => [
                'current_page' => $users->currentPage(),
                'last_page' => $users->lastPage(),
                'total' => $users->total(),
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorize('manage_users');

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'email' => ['required', 'email:rfc', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', 'min:12', 'confirmed'],
            'role_id' => ['required', 'uuid', 'exists:roles,id'],
        ]);

        // Prevent creating another super admin unless current user is super admin.
        // Privilege is defined by the role's '*' permission (see
        // Role::grantsSuperAdmin), never by its slug — the slug is mutable
        // metadata, and a renamed slug must not demote or promote anyone.
        $role = Role::findOrFail($validated['role_id']);
        $actor = Auth::user();

        if (! $actor->isSuperAdmin()) {
            if ($role->grantsSuperAdmin()) {
                abort(403, 'Only a super admin can create another super admin.');
            }

            // Permission-subset rule (mirror of update()): the assigned
            // role's permission set must be a subset of the actor's own,
            // otherwise a scoped admin could create users with privileges
            // they never had (lateral privilege movement).
            $actorPermissions = $actor->role?->permissions ?? [];
            $assignedPermissions = $role->permissions ?? [];
            if (array_diff($assignedPermissions, $actorPermissions) !== []) {
                abort(403, 'You cannot assign a role with permissions you do not hold.');
            }
        }

        $user = User::create($validated);

        // VULN-03: the job payload carries only the user id — the
        // one-time sign-in token is generated inside the job and mailed
        // there; the creator-chosen password never leaves this request.
        SendAdminUserCreatedJob::dispatch($user->id)->afterCommit();

        $this->auditService->log(
            action: 'user.created',
            resourceType: 'User',
            resourceId: $user->id,
            newValues: ['name' => $user->name, 'email' => $user->email, 'role' => $role->slug],
        );

        return response()->json([
            'success' => true,
            'message' => 'User created successfully.',
            'data' => new UserResource($user->load('role')),
        ], Response::HTTP_CREATED);
    }

    public function show(User $user): JsonResponse
    {
        $this->authorize('manage_users');

        return response()->json([
            'success' => true,
            'data' => new UserResource($user->load(['role', 'products:id'])),
        ]);
    }

    public function update(Request $request, User $user): JsonResponse
    {
        $this->authorize('manage_users');

        // Prevent non-super-admins from editing super admin accounts
        // (privilege is the '*' permission, not the role slug — see
        // Role::grantsSuperAdmin).
        if ($user->isSuperAdmin() && ! Auth::user()->isSuperAdmin()) {
            abort(403, 'Cannot modify a super admin account.');
        }

        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'max:100'],
            'email' => ['sometimes', 'email:rfc', Rule::unique('users')->ignore($user->id)],
            'role_id' => ['sometimes', 'uuid', 'exists:roles,id'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        // Prevent demoting or disabling own account
        if ($user->id === Auth::id()) {
            unset($validated['role_id'], $validated['is_active']);
        }

        // VULN-01 remediation: a role assignment on update() must be held
        // to the same escalation guards store() enforces on creation.
        // Without this, any manage_users holder could promote arbitrary
        // users to super_admin (or to any role with permissions they do
        // not hold themselves), taking over the platform.
        if (isset($validated['role_id'])) {
            $assignedRole = Role::findOrFail($validated['role_id']);
            $actor = Auth::user();

            // Super admins may assign any role (including super_admin).
            if (! $actor->isSuperAdmin()) {
                if ($assignedRole->grantsSuperAdmin()) {
                    abort(403, 'Only a super admin can assign the super admin role.');
                }

                // Permission-subset rule: the assigned role's permission
                // set must be a subset of the actor's own permission set,
                // otherwise a scoped admin could hand out privileges they
                // never had (lateral privilege movement, VULN-16).
                $actorPermissions = $actor->role?->permissions ?? [];
                $assignedPermissions = $assignedRole->permissions ?? [];
                if (array_diff($assignedPermissions, $actorPermissions) !== []) {
                    abort(403, 'You cannot assign a role with permissions you do not hold.');
                }
            }
        }

        $oldValues = $user->only(['name', 'email', 'is_active']);
        $user->update($validated);

        $this->auditService->log(
            action: 'user.updated',
            resourceType: 'User',
            resourceId: $user->id,
            oldValues: $oldValues,
            newValues: $validated,
        );

        return response()->json([
            'success' => true,
            'message' => 'User updated successfully.',
            'data' => new UserResource($user->fresh('role')),
        ]);
    }

    /**
     * PUT /api/v1/admin/users/{user}/products
     *
     * Sets which products this admin can access (see
     * User::canAccessProduct). Gated by manage_admins, not manage_users —
     * assigning scope IS the sensitive "grant admin access" action the
     * business asked to be delegatable separately from ordinary user CRUD.
     */
    public function syncProducts(Request $request, User $user): JsonResponse
    {
        $this->authorize('manage_admins');

        $validated = $request->validate([
            'product_ids' => ['required', 'array'],
            'product_ids.*' => ['uuid', 'exists:products,id'],
        ]);

        // A non-super-admin can't grant access to a product they don't
        // have themselves — otherwise a scoped admin with manage_admins
        // could hand out (or take for themselves via another account)
        // access beyond their own scope, defeating the whole point of
        // scoping in the first place.
        $actor = Auth::user();
        if (! $actor->isSuperAdmin()) {
            $allowed = $actor->products()->pluck('products.id')->all();
            $requested = $validated['product_ids'];
            if (array_diff($requested, $allowed) !== []) {
                abort(403, 'You can only grant access to products you have access to yourself.');
            }
        }

        $user->products()->sync($validated['product_ids']);

        $this->auditService->log(
            action: 'user.product_access_updated',
            resourceType: 'User',
            resourceId: $user->id,
            newValues: ['product_ids' => $validated['product_ids']],
        );

        return response()->json([
            'success' => true,
            'message' => 'Product access updated successfully.',
            'data' => new UserResource($user->fresh(['role', 'products:id'])),
        ]);
    }

    public function destroy(User $user): JsonResponse
    {
        $this->authorize('manage_users');

        // Cannot delete own account
        if ($user->id === Auth::id()) {
            abort(422, 'You cannot delete your own account.');
        }

        // Cannot delete super admin accounts (privilege is the '*'
        // permission, not the role slug — see Role::grantsSuperAdmin)
        if ($user->isSuperAdmin()) {
            abort(403, 'Super admin accounts cannot be deleted.');
        }

        $user->tokens()->delete();
        $user->delete(); // Soft delete

        $this->auditService->log(
            action: 'user.deleted',
            resourceType: 'User',
            resourceId: $user->id,
        );

        return response()->json([
            'success' => true,
            'message' => 'User deleted successfully.',
        ]);
    }
}
