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
COPY --from=deps /app/vendor ./vendor
COPY . .

# Discard any runtime caches that exist in the repo (a git-tracked stale
# route cache would otherwise be baked into the image), regenerate the
# composer package map, and wire the public storage symlink.
RUN composer dump-autoload --no-dev --optimize \
    && rm -f bootstrap/cache/*.php \
    && mkdir -p storage/app/public storage/framework/cache/data storage/framework/sessions storage/framework/views storage/logs bootstrap/cache \
    && ln -sfn /app/storage/app/public public/storage

# php-fpm workers must run as appuser so /app/storage (uploads, logs,
# sessions) stays writable by the application.
RUN sed -i 's/^user = .*/user = appuser/; s/^group = .*/group = appgroup/' /usr/local/etc/php-fpm.d/www.conf

COPY docker/nginx/nginx.conf /etc/nginx/nginx.conf
COPY docker/php/opcache.ini /usr/local/etc/php/conf.d/zz-opcache.ini
COPY docker/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

RUN chown -R appuser:appgroup /app/storage /app/bootstrap/cache
USER appuser

EXPOSE 8000
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
