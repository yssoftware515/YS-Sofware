# Async & Job Patterns - Developer Reference

**Source of truth:** the two existing jobs + AuditService + weak spots found during verification. **Date:** 2026-08-07

> + = verified from source | = inferred/recommended | ? = unknown

This is the **canonical pattern** used by existing code for queued mail and is the one new async features should copy.

## The 3-async-guard pattern (copy this)

```php
// 1. Dispatch after commit
dispatch(new MyJob($id))->afterCommit();

// 2. Idempotent per-entity
class MyJob implements ShouldQueue, ShouldBeUnique {
    public int $tries = 3;
    public int $backoff = 30; // or 60
    public function uniqueId(): string { return "my-job-{$this->entityId}"; }

    // 3. Guard on read
    public function handle(): void {
        $m = Model::find($this->entityId);
        if ($m === null) { $this->release(5); return; }
        // ... work
    }
    public function failed(Throwable $e): void {
        Log::error('...', ['id' => $this->entityId, 'error' => $e->getMessage()]);
    }
}
```

Why each: `afterCommit()` prevents "worker reads before row exists"; `ShouldBeUnique` prevents duplicate emails on retry; guard `release()` converts a transient race into a requeue instead of a hard failure. All three documented in the existing job comments. +

## Async + AuditService (read before writing)

`Auth::id()` is **null inside workers**. `AuditService::log(..., userId: ...)` requires the id passed explicitly; its default falls back to `Auth::id()` which is empty in queue context. When inside a job, resolve the user inside `handle()` (e.g., `$user->id`) and pass it. See [audit-service.md](audit-service.md) for the warning on `resolveIp()` too.

## Queue config

- The database driver is the production queue (`QUEUE_CONNECTION=database`, `jobs`/`failed_jobs` tables); `docker-compose` runs the worker service (`queue:work --sleep=3 --tries=3 --max-time=3600`). No Redis is deployed (Phase 4A, P1-01).
- The queue survives restarts with the Postgres volume; workers must be running separately (docker-compose runs one).

## Testing async

- No queue driver test in the 42 backend tests? (verified test files exist but none fake queue) - flag to add a test with `Queue::fake()`.
- `ShouldBeUnique` needs a shared cache driver to dedupe; the file cache in CI/containers makes uniqueness per-instance only. ✅

## Where to put new async flows

- Domain action (create/validate) -> `dispatch(new App\Jobs\XJob(...))->afterCommit()`.
- New jobs in `app/Jobs/` (flat). Mail templates in `resources/views/emails/`.
- Add audit inside jobs **with explicit userId** (do NOT rely on Auth::id()).