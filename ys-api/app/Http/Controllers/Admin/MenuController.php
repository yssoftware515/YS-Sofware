<?php

namespace App\Http\Controllers\Admin;

use App\Domains\Cms\Actions\CreateMenuAction;
use App\Domains\Cms\Actions\CreateMenuItemAction;
use App\Domains\Cms\Actions\UpdateMenuAction;
use App\Domains\Cms\Actions\UpdateMenuItemAction;
use App\Domains\Cms\Models\Menu;
use App\Domains\Cms\Models\MenuItem;
use App\Domains\System\Services\AuditService;
use App\Http\Controllers\Controller;
use App\Rules\SafeUrl;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Validation\Rule;

class MenuController extends Controller
{
    public function __construct(
        private readonly CreateMenuAction $createMenu,
        private readonly UpdateMenuAction $updateMenu,
        private readonly CreateMenuItemAction $createMenuItem,
        private readonly UpdateMenuItemAction $updateMenuItem,
        private readonly AuditService $auditService,
    ) {}

    // ── Menus ────────────────────────────────────────────────────────

    public function index(): JsonResponse
    {
        $this->authorize('manage_menus');

        $menus = Menu::with(['rootItems' => fn ($q) => $q->orderBy('sort_order'),
            'rootItems.children' => fn ($q) => $q->orderBy('sort_order')])
            ->get();

        return response()->json(['success' => true, 'data' => $menus]);
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorize('manage_menus');

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'location' => ['required', 'string', 'max:50', Rule::unique('menus', 'location')],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        $menu = $this->createMenu->execute($validated);
        $this->auditService->logModelChange('menu.created', $menu);

        return response()->json(['success' => true, 'data' => $menu], Response::HTTP_CREATED);
    }

    public function show(Menu $menu): JsonResponse
    {
        $this->authorize('manage_menus');

        $menu->load(['rootItems' => fn ($q) => $q->orderBy('sort_order'),
            'rootItems.children' => fn ($q) => $q->orderBy('sort_order')]);

        return response()->json(['success' => true, 'data' => $menu]);
    }

    public function update(Request $request, Menu $menu): JsonResponse
    {
        $this->authorize('manage_menus');

        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'max:100'],
            'location' => ['sometimes', 'string', 'max:50', Rule::unique('menus', 'location')->ignore($menu->id)],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        $updated = $this->updateMenu->execute($menu, $validated);
        $this->auditService->logModelChange('menu.updated', $updated);

        return response()->json(['success' => true, 'data' => $updated]);
    }

    public function destroy(Menu $menu): JsonResponse
    {
        $this->authorize('manage_menus');

        $this->auditService->logModelChange('menu.deleted', $menu);
        $menu->delete();

        return response()->json(['success' => true, 'message' => 'Menu deleted.']);
    }

    // ── Menu Items ───────────────────────────────────────────────────

    public function storeItem(Request $request): JsonResponse
    {
        $this->authorize('manage_menus');

        $validated = $request->validate([
            'menu_id' => ['required', 'uuid', 'exists:menus,id'],
            'parent_id' => ['nullable', 'uuid', 'exists:menu_items,id'],
            'title_en' => ['required', 'string', 'max:200'],
            'title_ar' => ['required', 'string', 'max:200'],
            // VULN-04: menu URLs are rendered into href on the public
            // site — block executable schemes (javascript:/data:/...);
            // relative internal links (/about, #contact) stay allowed.
            'url' => ['required', 'string', 'max:500', new SafeUrl],
            'icon' => ['nullable', 'string', 'max:50'],
            'target' => ['sometimes', Rule::in(['_self', '_blank'])],
            'sort_order' => ['sometimes', 'integer', 'min:0', 'max:9999'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        $item = $this->createMenuItem->execute($validated);
        $this->auditService->logModelChange('menu_item.created', $item);

        return response()->json(['success' => true, 'data' => $item], Response::HTTP_CREATED);
    }

    public function updateItem(Request $request, MenuItem $menuItem): JsonResponse
    {
        $this->authorize('manage_menus');

        $validated = $request->validate([
            'parent_id' => ['nullable', 'uuid', 'exists:menu_items,id'],
            'title_en' => ['sometimes', 'string', 'max:200'],
            'title_ar' => ['sometimes', 'string', 'max:200'],
            // VULN-04: same scheme-blocking validation as storeItem.
            'url' => ['sometimes', 'string', 'max:500', new SafeUrl],
            'icon' => ['nullable', 'string', 'max:50'],
            'target' => ['sometimes', Rule::in(['_self', '_blank'])],
            'sort_order' => ['sometimes', 'integer', 'min:0', 'max:9999'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        $updated = $this->updateMenuItem->execute($menuItem, $validated);
        $this->auditService->logModelChange('menu_item.updated', $updated);

        return response()->json(['success' => true, 'data' => $updated]);
    }

    public function destroyItem(MenuItem $menuItem): JsonResponse
    {
        $this->authorize('manage_menus');

        $this->auditService->logModelChange('menu_item.deleted', $menuItem);
        $menuItem->delete();

        return response()->json(['success' => true, 'message' => 'Menu item deleted.']);
    }
}
