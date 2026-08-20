# Project Structure

**Verification:** ✅ = verified from the filesystem. (Counts accurate as of 2026-08-07.)

---

## Root

```
YS_System.software/
├── .env.example            # Root env template for docker-compose
├── docker-compose.yml      # Full stack: frontend/backend/db/redis/nginx/worker/scheduler/mailhog/grafana
├── docker/
│   └── nginx/
│       ├── nginx.conf      # Main nginx config (gzip, client_max_body_size 100M)
│       └── sites/default.conf  # Proxy rules: / → frontend, /api/ → backend, /storage/ → backend
├── .github/workflows/
│   ├── ci.yml              # Lint, type-check, tests, build, Trivy scan
│   └── release.yml         # Docker build/push (GHCR) + SSH deploy + rollback notice
├── ys-api/                 # Laravel backend (own git repo)
├── ys-web/                 # Next.js frontend (own git repo)
└── docs/                   # This documentation
```

---

## ys-api (Laravel 12)

```
ys-api/
├── app/
│   ├── Domains/
│   │   ├── Auth/
│   │   │   ├── Actions/LoginAction.php
│   │   │   ├── DTOs/LoginDTO.php
│   │   │   ├── Enums/Permission.php          # Closed list of all permission strings
│   │   │   ├── Models/{Role,User}.php
│   │   │   └── Repositories/PermissionRepository.php
│   │   ├── Billing/
│   │   │   ├── Actions/CreateSubscriptionAction.php
│   │   │   └── Models/{Customer,Subscription}.php
│   │   ├── Cms/
│   │   │   ├── Actions/  (Create/Update × Faq, HomepageSection, Menu, MenuItem, StaticPage)
│   │   │   └── Models/   {Faq,HomepageSection,Menu,MenuItem,StaticPage}.php
│   │   ├── Content/
│   │   │   ├── Actions/  (Create/Update × Career, DocumentationArticle, DocumentationCategory,
│   │   │   │              RoadmapItem, TimelineEntry; + Create/Publish/Unpublish Update)
│   │   │   └── Models/   {Career,DocumentationArticle,DocumentationCategory,RoadmapItem,TimelineEntry,Update}.php
│   │   ├── Operations/
│   │   │   ├── Actions/SubmitContactRequestAction.php   # spam scoring
│   │   │   └── Models/ContactRequest.php
│   │   ├── Product/
│   │   │   ├── Actions/  {Create,Delete,Update}ProductAction.php
│   │   │   ├── DTOs/     {Create,Update}ProductDTO.php
│   │   │   ├── Enums/ProductIcon.php
│   │   │   ├── Models/   {Product,ProductRelease}.php
│   │   │   ├── Observers/{Product,ProductRelease}Observer.php   # audit + version sync
│   │   │   └── Policies/ProductPolicy.php
│   │   ├── Search/
│   │   │   ├── Contracts/SearchDriver.php
│   │   │   ├── Drivers/PostgresSearchDriver.php
│   │   │   ├── DTOs/{SearchResult,SearchResultCollection}.php
│   │   │   └── {Contracts,Drivers,DTOs}/      # ⚠️ stray empty brace-name dir (0 files)
│   │   └── System/
│   │       ├── Models/   {AuditLog,FeatureFlag,Media,Setting}.php
│   │       └── Services/ {AuditService,FeatureFlagService,HtmlSanitizerService,MediaUploadService}.php
│   ├── Exceptions/Auth/{AccountDisabledException,InvalidCredentialsException}.php
│   ├── Http/
│   │   ├── Controllers/
│   │   │   ├── Controller.php
│   │   │   ├── Auth/AuthController.php
│   │   │   ├── Admin/    (21 controllers: AuditLog, Career, ContactRequest, Customer, Documentation,
│   │   │   │              Faq, FeatureFlag, HomepageSection, Media, Menu, Product, Release, Roadmap,
│   │   │   │              Role, Setting, StaticPage, Subscription, Timeline, Update, User)
│   │   │   └── Public/   (13 controllers: Career, Contact, Documentation, Faq, HomepageSection, Menu,
│   │   │                  Product, Roadmap, Search, Setting, StaticPage, Timeline, Update)
│   │   ├── Middleware/   {CookieToBearer, EnsureUserIsActive, ForceJsonResponse, SecurityHeaders}.php
│   │   ├── Requests/     (Login, Role×2, Billing×4, Product×2 — FormRequests)
│   │   └── Resources/    (Admin×9, Auth×1, Public×7)
│   ├── Jobs/{SendAdminUserCreatedJob, SendContactRequestNotificationJob}.php
│   └── Providers/{AppServiceProvider, AuthServiceProvider}.php
├── bootstrap/app.php      # Middleware, exceptions JSON shape, providers, apiPrefix api/v1
├── config/                # cors, mail, purifier, sanctum, security (+ Laravel defaults)
├── database/
│   ├── factories/         # 11 factories
│   ├── migrations/        # 22 migrations (2025_01_01_000001 … 2026_07_31_000004)
│   └── seeders/           # DatabaseSeeder, RoleSeeder, AdminUserSeeder, SettingsSeeder, CmsSeeder
│                          # (SettingsSeeder_ADDITIONS.php removed in Sprint 1.1 — dead fragment)
├── routes/api.php         # ONLY route file (no web.php / console.php)
├── storage/app/media      # uploads; storage/app/purifier (Purifier cache)
├── tests/                 # TestCase + 5 test files (42 methods)
├── public/                # index.php, .htaccess, robots.txt
├── composer.json          # PHP ^8.4, Laravel ^12, Sanctum ^4, mews/purifier, predis
├── Dockerfile / Dockerfile.dev
├── README.md  ⚠️ partially outdated   SETUP.md  ⚠️ partially outdated
└── ⚠️ stray 0-byte files at root: 'replied', 'cls', 'id',
    "assertDatabaseHas('contact_requests'", "assertStatus(200)"
```

