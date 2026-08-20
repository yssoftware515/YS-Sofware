# YS Systems & Software — Frontend Setup Guide

---

## Requirements

| Tool    | Version  |
|---------|----------|
| Node.js | 20+      |
| npm     | 10+      |

---

## Step 1 — Install Dependencies

```bash
cd ys-web
npm install
```

---

## Step 2 — Environment Setup

```bash
cp .env.local.example .env.local
```

Edit `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Make sure the Laravel backend is running on `:8000` first.

---

## Step 3 — Development Server

```bash
npm run dev
```

App available at: `http://localhost:3000`

Routes:
- `/en` — English home page
- `/ar` — Arabic home page (RTL)
- `/admin/login` — Admin login

---

## Step 4 — Build for Production

```bash
npm run build
npm run start
```

---

## Architecture

```
app/
├── [locale]/              ← All public pages (EN + AR)
│   ├── (public)/          ← Route group with Header + Footer layout
│   │   ├── layout.tsx     ← Fetches settings server-side
│   │   ├── page.tsx       ← Home page
│   │   ├── products/      ← Products listing + [slug] detail
│   │   ├── about/
│   │   ├── roadmap/
│   │   ├── updates/
│   │   ├── careers/
│   │   ├── contact/
│   │   └── docs/
│   └── layout.tsx         ← Sets lang + dir attributes, fonts
├── admin/
│   ├── login/             ← Admin login (no auth required)
│   └── dashboard/         ← Protected admin pages
└── layout.tsx             ← Root HTML shell

components/
├── ui/          Button, Badge, StatusBadge
├── layout/      Header (responsive + RTL), Footer
├── sections/    HeroSection, ProductsSection
└── shared/      ThemeProvider (anti-FOUC)

lib/
├── api/         Typed API client (server + client)
├── stores/      Zustand theme store (persisted)
└── utils/       cn() className utility
```

## Key Design Decisions

| Feature        | Implementation                                    |
|----------------|---------------------------------------------------|
| Multi-language | next-intl with `/en/` and `/ar/` prefixed routes |
| RTL            | `dir="rtl"` on `<html>`, CSS logical properties  |
| Dark Mode      | CSS variables + data-theme attribute, no flash    |
| Server Data    | Server Components fetch API directly (RSC)        |
| Performance    | ISR (60s revalidation) for public content         |
| Fonts          | DM Sans + Space Grotesk (display) + DM Mono       |
