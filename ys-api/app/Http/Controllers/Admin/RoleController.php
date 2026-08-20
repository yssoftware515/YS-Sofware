<?php

namespace App\Http\Controllers\Admin;

use App\Domains\Auth\Models\Role;
use App\Domains\System\Services\AuditService;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\Role\CreateRoleRequest;
use App\Http\Requests\Admin\Role\UpdateRoleRequest;
use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;

class RoleController extends Controller
{
    public function __construct(
        private readonly AuditService $auditService,
    ) {}

    /**
     * GET /api/v1/admin/roles
     * Also used to populate role-assignment dropdowns in the Users panel.
     */
    public function index(): JsonResponse
    {
        $this->authorize('manage_users');

        $roles = Role::orderBy('name')->get(['id', 'name', 'slug', 'description', 'permissions']);

        return response()->json(['success' => true, 'data' => $roles]);
    }

    public function show(Role $role): JsonResponse
    {
        $this->authorize('manage_admins');

        return response()->json(['success' => true, 'data' => $role]);
    }

    public function store(CreateRoleRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $role = Role::create($validated);

        $this->auditService->logModelChange('role.created', $role);

        return response()->json([
            'success' => true,
            'message' => 'Role created successfully.',
            'data' => $role,
        ], Response::HTTP_CREATED);
    }

    public function update(UpdateRoleRequest $request, Role $role): JsonResponse
    {
        $validated = $request->validated();

        // Safety net: a role currently holding '*' (the literal super-admin
        // wildcard, seeded — never assignable through CreateRoleRequest)
        // can't be edited into NOT having '*' through this endpoint. That
        // specific downgrade is a one-time, deliberate database action,
        // not something that should be possible via a form field a busy
        // admin could uncheck by mistake and lock the whole company out.
        if (in_array('*', $role->permissions, true)
            && isset($validated['permissions'])
            && ! in_array('*', $validated['permissions'], true)
        ) {
            abort(422, 'This role grants full super-admin access and cannot be downgraded here.');
        }

        // The '*' role's slug is immutable: other checks key off the
        // '*' permission itself (never the slug), but a renamed slug
        // would silently break the seeded role's uniqueness guarantee
        // and any slug-keyed consumers (seeder idempotency, index
        // filters). Renaming it is a deliberate one-time database
        // action, not an endpoint operation.
        if ($role->grantsSuperAdmin()
            && isset($validated['slug'])
            && $validated['slug'] !== $role->slug
        ) {
            abort(422, 'The slug of the super-admin role cannot be changed.');
        }

        $old = $role->only(['name', 'permissions']);
        $role->update($validated);

        $this->auditService->log(
            action: 'role.updated',
            resourceType: 'Role',
            resourceId: $role->id,
            oldValues: $old,
        );

        return response()->json(['success' => true, 'data' => $role->fresh()]);
    }

    public function destroy(Role $role): JsonResponse
    {
        $this->authorize('manage_admins');

        if (in_array('*', $role->permissions, true)) {
            abort(422, 'The super-admin role cannot be deleted.');
        }

        try {
            $this->auditService->logModelChange('role.deleted', $role);
            $role->delete();
        } catch (QueryException) {
            // users.role_id -> roles.id is restrictOnDelete() at the DB
            // level — this catch turns that constraint violation into a
            // clean 422 instead of a raw 500.
            abort(422, 'Cannot delete a role that is still assigned to one or more users. Reassign them first.');
        }

        return response()->json(['success' => true, 'message' => 'Role deleted successfully.']);
    }
}