---

## ys-web (Next.js 16)

```
ys-web/
├── app/
│   ├── layout.tsx             # Root HTML shell: fonts, RTL/LTR script, error/not-found/robots/sitemap
│   ├── [locale]/
│   │   ├── layout.tsx         # Locale validation + ThemeProvider + LocaleSync
│   │   └── (public)/          # Public site shell (Header/Footer, JSON-LD)
│   │       ├── page.tsx       # Homepage (Hero/WhyChoose/Products/CTA)
│   │       ├── about/ products/(+[slug])/ contact/ docs/(+[slug])/
│   │       ├── roadmap/ updates/ releases/ changelog/ careers/ faq/ security/ status/
│   │       ├── privacy/ terms/ cookie-policy/
│   │       └── error.tsx loading.tsx
│   └── admin/                 # Admin panel (client components)
│       ├── layout.tsx         # Sidebar, breadcrumb, QueryClient/Platform/Auth/Toast providers, Cmd+K
│       ├── login/ dashboard/
│       ├── products/ docs/ static-pages/ faq/ menus/ homepage/ releases/ roadmap/
│       ├── updates/ careers/ timeline/ media/ users/ roles/ settings/ feature-flags/
│       ├── audit-logs/ sessions/ login-history/ api-tokens/      # ⚠️ last 3 have no backend API
│       ├── customers/ subscriptions/ notifications/              # ⚠️ notifications has no backend API
│       └── error.tsx loading.tsx
├── components/
│   ├── admin/    (26: DataTable, ProductForm, PermissionGate/AuthProvider, CommandPalette, …)
│   ├── layout/   Header.tsx, Footer.tsx
│   ├── sections/ HeroSection, ProductsSection, WhyChooseSection, CTASection
│   ├── shared/   AnimatedBox, CookieConsent, LocaleSync, SearchModal, ThemeProvider
│   └── ui/       Badge, Button, EmptyState
├── lib/
│   ├── api/client.ts          # public API client (typed fetch, 60s revalidate)
│   ├── admin/api.ts           # admin fetch wrapper (credentials: include)
│   ├── admin/navigation.ts    # static admin nav (duplicate of modules/core/navigation.ts)
│   ├── hooks/useAdminResource.ts   # TanStack Query hooks
│   ├── i18n.ts                # locales + t() helper
│   ├── cms/{schemas,validate}.ts  # zod CMS validation
│   ├── seo.ts                 # metadata builders + seoRegistry
│   ├── search-verification.ts # Google/Bing/Yandex meta + IndexNow submit
│   ├── stores/theme.ts        # zustand theme store
│   ├── utils/{cn,sanitizeHtml,productIcons}.ts
│   └── platform/              # ⚠️ self-contained "platform framework" — 191 TS files, 53 subdirs
│       ├── kernel/ModuleKernel.ts  bootstrap.ts PlatformProvider.tsx index.ts
│       ├── registries/ services/ bus/ engine/ drivers/ adapters/ contracts/
│       ├── health-endpoints/ secrets/ release/ recovery/ installer/ backup/ deployments/
│       ├── monitoring/ performance/ reports/ audit/ observability/ logs/ reviews/
│       ├── cache/ storage/ mail/ search/ queue/ worker/ scheduler/
│       ├── cli/ generator/ sdk/ updates/ maintenance/ media/ snapshot/ manifest/
│       ├── inspector/ lifecycle/ compatibility/ validator/ graph/ config/ environment/
│       ├── errors/ types/ testing/ hooks/ security/
├── modules/
│   ├── index.ts               # registeredModules = [coreModule]
│   └── core/
│       ├── module.config.ts   # manifest (id: core, v1.0.0)
│       ├── index.ts           # register()/boot()/shutdown()
│       ├── navigation.ts      # 7 nav groups (⚠️ duplicates lib/admin/navigation.ts)
│       ├── permissions.ts     # permission groups (verified vs backend Permission.php)
│       └── widgets.ts         # 8 dashboard widgets (⚠️ 2 have wrong API paths; see known-issues)
├── i18n/messages/{en,ar}.json # ⚠️ dead files — imported nowhere
├── public/branding/           # hero images, logos, product images, favicon…
├── styles/globals.css         # design tokens (CSS vars), glass classes
├── tests/platform/            # 6 Vitest tests for lib/platform
├── types/                     # index.ts (all shared interfaces), i18n.ts (Locale)
├── middleware.ts              # admin cookie guard + locale redirect
├── next.config.ts             # CSP headers, image remote patterns, compress
├── vitest.config.ts           # ⚠️ vitest config exists but vitest is NOT in package.json
├── tailwind.config.ts  postcss.config.js  tsconfig.json
├── package.json  package-lock.json
├── Dockerfile / Dockerfile.dev
├── .env.example / .env.local.example / .env.local (localhost only, no secrets)
└── SETUP.md  ⚠️ partially outdated (claims next-intl)
```
