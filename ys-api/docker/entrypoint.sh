#!/bin/sh
set -e

# Worker/scheduler/one-off containers (queue-worker, scheduler, release.yml
# "docker compose run backend php artisan ...") pass a command -> exec it.
if [ "$#" -gt 0 ]; then
  exec "$@"
fi

# Default backend container: HTTP layer (nginx :8000) in front of php-fpm.
# php-fpm daemonizes, nginx stays in the foreground as PID 1.
php-fpm -D
exec nginx -g 'daemon off;'
