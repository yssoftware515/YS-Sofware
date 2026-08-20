<?php

namespace App\Domains\System\Services;

use App\Domains\System\Models\FeatureFlag;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;
use Throwable;

/**
 * Feature Flag Service.
 *
 * Cache strategy:
 * - All flags stored as ONE cache key (collection) — no per-flag lookups.
 *   This prevents Cache Penetration (missing key → DB hit → cache null).
 * - Stampede protection via atomic Cache::lock() on rebuild.
 * - Eager invalidation: cache is busted immediately on any admin change.
 *
 * Resilience (Phase 4A):
 * - The cache is best-effort. If the cache backend is unavailable the
 *   service degrades to the database (source of truth) and cache writes
 *   are skipped — a flag read can never 500 because Redis/cache is down.
 * - The database is the source of truth; a cache failure never invents
 *   flag states (a DB failure still propagates — guessing a flag's
 *   state would be unsafe).
 *
 * O(1) flag lookup after first warm-up.
 */
class FeatureFlagService
{
    private const CACHE_KEY = 'ys:feature_flags:all';

    private const LOCK_KEY = 'ys:feature_flags:rebuilding';

    private const CACHE_TTL = 300;   // 5 minutes

    private const LOCK_TTL = 10;    // seconds

    /**
     * Get all flags as a keyed collection.
     * Result is cached — DB is only hit on first request or after invalidation.
     *
     * @return Collection<string, FeatureFlag>
     */
    public function all(): Collection
    {
        try {
            $cached = Cache::get(self::CACHE_KEY);

            if ($cached !== null) {
                $data = json_decode($cached, true);

                if (is_array($data)) {
                    return $this->mapFlags($data);
                }
            }
        } catch (Throwable $e) {
            // Cache unavailable — degrade to DB (source of truth).
            report($e);
        }

        return $this->rebuild();
    }

    /**
     * Check if a feature is enabled.
     * Single-flag lookup from the in-memory collection — O(1).
     */
    public function isEnabled(string $key): bool
    {
        $flag = $this->all()->get($key);

        if ($flag === null) {
            // Flag doesn't exist → treat as disabled (not a DB hit)
            return false;
        }

        return $flag->is_enabled && $this->isActiveForEnvironment($flag);
    }

    /**
     * Check if flag is enabled for a specific user (role or ID targeting).
     */
    public function isEnabledFor(string $key, ?object $user = null): bool
    {
        if (! $this->isEnabled($key)) {
            return false;
        }

        $flag = $this->all()->get($key);

        if (empty($flag->enabled_for)) {
            return true; // no targeting = everyone
        }

        if ($user === null) {
            return false;
        }

        $targeting = is_string($flag->enabled_for)
            ? json_decode($flag->enabled_for, true)
            : (array) $flag->enabled_for;

        // Check role targeting
        if (isset($targeting['roles']) && in_array($user->role?->slug, $targeting['roles'], true)) {
            return true;
        }

        // Check user ID targeting
        if (isset($targeting['users']) && in_array($user->id, $targeting['users'], true)) {
            return true;
        }

        return false;
    }

    /**
     * Invalidate cache immediately after admin changes a flag.
     * Called from admin controllers after any create/update/delete.
     */
    public function invalidate(): void
    {
        try {
            Cache::forget(self::CACHE_KEY);
        } catch (Throwable $e) {
            // Best-effort: a failed invalidation is bounded by the TTL.
            report($e);
        }
    }

    /**
     * Force a warm rebuild (useful after seeding or deployment).
     */
    public function warm(): void
    {
        $this->invalidate();
        $this->rebuild();
    }

    // ── Private ──────────────────────────────────────────────────────

    /**
     * Rebuild the cache with stampede protection.
     *
     * Only one process writes the cache; others still return the real
     * DB collection (never an empty guess).
     *
     * @return Collection<string, FeatureFlag>
     */
    private function rebuild(): Collection
    {
        $flags = $this->loadFlagsFromDatabase();

        try {
            $lock = Cache::lock(self::LOCK_KEY, self::LOCK_TTL);

            if ($lock->get()) {
                try {
                    Cache::put(self::CACHE_KEY, $flags->toJson(), self::CACHE_TTL);
                } finally {
                    $lock->release();
                }
            }
        } catch (Throwable $e) {
            report($e);
        }

        return $flags;
    }

    /**
     * @return Collection<string, FeatureFlag>
     */
    private function loadFlagsFromDatabase(): Collection
    {
        return FeatureFlag::select([
            'id', 'key', 'is_enabled', 'environment', 'enabled_for', 'product_id',
        ])->get()->keyBy('key');
    }

    /**
     * @param  array<int, array<string, mixed>>  $data
     * @return Collection<string, FeatureFlag>
     */
    private function mapFlags(array $data): Collection
    {
        return collect($data)->map(
            fn ($item) => (object) $item
        )->keyBy('key');
    }

    private function isActiveForEnvironment(object $flag): bool
    {
        return $flag->environment === 'all'
            || $flag->environment === app()->environment();
    }
}