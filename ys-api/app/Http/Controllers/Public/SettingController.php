<?php

namespace App\Http\Controllers\Public;

use App\Domains\System\Models\Setting;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cache;

class SettingController extends Controller
{
    /**
     * GET /api/v1/public/settings
     *
     * Returns all is_public=true settings, cached for 5 minutes.
     * NEVER exposes is_public=false settings.
     */
    public function index(): JsonResponse
    {
        $settings = Cache::remember('public_settings', 300, function () {
            return Setting::public()
                ->get(['group', 'key', 'value'])
                ->groupBy('group')
                ->map(fn ($group) => $group->pluck('value', 'key'));
        });

        return response()->json([
            'success' => true,
            'data' => $settings,
        ]);
    }
}
