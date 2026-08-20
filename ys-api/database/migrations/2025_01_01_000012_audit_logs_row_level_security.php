<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Row-Level Security on audit_logs.
 *
 * This is defense layer #2 — layer #1 is the Eloquent model override.
 * Even if someone bypasses Eloquent (raw Query Builder, Tinker, etc.),
 * PostgreSQL RLS blocks UPDATE and DELETE at the DB engine level.
 *
 * The app DB user gets INSERT + SELECT only on audit_logs.
 * No UPDATE. No DELETE. Ever.
 *
 * ⚠️ OWNERSHIP BOUNDARY (SEC-06): this boundary only holds while the
 * audit_logs table is NOT owned by the app DB user. PostgreSQL RLS
 * (FORCE included) does not apply to the table owner — the owner always
 * bypasses row-level security, regardless of policies. Migrations are
 * executed as the app user in this deployment (docker-compose backend
 * service, release.yml migrate step), so every table CREATEd by those
 * migrations — including audit_logs — is owned by the app user, which
 * silently nullifies this layer's protection. The defensive contract
 * therefore requires the table to be transferred to a separate owner
 * (e.g. the migration superuser) immediately after creation, and the
 * production DB must be verified to satisfy this before release.
 */
return new class extends Migration
{
    public function up(): void
    {
        $appUser = config('database.connections.pgsql.username', 'postgres');

        // Enable RLS on the table
        DB::statement('ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY');

        // Force RLS even for the table owner (superuser bypass is intentional —
        // only the actual PostgreSQL superuser can bypass, not the app user)
        DB::statement('ALTER TABLE audit_logs FORCE ROW LEVEL SECURITY');

        // Policy: INSERT is allowed
        DB::statement("
            CREATE POLICY audit_insert_only ON audit_logs
            FOR INSERT TO \"{$appUser}\"
            WITH CHECK (true)
        ");

        // Policy: SELECT is allowed
        DB::statement("
            CREATE POLICY audit_select_all ON audit_logs
            FOR SELECT TO \"{$appUser}\"
            USING (true)
        ");

        // No UPDATE policy → UPDATE is implicitly denied
        // No DELETE policy → DELETE is implicitly denied

        // Also revoke explicit privileges to be safe. TRUNCATE is NOT
        // subject to RLS — revoking it (and REFERENCES/TRIGGER, which
        // grant table-level write/read capability) closes the bulk-wipe
        // path for a non-superuser app role.
        DB::statement("REVOKE UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON audit_logs FROM \"{$appUser}\"");
    }

    public function down(): void
    {
        $appUser = config('database.connections.pgsql.username', 'postgres');

        DB::statement('DROP POLICY IF EXISTS audit_insert_only ON audit_logs');
        DB::statement('DROP POLICY IF EXISTS audit_select_all ON audit_logs');
        DB::statement('ALTER TABLE audit_logs DISABLE ROW LEVEL SECURITY');
        DB::statement("GRANT UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON audit_logs TO \"{$appUser}\"");
    }
};
