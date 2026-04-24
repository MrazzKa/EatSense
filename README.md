# EatSense

AI-assisted nutrition tracker with an Experts Marketplace. Swiss-made, currently live on the App Store: [apps.apple.com/app/eatsense](https://apps.apple.com/us/app/eatsense/id6755033261).

**Current release:** Mobile `v2.0.24` (iOS build 42 / Android versionCode 79) · API on Railway · Expert portal on Vercel (→ Railway planned) · Landing on Cloudflare Pages.

---

## What lives where

This is a **pnpm workspaces monorepo**. Four separate deployables plus a bunch of shared TypeScript:

| Path | What it is | Deploy target |
|---|---|---|
| `src/`, `app/`, `App.tsx`, `app.config.js` | Expo / React Native mobile app (iOS + Android) | EAS Build → App Store / Play Store |
| `apps/api/` | NestJS 11 API. Prisma on PostgreSQL, BullMQ on Redis, S3/MinIO for media, Expo Push, magic-link auth, rate limiting | Railway (Dockerfile) |
| `apps/expert-portal/` | Next.js 15 dashboard for certified nutritionists — magic-link auth, chat with clients, offers, reviews, profile editor | Vercel (`expert-portal-pi.vercel.app`), custom domain `experts.eatsense.ch` |
| `apps/admin/` | Single-file `index.html` admin panel for operators — approve experts, moderate suggestions, diet programs, pharmacy cities, community | Static hosting (Railway / any CDN) |
| `legal-site/` | Marketing landing + legal pages (Privacy / Terms / Support). Static HTML + CSS, 6-language switcher | Cloudflare Pages, served at `eatsense.ch` / `www.eatsense.ch` |
| `docs/plans/` | Private planning docs (`.gitignored`) — design decisions, audits, migration roadmaps |  |

Always run `pnpm` commands from the repo root unless a guide says otherwise.

---

## Prerequisites

| Tool | Version | Notes |
|---|---|---|
| Node.js | 20.19+ | Expo SDK 55 + Nest 11 require Node 20 |
| pnpm | 9.x | Workspaces are pnpm-native |
| PostgreSQL | 15+ | Prisma client is generated from the schema |
| Redis | 7+ | Used by BullMQ queue + rate limits + refresh-token blacklist |
| MinIO / S3 | any | Image storage for analyses, chat photos, expert credentials |
| Expo CLI / EAS CLI | latest | `npx eas-cli@latest` is fine |

---

## Quick Start — local dev

```bash
# 1. Install everything
pnpm install

# 2. Bootstrap backend env
cd apps/api && pnpm run setup:env && cd -

# 3. Root .env (mobile)
cp .env.example .env
# Edit:
#   EXPO_PUBLIC_API_BASE_URL=http://localhost:3000      # simulator / same machine
#   EXPO_PUBLIC_API_BASE_URL=http://192.168.X.X:3000    # physical device on LAN
#   EXPO_PUBLIC_ENV=development

# 4. Stand up Postgres + Redis + MinIO
docker compose -f docker-compose.prod.yml up -d postgres redis minio

# 5. Apply migrations, start the API
cd apps/api
pnpm run prisma:migrate:deploy
pnpm run start:dev

# 6. In a second terminal — start the mobile app
pnpm run start:lan       # LAN mode (physical device)
# or
pnpm run start           # tunnel mode
```

### Expert portal (optional, locally)

```bash
cd apps/expert-portal
pnpm install
cp .env.example .env.local   # set NEXT_PUBLIC_API_URL=http://localhost:3000
pnpm dev                     # http://localhost:3001
```

### Admin panel (optional, locally)

`apps/admin/index.html` is self-contained. Open it in a browser; it prompts for API URL + admin secret and stores them in `sessionStorage`.

### Landing (optional, locally)

```bash
cd legal-site
pnpm run dev    # serves legal-site/public on :3000
```

---

## Features

### Mobile app (`src/`)
- AI-powered photo analysis (OpenAI Vision) + USDA FoodData Central lookups
- 47 curated lifestyle programs ("diets") with daily tracker
- Biomarker tracking (lab results → nutrition correlation)
- Medication schedule with actionable push notifications (Take / Later)
- Community (posts, groups, reactions, moderation)
- **Experts Marketplace** — find a nutritionist, chat, share meals / nutrition reports, leave reviews
- 6 languages, 175+ countries of pricing
- Apple Sign-In, Google Sign-In, magic-link email auth
- Apple Introductory Offer for free trials

### Experts Marketplace (end-to-end)
- **Client side:** `/experts` browsing with filters, expert profile page, chat, data-sharing flow (grant/revoke access to meal logs + nutrition reports)
- **Expert side:** 6-step onboarding in the mobile app with structured education entries + document uploads (PDF / JPG / PNG), specializations, languages, bio, credentials. Admin review + approve/reject with localized push.
- **Expert portal** (Next.js): dashboard, chats, offers (per-language tabs), reviews, profile editor
- **Admin panel:** approve / unpublish / re-publish / reject experts, per-document download, full profile PDF export for legal archival
- Push notifications for new messages open directly into the chat (foreground, background, cold-start)

### API (`apps/api/`)
- NestJS 11, Prisma, BullMQ, Zod, class-validator
- Rate limiting via Redis (daily analyses, OTP cooldown)
- Expo Push SDK with multi-language templates
- Magic-link authentication (JWT access + refresh, rotation, blacklist)
- S3/MinIO for media with signed / guarded downloads
- Localized push notifications in 6 languages

---

## Authentication

### Sign-in methods
- **Apple Sign-In** (iOS only)
- **Google Sign-In** (all platforms)
- **Magic link / OTP email** (fallback)
- **Expert portal** uses magic link only — no password

### Token management
- Access token: 45 min (configurable via `JWT_ACCESS_TOKEN_EXPIRATION_TIME`)
- Refresh token: 30 days, stored in Keychain / Keystore (`expo-secure-store`)
- Refresh rotation on every refresh; revoked tokens blacklisted in Redis (`auth:refresh:blacklist:*`)

### Account deletion
- `DELETE /users/me` — cascade delete across all user data, refresh tokens revoked, Redis entries purged. Required for App Store compliance.

---

## Localization (i18n)

**Active languages (6):** `en`, `ru`, `kk`, `fr`, `de`, `es`

Locale files live in `app/i18n/locales/{lang}.json`. Expert portal uses `apps/expert-portal/lib/i18n/messages.ts`. Landing has its own inline translations (61 keys × 6 langs).

The files `ja.json`, `ko.json`, `zh.json` exist in the locales folder as legacy from an earlier scope — **not wired into the app** and not maintained. Safe to ignore.

Scripts:

```bash
pnpm i18n:extract          # scan code for new t() keys
pnpm i18n:verify           # verify all locales have every used key
pnpm i18n:check            # fast coverage report
pnpm i18n:check-all        # full scan
```

---

## Rate limits

| Limit | Free | Pro |
|---|---|---|
| Photo analyses / day | 3 | 25 |

- Configurable: `FREE_DAILY_ANALYSES`, `PRO_DAILY_ANALYSES`
- Override for local testing: `DISABLE_LIMITS=true`
- Reset: midnight UTC
- Counter key in Redis: `daily:food:{userId}:{yyyy-mm-dd}`

**OTP:**
- 60 s cooldown between OTP requests per email
- 5 / hour per email, 40 / hour per IP

---

## Environment variables

### Backend (`apps/api/.env` or Railway Variables)

| Key | Required | Notes |
|---|---|---|
| `NODE_ENV` | ✓ | `production` on Railway |
| `PORT` | ✓ | Railway injects; local default `3000` |
| `DATABASE_URL` | ✓ | PostgreSQL connection string |
| `REDIS_URL` | ✓ | Railway Redis variable reference |
| `API_BASE_URL` | ✓ | Public API (e.g. `https://api.eatsense.ch`) |
| `APP_BASE_URL` | ✓ | Expo web deep-link host |
| `CORS_ORIGINS` | ✓ | Comma-separated: `https://eatsense.ch,https://www.eatsense.ch,https://experts.eatsense.ch` |
| `JWT_SECRET`, `JWT_REFRESH_SECRET` | ✓ | Auth token secrets |
| `JWT_ACCESS_TOKEN_EXPIRATION_TIME` | — | Default `45m` |
| `ADMIN_SECRET` | ✓ | Required by admin panel to call `/admin/*` endpoints |
| `OPENAI_API_KEY` | ✓ | Vision + assistant |
| `FDC_API_KEY` | ✓ | USDA FoodData Central lookups |
| `MAIL_PROVIDER` | ✓ | `SMTP` (Infomaniak) or `SENDGRID` |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS` | ✓ if SMTP | Infomaniak creds |
| `MAIL_FROM` | ✓ | e.g. `EatSense <timur.kamaraev@eatsense.ch>` |
| `SENDGRID_API_KEY` | — | Fallback / alternative provider |
| `FREE_DAILY_ANALYSES`, `PRO_DAILY_ANALYSES` | ✓ | Defaults 3 / 25 |
| `DISABLE_LIMITS` | — | `true` for testing only |
| `S3_ENDPOINT`, `S3_BUCKET`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_REGION`, `S3_FORCE_PATH_STYLE` | ✓ | MinIO / S3 config |
| `EXPO_ACCESS_TOKEN` | ✓ | Required by Expo Push SDK for server-authenticated sends |

See `apps/api/env.template` for full list with defaults.

### Mobile (`.env` at project root)

| Key | Required | Notes |
|---|---|---|
| `EXPO_PUBLIC_API_BASE_URL` | ✓ | e.g. `https://eatsense-api.up.railway.app` or `http://192.168.X.X:3000` in dev |
| `EXPO_PUBLIC_ENV` | — | `production` for TestFlight builds |
| `EXPO_PUBLIC_APP_NAME` | — | Default `EatSense` |
| `EXPO_PUBLIC_APP_SCHEME` | — | Default `eatsense` |
| `EXPO_PUBLIC_GOOGLE_CLIENT_ID` (and `_IOS_` / `_ANDROID_` / `_WEB_` variants) | — | For Google sign-in |
| `EXPO_PUBLIC_DEV_TOKEN`, `EXPO_PUBLIC_DEV_REFRESH_TOKEN` | — | QA helper tokens |

### Expert portal (`apps/expert-portal/.env.local` or Vercel)

| Key | Notes |
|---|---|
| `NEXT_PUBLIC_API_URL` | Points at the API, e.g. `https://eatsense-api.up.railway.app` |
| `NEXT_PUBLIC_PORTAL_URL` | Self URL (used in magic-link redirects), e.g. `https://experts.eatsense.ch` |

---

## Deployment

### Backend — Railway
1. GitHub push → auto-deploy. `Dockerfile` in `apps/api/`.
2. Prisma migrations are applied on startup via `prisma migrate deploy`. Watch build logs for `_add_expert_education` style names to confirm.
3. After changing env vars → Redeploy.

### Expert portal — Vercel (currently)
- Project: `expert-portal-pi`
- Custom domain: `experts.eatsense.ch` (CNAME `dae319a41cc0d267.vercel-dns-017.com` in Infomaniak)
- Railway migration planned — see `apps/expert-portal/RAILWAY_SETUP.md`

### Admin panel — static
- Single HTML file. Deploy `apps/admin/index.html` to any static host. No build step.

### Landing — Cloudflare Pages
- Connected to `main` branch. Auto-rebuilds on push.
- Custom domain: `www.eatsense.ch` (CNAME → `eatsense.pages.dev`)
- Apex `eatsense.ch` → 301 redirect to `www` (handled by Infomaniak)

### Mobile — EAS Build + TestFlight
```bash
pnpm build:ios              # creates production build
pnpm dlx eas-cli@latest submit -p ios --profile production --latest
```

Bump `version`, `buildNumber`, `versionCode` in `app.config.js` for every TestFlight / Play Store release.

### DNS / domains reference
| Host | Target | Provider |
|---|---|---|
| `eatsense.ch` | A `84.16.66.164` → 301 `www.eatsense.ch` | Infomaniak |
| `www.eatsense.ch` | CNAME → `eatsense.pages.dev` | Cloudflare Pages |
| `experts.eatsense.ch` | CNAME → `dae319a41cc0d267.vercel-dns-017.com` | Vercel |

---

## Common scripts

### Root
```bash
pnpm lint                 # mobile lint
pnpm type-check           # mobile tsc --noEmit
pnpm test                 # mobile jest
pnpm test:e2e             # detox
pnpm pre-commit           # lint + type-check + test
pnpm i18n:verify          # all locales have every used key
```

### API
```bash
pnpm --filter eatsense-api start:dev
pnpm --filter eatsense-api build
pnpm --filter eatsense-api exec prisma generate
pnpm --filter eatsense-api prisma:migrate:deploy
pnpm --filter eatsense-api test
```

### Expert portal
```bash
cd apps/expert-portal
pnpm dev
pnpm build
pnpm exec tsc --noEmit
```

---

## Testing

**Backend:** `pnpm --filter eatsense-api test` (Jest)
**Mobile unit:** `pnpm test` (Jest)
**Mobile E2E:** `pnpm test:e2e` (Detox — config in `detox.config.js`)

E2E tests for the Experts Marketplace flow are **not yet automated** — manual smoke-checklist lives in the latest `docs/plans/experts-audit-*.md`.

---

## Troubleshooting

### Backend won't start
- `node --version` must be ≥ 20.19
- Check `DATABASE_URL` and `REDIS_URL` in `apps/api/.env`
- `pnpm --filter eatsense-api exec prisma generate` — refresh client after schema changes
- On Railway: check build logs for migration failures

### Mobile app shows SDK mismatch in Expo Go
- You need a **Development Build** (not Expo Go) for SDK 55+. Run `pnpm dlx eas-cli@latest build --profile development` or `pnpm ios`.

### OAuth sign-in fails
- `EXPO_PUBLIC_GOOGLE_CLIENT_ID` (and iOS/Android variants) must match values in Google Cloud Console
- Apple Sign-In needs matching `bundleIdentifier: ch.eatsense.app` on the Apple Developer account
- Check `/auth/google`, `/auth/apple` endpoint logs

### Expert portal → "No experts" / blank
- Check `CORS_ORIGINS` in API Railway env — must include `https://experts.eatsense.ch`
- Check `NEXT_PUBLIC_API_URL` in Vercel — must be the live API URL
- Open browser devtools → Network → verify 200s on API calls

### Push notification doesn't open chat on tap
- Build must be ≥ `v2.0.24` — deep-link handler was added in this release
- For cold-start: `Notifications.getLastNotificationResponseAsync()` is replayed automatically; if still not working, check app logs for `[NotificationActions] Cold-start response replay`

### Rate limits "disabled"
- `DISABLE_LIMITS` should be `false` (or unset) in production
- Redis connection — if Redis is down, the `DailyLimitGuard` currently fails open (documented bug, see `docs/plans/` backlog)

---

## Contacts

- **Technical / incidents:** support@eatsense.ch
- **Ops / infrastructure:** ops@eatsense.ch
- **Legal / privacy:** legal@eatsense.ch, privacy@eatsense.ch
- **Creator / expert partnerships:** creators@eatsense.ch
- **Feature requests:** open a GitHub issue

---

*Updated 2026-04-24. For the most recent audit and fix log, see `docs/plans/experts-audit-2026-04-24.md`.*
