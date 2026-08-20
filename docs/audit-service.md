# Audit Trail & Observers - Deep Dive

**Source of truth:** `app/Domains/System/Services/AuditService.php`, `app/Domains/Product/Observers/ProductObserver.php`, `app/Domains/Product/Observers/ProductReleaseObserver.php`, `AuthServiceProvider` observer registration. **Date:** 2026-08-07

> + = verified from source | _ = inferred | ? = unknown

## AuditService

Centralized audit logging in the `System` domain under `Domains/System/Services/AuditService.php`. +

```php
AuditLog::create([
  'user_id'       => $userId ?? Auth::id(),
  'action'        => $action,          // e.g. 'product.updated'
  'resource_type' => $resourceType,    // e.g. 'Product'
  'resource_id'   => $resourceId,
  'old_values'    => $oldValues,
  'new_values'    => $newValues,
  'ip_address'    => $this->resolveIp(),
  'user_agent'    => $this->resolveUserAgent(),
  'context'       => $context ?: null,
]);
```

Key points:

- **Explicit `userId` in async.** `Auth::id()` returns null inside queue workers (no HTTP session). The doc block in the file explicitly instructs: always pass `$userId` when logging from a Job. `userId ?? Auth::id()` gives the correct value in HTTP context and never a wrong one in CLI/queue context. +
- **`resolveIp()` / `resolveUserAgent()`** are wrapped in try/catch - `Request::ip()` throws outside an HTTP request (CLI/queue), so they degrade to null. + confirmed via file read.
- `logModelChange()` convenience: passes `class_basename($model)` as resource_type, `newValues` = `$model->getDirty()` (i.e., only changed columns at time of call). Note: after a subsequent `save()`, dirty list is cleared; so the observer calls it before saving when possible. `oldValues` defaults to null unless provided.

## Product observers

`ProductObserver`, registered in `AuthServiceProvider::registerObservers()` along with `ProductReleaseObserver`. (verified file content)
- `created(Product)` -> `audit logModelChange('product.created')`
- `updated(Product)` -> `audit logModelChange('product.updated', oldValues: $product->getOriginal(...))`
- `deleted(Product)` -> `audit logModelChange('product.deleted')`
- `restored(Product)` -> `audit logModelChange('product.restored')` (promised; most other models are soft-deleted)

`ProductReleaseObserver`:
- `created` -> sync current version + audit
- `updated` -> only when `is_published` flips to true -> sync + audit
- `deleted` -> re-calc current version from remaining published releases + audit
- Details on the sync logic: see [release-lifecycle.md](release-lifecycle.md)

## Registration

`AuthServiceProvider` (registered as `App\Providers\AuthServiceProvider`) `registerObservers()` calls `Product::observe(ProductObserver::class)` and `ProductRelease::observe(ProductReleaseObserver::class)`. +

## Relations

`AuditLog` migration stores these columns incl. `context` (jsonb). Legal `action` strings are enumerated in code call sites but there's no DB-level enum. + (migration columns verified in database.md)

## Gotchas

- Only **Product** and **ProductRelease** have observers today; other writable resources still journal via explicit `auditService->log()` calls in controllers (e.g., MediaController logs `media.uploaded`/`media.deleted`, AuthController logs auth events). +
- `getDirty()`-based `new_values` can miss changes when the model save is preceded by further attribute assignment in the same request; ordering between observer and controller update calls matters. +
- There is no `restored` observer for ProductRelease (soft deletes on products only?). `?` (soft-deletes only on Product model, verified in models)
- Audit log itself is immutable (RLS + no update/delete policy) - see security.md. +