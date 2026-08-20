# Dependencies

**Verification:** ✅ from `composer.json`/`package.json` (2026-08-07)

---

## Backend (`ys-api/composer.json`)

### Production

| Package | Version | Purpose |
|---|---|---|
| php | ^8.4 | runtime |
| laravel/framework | ^12.0 | core |
| laravel/sanctum | ^4.0 | API tokens |
| laravel/tinker | ^2.10 | dev console |
| mews/purifier | ^3.4 | HTML sanitization |
| predis/predis | ^2.3 | optional Redis client (dormant — the shipped stack is DB/file-backed, Phase 4A P1-01) |

### Dev

| Package | Version | Purpose |
|---|---|---|
| fakerphp/faker | ^1.23 | factories |
| laravel/pint | ^1.13 | code style |
| laravel/sail | ^1.26 | docker dev |
| mockery/mockery | ^1.6 | unit mocking |
| nunomaduro/collision | ^8.1 | CLI error renderer |
| phpunit/phpunit | ^11.0 | tests |

**Not installed (despite docs/SETUP.md mentions):** laravel/horizon, phpstan, pest, laravel/debugbar, telescope. ✅ verified absence.

## Frontend (`ys-web/package.json`)

### Production

| Package | Version | Purpose |
|---|---|---|
| next | ^16.2.9 | framework |
| react / react-dom | ^19.0.0 | UI |
| @tanstack/react-query | ^5.101.4 | admin data fetching |
| zustand | ^5.0.0 | theme state |
| framer-motion | ^11.13.0 | animations |
| lucide-react | ^0.511.0 | icons |
| zod | ^4.4.3 | validation |
| isomorphic-dompurify | ^3.19.0 | client HTML sanitization |
| clsx | ^2.1.1 | classnames |
| tailwind-merge | ^2.4.0 | class merging |
| sharp | ^0.33.5 | image optimization |

### Dev

| Package | Version |
|---|---|
| typescript | ^5.5.4 |
| @types/node | ^20.14.12 |
| @types/react / react-dom | ^19.0.0 |
| eslint / eslint-config-next | ^9.0.0 / ^16.2.9 |
| tailwindcss | ^3.4.6 |
| postcss / autoprefixer | ^8.4.40 / ^10.4.19 |

### ⚠️ Discrepancies (verified)

| Issue | Detail |
|---|---|
| vitest missing | `vitest.config.ts` + `tests/platform/*` exist but **vitest is not in package.json** — tests run via global/transitive vitest only; `npm test` fails (no test script) |
| no test script | `npm test` does not exist → CI frontend-tests always falls back to placeholder |
| no next-intl | i18n is custom (see frontend.md) |
| no axios | native fetch used throughout |

## Infra

| Component | Version | Source |
|---|---|---|
| PostgreSQL | 16-alpine | docker-compose |
| OPcache | bundled (php:8.4-fpm-alpine) | docker-compose backend image (Phase 4A P2-07) |
| Nginx | alpine (latest) | docker-compose |
| Grafana | latest | docker-compose (production profile) |
| Mailhog | latest | dev/staging profiles |
| Node (CI) | 20 | ci.yml |
| PHP (CI) | 8.4 | ci.yml |
