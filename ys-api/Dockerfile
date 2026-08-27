# Stage 1: Dependencies
FROM php:8.4-fpm-alpine AS deps
RUN apk add --no-cache \
    postgresql-dev \
    libzip-dev \
    unzip \
    git \
    && docker-php-ext-install pdo_pgsql pdo_mysql zip

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer
WORKDIR /app
COPY composer.json composer.lock ./
RUN composer install --no-dev --no-scripts --no-autoloader --prefer-dist

# Stage 2: Production
FROM php:8.4-fpm-alpine AS runner
RUN apk add --no-cache \
    postgresql-dev \
    libzip-dev \
    unzip \
    curl \
    nginx \
    && docker-php-ext-install pdo_pgsql pdo_mysql zip opcache \
    && addgroup -g 1001 -S appgroup && adduser -S -u 1001 -G appgroup appuser

WORKDIR /app
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer
COPY --from=deps /app/vendor ./vendor
COPY . .

# Discard any runtime caches that exist in the repo (a git-tracked stale
# route cache would otherwise be baked into the image), regenerate the
# composer package map, and wire the public storage symlink.
RUN composer dump-autoload --no-dev --optimize --no-scripts \
    && rm -f bootstrap/cache/*.php \
    && mkdir -p storage/app/public storage/framework/cache/data storage/framework/sessions storage/framework/views storage/logs bootstrap/cache \
    && ln -sfn /app/storage/app/public public/storage

# php-fpm workers inherit the master process user (appuser) automatically.
# Setting these env vars tells the php-fpm Docker entrypoint the correct
# user/group — avoids the "user directive is ignored" warning that occurs
# when the master process is non-root and www.conf sets user= nobody.
ENV PHP_FPM_USER=appuser
ENV PHP_FPM_GROUP=appgroup

COPY docker/nginx/nginx.conf /etc/nginx/nginx.conf
COPY docker/php/opcache.ini /usr/local/etc/php/conf.d/zz-opcache.ini
COPY docker/php/security.ini /usr/local/etc/php/conf.d/zz-security.ini
COPY docker/php/www.conf /usr/local/etc/php-fpm.d/zz-www.conf
COPY docker/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

# nginx needs writable dirs for temp files (pid, client body, proxy, etc.).
# /var/lib/nginx is NOT used for logs (error_log -> stderr) — only for
# nginx's internal temp/cache dirs. chown before switching to appuser.
RUN mkdir -p /var/lib/nginx/tmp \
    && chown -R appuser:appgroup /app/storage /app/bootstrap/cache /etc/nginx/ /var/lib/nginx/
USER appuser

# Railway/Render: container must bind to $PORT (provided by host).
# Local Docker Compose: defaults to 8000 via entrypoint.sh.
# nginx.conf port is templated at startup by entrypoint.sh.
EXPOSE 8000
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
