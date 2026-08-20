#!/bin/sh
set -e

# VULN-08: the application must NEVER connect as the PostgreSQL
# superuser (POSTGRES_USER) — superusers bypass RLS and table
# privileges, which would defeat the audit_logs immutability
# guarantees. This script provisions a least-privilege role
# (POSTGRES_APP_USERNAME, default ys_app) used by every application
# service (backend, queue-worker, scheduler, backup).
#
# Runs once on the first boot of a fresh data volume via the
# docker-entrypoint-initdb.d hook (as the cluster superuser).
#
# Schema-level ALL is required because `php artisan migrate` runs as
# this role (it creates tables/sequences). The audit_logs table itself
# stays INSERT+SELECT only: migration 2025_01_01_000012 revokes
# UPDATE/DELETE/TRUNCATE/REFERENCES/TRIGGER for the app role and
# FORCE-enables RLS, which non-superusers cannot bypass.
#
# NOTE: DB_PASSWORD must not contain a single quote (the password is
# embedded in a quoted SQL literal here).
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    DO \$\$
    BEGIN
        IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '${POSTGRES_APP_USERNAME}') THEN
            CREATE ROLE "${POSTGRES_APP_USERNAME}" LOGIN PASSWORD '${POSTGRES_APP_PASSWORD}' NOSUPERUSER NOCREATEDB NOCREATEROLE;
        END IF;
    END
    \$\$;
    GRANT CONNECT ON DATABASE "${POSTGRES_DB}" TO "${POSTGRES_APP_USERNAME}";
    GRANT ALL ON SCHEMA public TO "${POSTGRES_APP_USERNAME}";
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO "${POSTGRES_APP_USERNAME}";
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO "${POSTGRES_APP_USERNAME}";
EOSQL