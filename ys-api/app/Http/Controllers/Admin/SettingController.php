<?php

namespace App\Http\Controllers\Admin;

use App\Domains\System\Models\Setting;
use App\Domains\System\Services\AuditService;
use App\Domains\System\Services\HtmlSanitizerService;
use App\Http\Controllers\Controller;
use App\Rules\SafeUrl;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;

class SettingController extends Controller
{
    /**
     * VULN-04/VULN-25 remediation — per-key value validation map.
     *
     * Settings are rendered on the public site (social URLs into href,
     * company_name into text, maintenance_mode into toggles), so the
     * value type is validated per known key:
     *   - *_url keys      → absolute https:// URL only (blocks javascript:
     *                       and other executable schemes)
     *   - *_email keys    → RFC email
     *   - boolean keys    → boolean
     *   - text keys       → plain string + max length
     *   - HTML keys       → (none exist today) would be routed through
     *                       HtmlSanitizerService::sanitize()
     * Unknown keys fall back to a bounded plain string (safe default).
     * Keep this map in sync with SettingsSeeder when adding settings.
     */
    private static function valueRules(): array
    {
        return [
            // ── URL keys (absolute https only) ────────────────────────
            'github_url' => ['nullable', 'url', 'max:500', new SafeUrl(strictHttps: true)],
            'tiktok_url' => ['nullable', 'url', 'max:500', new SafeUrl(strictHttps: true)],
            'x_url' => ['nullable', 'url', 'max:500', new SafeUrl(strictHttps: true)],
            'linkedin_url' => ['nullable', 'url', 'max:500', new SafeUrl(strictHttps: true)],

            // ── Email keys ────────────────────────────────────────────
            'contact_email' => ['nullable', 'email:rfc', 'max:255'],
            'support_email' => ['nullable', 'email:rfc', 'max:255'],
            'sales_email' => ['nullable', 'email:rfc', 'max:255'],
            'security_email' => ['nullable', 'email:rfc', 'max:255'],
            'privacy_email' => ['nullable', 'email:rfc', 'max:255'],
            'press_email' => ['nullable', 'email:rfc', 'max:255'],

            // ── Boolean keys ──────────────────────────────────────────
            'maintenance_mode' => ['nullable', 'boolean'],

            // ── Text keys ─────────────────────────────────────────────
            'company_name' => ['nullable', 'string', 'max:150'],
            'company_tagline_en' => ['nullable', 'string', 'max:255'],
            'company_tagline_ar' => ['nullable', 'string', 'max:255'],
            'company_description_en' => ['nullable', 'string', 'max:2000'],
            'company_description_ar' => ['nullable', 'string', 'max:2000'],
            'default_og_title_en' => ['nullable', 'string', 'max:200'],
            'default_og_title_ar' => ['nullable', 'string', 'max:200'],
            'whatsapp_number' => ['nullable', 'string', 'max:32'],
            'whatsapp_display' => ['nullable', 'string', 'max:64'],

            // ── HTML keys (none seeded today; would sanitize via
            //    HtmlSanitizerService before storage) ──────────────────
        ];
    }

    private static function defaultValueRules(): array
    {
        return ['nullable', 'string', 'max:500'];
    }

    public function __construct(
        private readonly AuditService $auditService,
        private readonly HtmlSanitizerService $sanitizer,
    ) {}

    /**
     * GET /api/v1/admin/settings
     */
    public function index(Request $request): JsonResponse
    {
        $this->authorize('manage_settings');

        $settings = Setting::query()
            ->when($request->query('group'), fn ($q, $g) => $q->group($g))
            ->orderBy('group')
            ->orderBy('key')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $settings,
        ]);
    }

    /**
     * GET /api/v1/admin/settings/{setting}
     */
    public function show(Setting $setting): JsonResponse
    {
        $this->authorize('manage_settings');

        return response()->json([
            'success' => true,
            'data' => $setting,
        ]);
    }

    /**
     * PUT /api/v1/admin/settings/{setting}
     */
    public function update(Request $request, Setting $setting): JsonResponse
    {
        $this->authorize('manage_settings');

        $validated = $request->validate([
            'value' => ['required'],
        ]);

        // VULN-04/VULN-25: validate the value against the per-key map
        // (https-only for URLs, boolean for toggles, bounded string for
        // text). Rejects javascript:/data:/vbscript:/file: payloads that
        // would otherwise be served into public href/src attributes.
        $rules = self::valueRules()[$setting->key] ?? self::defaultValueRules();
        $validated = $request->validate(['value' => $rules]);

        $value = $validated['value'];

        $oldValue = $setting->value;

        $setting->update([
            'value' => $value,
            'updated_by' => Auth::id(),
        ]);

        // Bust public settings cache on any update
        Cache::forget('public_settings');

        $this->auditService->log(
            action: 'setting.updated',
            resourceType: 'Setting',
            resourceId: $setting->id,
            oldValues: ['value' => $oldValue],
            newValues: ['value' => $value],
        );

        return response()->json([
            'success' => true,
            'message' => 'Setting updated successfully.',
            'data' => $setting->fresh(),
        ]);
    }
}
