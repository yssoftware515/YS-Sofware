# Sprint 8 Phase C Report — Engagement Delivery Layer (Tasks & Milestones)

**Status:** ✅ **COMPLETE**
**Date:** 2026-08-08
**Scope note:** Phase A (customers) and Phase B (request→project linkage + customer 360) of Sprint 8 shipped earlier; this report covers Phase C only.

**Phase goal:** Give the owner a real "delivery" view of every engagement — the executable work (tasks) and the stage markers (milestones) that live inside a project, with the same integrity, audit, and permission discipline as the project itself. Tasks and milestones are **engagement-delivery records, not a CRM** (no lead/opportunity semantics, no AI, no fabricated figures): every number on screen is a direct database count.

---

## What was delivered

### 1. Schema — tasks & milestones (admin domain, project-bound)

- `tasks` — title (180), optional description, closed status (`todo | in_progress | blocked | completed | cancelled`), closed priority (`low | normal | high | urgent`), optional `due_date`, `completed_at`, `created_by` (nullable FK, `nullOnDelete`).
- `milestones` — title, description, status (`pending | in_progress | completed | cancelled`), optional `target_date`, `completed_at`, `sort_order`, `created_by`.
- Both FK to `projects` with **`cascadeOnDelete`** — a task or milestone cannot outlive its project (orphans are meaningless in this system; tested).
- Indexes: `(project_id, status)` and `due_date` on tasks; `(project_id, sort_order)` on milestones.
- Models: `App\Domains\Operations\Models\Task` / `Milestone` with `isOpen()` / `isOverdue()` helpers and DB-mirrored defaults (`status`, `priority`) so created models are consistent in memory and in the database.

### 2. Lifecycle — one rule, one place

- `LifecycleService::reconcileCompletion(&$attributes, $currentStatus, $completedStatus, $completedAtColumn)` is the **single source of truth**: entering the completed state stamps `completed_at`, leaving it clears it — regardless of entry point (project create/update/status-change, task create/update/status-change, milestone create/update/status-change). No hand-written timestamp logic anywhere else.

### 3. API — admin-only, audited, same permission boundary as projects

- `GET/POST /admin/tasks`, `PATCH /admin/tasks/{task}/status`, `GET/PUT/DELETE /admin/tasks/{task}` (index filters: `project_id`, `status`, `priority`, `search` on title/description; paginated).
- Mirror for milestones plus `POST /admin/milestones/{milestone}/move` (`direction: up|down`) — a deterministic re-stamp of sequential `sort_order` ranks within the project, audited as `milestone.moved`.
- **Authorization: `view_projects` to read, `manage_projects` to mutate — deliberately no new permission surface** (verified against `AuthServiceProvider`, where `manage_projects` already implies `view_projects`). A `manage_products`-only admin gets 403; unauthenticated gets 401; tasks/milestones never appear on public endpoints (tested).
- **Audit on every mutation**: `task.created / updated / status_updated / deleted`, `milestone.created / updated / status_updated / deleted / moved`.
- **No `assigned_to`** — documented decision: the user list endpoint requires `manage_users`, so assignment cannot be offered role-safely today; `created_by` is carried instead.

### 4. Delivery summary — honest numbers per project

- `DeliverySummaryService::forProject()` returns direct counts: `total/completed/remaining/blocked/overdue_tasks`, `total/completed/overdue_milestones`, plus the next open milestone (earliest future/any target) and next due open task. A project with zero tasks genuinely shows `0` — never a fabricated fallback.
- `GET /admin/projects/{id}` now includes a `delivery` block (the only list response unchanged — dashboard and project list stay light).

### 5. Dashboard — delivery signals (project-gate only)

- `GET /admin/dashboard/stats` adds `counts.overdue_tasks` / `counts.blocked_tasks`, `attention.tasks_overdue` (open tasks past due, most-recently-overdue first, ≤15) and `attention.upcoming_milestone` (single closest future milestone across all engagements) — all only under the same project-access gate as the other project numbers; a user without project access sees none of them (tested).

### 6. Admin UI

- New `ProjectDelivery` component on `projects/[id]`: delivery metric strip (tasks, remaining, blocked, overdue, milestones done, overdue milestones, next milestone, next due task), a task list with priority/due-overdue badges and quick status change (manager only), a milestone list with rank badges, status change and up/down reorder (manager only), and inline add-task/add-milestone forms. Read-only for `view_projects`-only users; everything behind `manage_projects` for mutation.
- Dashboard: "Overdue tasks"/"Blocked tasks" stat cards (only when the project gate allowed the numbers), an "Overdue tasks" block inside **Needs Attention** (links to the project, `Nd late` badges), and a **Delivery Horizon** widget showing the single next milestone (links into the project).

---

## Verification

| Check | Result |
|---|---|
| Backend test suite (PHPUnit) | ✅ **174 tests / 613 assertions — all green** (Sprint 7 baseline 138/474; +36 tests / +139 assertions across Phase B + C) |
| Phase C test files | ✅ `TaskTest`, `MilestoneTest`, `ProjectDeliverySummaryTest` (summary real zeros, no cross-project leak, cascade delete, no public exposure), extended `DashboardTest` (blocked/overdue tasks, closest-future-only milestone, hidden without project access), extended `ProjectTest` |
| Pint (code style) | ✅ passed (migrations, models, services, controllers, factories, tests) |
| `tsc --noEmit` (ys-web) | ✅ clean |
| `next build` (ys-web) | ✅ compiled + routes generated (public-page prerender fetch warnings are the API not running locally — normal) |
| `eslint` | ⚠️ baseline only — the pre-existing errors live in files untouched by this phase (Header, SearchModal, ColorPicker, CookieConsent, GlobalSearch, ProductsSection, PermissionGate, PlatformProvider, useModule, etc.); every file this phase produced or modified is lint-clean |

## Notes for the next sprint

- `assigned_to` stays out until the user list can be exposed to `manage_projects`-holders (today it requires `manage_users`) — documented in the controller docblock.
- Milestone ordering is a simple up/down swap with sequential re-stamping — enough for small stage lists; a drag-and-drop scheduler is intentionally out of scope.
- Overdue arithmetic is calendar-day on date columns (same convention as project overdue) — an operational flag, not a business-hours model.
- Attention lists stay bounded (≤15) by design.
- The eslint baseline is a one-file-per-line chore worth a dedicated cleanup sprint.
