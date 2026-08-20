# Release Lifecycle & current_version Sync - Deep Dive

**Source of truth:** `app/Domains/Product/Observers/ProductReleaseObserver.php`, Product model + migrations. **Date:** 2026-08-07

> + = verified from source | = inferred | ? = unknown

## Purpose

Auto-maintains each product's `current_version` column so the public API never serves a stale version while releases are created/published/deleted.

## Rules implemented

1. **On release create:** if the release is immediately `is_published=true`, compute `MAX(version) over published releases of that product, ordered by release_date DESC` and write it to the product. If the new release is *unpublished* at creation, `syncCurrentVersion()` early-returns (no change). +
2. **On release update:** only sync when `wasChanged('is_published') && is_published` (i.e., the flip from false->true). Edits to other fields do not re-sync. +
3. **On release delete:** regardless of publish state, recompute from *remaining* published releases (`recalculateCurrentVersion($productId)`), using `orderByDesc('release_date')` to pick the latest; updates product directly via `Product::where('id', $productId)->update([...])`. This avoids resetting `updated_at` from a knock-on observer. +

```php
private function syncCurrentVersion(ProductRelease $release): void {
    if (! $release->is_published) return;
    $latest = ProductRelease::where('product_id', $release->product_id)
        ->where('is_published', true)
        ->orderByDesc('release_date')
        ->value('version');
    if ($latest) $release->product()->update(['current_version' => $latest]);
}
```

## Edge cases

- **Tie on release_date**: the query sorts only by `release_date`; equal dates yield an arbitrary pick. Consider adding `->orderByDesc('created_at')` as a tie-breaker. =
- **Deleting the last published release**: `recalculateCurrentVersion` sets `current_version` to `null` (max over empty set). `current_version` column is nullable? (migration permits null - verify in database.md). =
- **Publishing an older release after a newer one exists**: it becomes the max again (version ordering is string-based compare or semver? product uses a `version` field - the SQL `MAX/orderByDesc` on string sorts lexically, e.g. "9.x" < "10.x". If versions are semver strings, lexical ordering is wrong. => flag for verification.
- The product FK `product_id` is required for releases (DB constraint) - deletion of a product cascades or blocks release? depends on FK action in migration. =

## Audit

Each observer method also emits an audit via `AuditService::logModelChange` (`product_release.created|updated|deleted`). (audit-service.md)

## Registration

Registered in `AuthServiceProvider::registerObservers()`. +