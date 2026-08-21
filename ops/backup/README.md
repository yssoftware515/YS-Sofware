# Backup Automation

The `backup` service in `docker-compose.yml` runs `ops/backup/backup.sh` as a
one-shot container. It is NOT scheduled automatically — you must configure an
external cron job or CI schedule to trigger it.

## Scheduling with host cron (recommended)

Add a crontab entry on the Docker host:

```bash
# Daily at 02:00 UTC — keep 7 most recent dumps (BACKUP_RETENTION=7)
0 2 * * * cd /path/to/YS-Sofware && docker compose --profile production run --rm backup >> /var/log/ys-backup.log 2>&1
```

Adjust `BACKUP_RETENTION` in your `.env` to control how many dumps are kept.

## Scheduling with GitHub Actions (alternative)

```yaml
# .github/workflows/backup.yml
name: Nightly Backup
on:
  schedule:
    - cron: '0 2 * * *'
  workflow_dispatch:

jobs:
  backup:
    runs-on: self-hosted  # must run where Docker volumes are accessible
    steps:
      - run: docker compose --profile production run --rm backup
```

## Verify

```bash
# Manual test run
docker compose --profile production run --rm backup

# Check dump exists
ls -la backups/
```
