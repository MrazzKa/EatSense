# EatSense

AI-assisted nutrition tracker with a NestJS + Prisma backend and an Expo/React Native client.

## Monorepo Structure

- `apps/api` – NestJS API (PostgreSQL, Prisma, Redis, BullMQ, SendGrid, MinIO/S3)
- `src/` / `App.js` – Expo-managed mobile client
- `docs/` – Deployment runbooks and smoke-checklists

The project is managed with **pnpm** workspaces (`pnpm-workspace.yaml`). Always use `pnpm` commands from the repo root unless a guide explicitly says otherwise.

## Prerequisites

| Tool | Version |
| --- | --- |
| Node.js | 20.19+ |
| pnpm | 9.x |
| PostgreSQL | 15+ |
| Redis | 7+ |
| MinIO (optional locally) | latest |
| Expo CLI / EAS CLI | latest |

> **Why Node 20?** Expo SDK 51+ and modern Nest builds expect Node 20. Using older versions results in `EBADENGINE` warnings and build failures on EAS.

## Quick Start (Local)

1. **Install dependencies**
   ```bash
   pnpm install
   pnpm --filter eatsense-api install
   ```

2. **Bootstrap backend environment files**
   ```bash
   cd apps/api
   pnpm run setup:env   # creates .env and .env.example if missing
   ```

3. **Configure root `.env`**

   Create a root `.env` file (copy from `.env.example`):
   ```bash
   cp .env.example .env
   ```

   Update `.env` with your API URL:
   ```env
   # For local development on same machine
   EXPO_PUBLIC_API_BASE_URL=http://localhost:3000
   
   # For mobile device on same network (replace 192.168.168.201 with your machine's IP)
   # Find your IP: ifconfig (Linux/Mac) or ipconfig (Windows)
   # EXPO_PUBLIC_API_BASE_URL=http://192.168.168.201:3000
   
   EXPO_PUBLIC_ENV=development
   EXPO_PUBLIC_DEV_TOKEN=
   EXPO_PUBLIC_DEV_REFRESH_TOKEN=
   ```

   **Important:** If running the mobile app on a physical device, use your machine's IP address instead of `localhost`. The IP address is shown when you start the backend (look for `🌐 Accessible on:` in the console output).

4. **Run database & cache** (local docker example)
   ```bash
   docker compose -f docker-compose.prod.yml up -d postgres redis minio
   ```

5. **Start the API**
   ```bash
   cd apps/api
   pnpm run start:dev
   ```

6. **Start the Expo client**

   For local development on the same machine:
   ```bash
   pnpm run start:lan
   ```

   For development with a specific IP (if your IP changed):
   ```bash
   pnpm run start:dev
   ```

   **Note:** If you're using Expo Go and see SDK version mismatch, you'll need to use a Development Build instead. See deployment docs for details.

## Linting & Tests

```bash
pnpm lint             # mobile lint rules
pnpm test             # mobile unit tests (jest)
pnpm --filter eatsense-api lint
pnpm --filter eatsense-api test
```

## Deployment Runbooks

The full deployment checklist lives in `docs/deployment/README.md` and is split into:

- Railway web-service deployment (`docs/deployment/railway.md`)
- Expo EAS build & TestFlight submission (`docs/deployment/eas.md`)
- Post-deploy smoke tests (`docs/deployment/smoke-checklist.md`)

Refer to those documents for environment variable matrices, command sequences, and infrastructure notes.

## Environment Variable Overview

### Backend (`apps/api/.env` or Railway variables)

| Key | Required | Notes |
| --- | --- | --- |
| `NODE_ENV` | ✅ | Use `production` on Railway |
| `PORT` | ✅ | Railway expects `8080` |
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `REDIS_URL` | ✅ | Railway Redis variable reference |
| `API_BASE_URL` | ✅ | Public API (e.g. `https://api.eatsense.app`) |
| `APP_BASE_URL` | ✅ | Expo web deep-link host |
| `CORS_ORIGINS` | ✅ | Comma-separated whitelist of origins |
| `JWT_SECRET`, `JWT_REFRESH_SECRET` | ✅ | Auth token secrets |
| `OPENAI_API_KEY`, `FDC_API_KEY` | ✅ | External API keys |
| `MAIL_PROVIDER` | ✅ | `SMTP` (default) or `SENDGRID` |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS` | ✅ | Infomaniak SMTP credentials |
| `MAIL_FROM` | ✅ | Verified sender, e.g. `EatSense <timur.kamaraev@eatsense.ch>` |
| `SENDGRID_API_KEY` | optional | Only if using SendGrid fallback |
| `FREE_DAILY_ANALYSES`, `PRO_DAILY_ANALYSES` | ✅ | Rate limits (default: 3 free, 25 pro) |
| `DISABLE_LIMITS` | optional | Set to `true` to disable all rate limits (testing only) |
| `REDIS_BLACKLIST_PREFIX` | optional | Prefix for refresh token blacklist (default: `auth:refresh:blacklist:`) |
| `S3_*` | ✅ | MinIO/S3 connection (endpoint, bucket, credentials) |
| `CACHE_*`, `ASSISTANT_SESSION_TTL_SEC` | ✅ | Cache tuning |
| `JWT_ACCESS_TOKEN_EXPIRATION_TIME` | optional | Access token expiration (default: `45m`) |

See `apps/api/env.template` for defaults and descriptions.

### Mobile (`.env` at project root)

| Key | Required | Notes |
| --- | --- | --- |
| `EXPO_PUBLIC_API_BASE_URL` | ✅ | Same host as Railway deployment (e.g. `https://api.eatsense.app`) |
| `EXPO_PUBLIC_ENV` | optional | `production` when building TestFlight |
| `EXPO_PUBLIC_APP_NAME` | optional | App name (default: `EatSense`) |
| `EXPO_PUBLIC_APP_SCHEME` | optional | URL scheme (default: `eatsense`) |
| `EXPO_PUBLIC_GOOGLE_CLIENT_ID` | optional | Google OAuth Client ID for sign-in |
| `EXPO_PUBLIC_DEV_TOKEN`, `EXPO_PUBLIC_DEV_REFRESH_TOKEN` | optional | QA helper tokens |

## Common Scripts

```bash
pnpm -r build                    # runs API build (+ placeholder for mobile)
pnpm --filter eatsense-api prisma migrate dev
node apps/api/test-api.js usda:search "greek yogurt"
node apps/api/test-api.js analyze-text "oatmeal 60g with milk"
```

> `pnpm -r build` now works due to workspace setup and scripts. For mobile releases use the EAS profiles described in the deployment docs.

## Authentication & Security

### OAuth Sign-In
- **Apple Sign-In**: Available on iOS devices (requires Apple Developer account)
- **Google Sign-In**: Available on all platforms (requires Google OAuth Client ID)
- **Email/OTP**: Traditional email-based authentication with one-time passwords

### Token Management
- **Access Tokens**: Valid for 45 minutes (configurable via `JWT_ACCESS_TOKEN_EXPIRATION_TIME`)
- **Refresh Tokens**: Valid for 30 days, stored in Secure Storage (Keychain/Keystore)
- **Token Rotation**: Refresh tokens are rotated on each refresh
- **Token Blacklist**: Revoked refresh tokens are blacklisted in Redis until expiration

### Account Deletion
- Users can delete their accounts via `DELETE /users/me`
- All user data is deleted (cascade delete in database)
- All refresh tokens are revoked and blacklisted
- Redis cache entries are cleaned up

## Rate Limits

### Daily Limits
- **Free Users**: 3 photo analyses per day (configurable via `FREE_DAILY_ANALYSES`)
- **Pro Users**: 25 photo analyses per day (configurable via `PRO_DAILY_ANALYSES`)
- Limits reset at midnight (UTC)
- Limits can be disabled via `DISABLE_LIMITS=true` (testing only)

### OTP Rate Limits
- **Email Cooldown**: 60 seconds between OTP requests
- **Hourly Limit**: 5 OTP requests per email per hour
- **IP Limit**: 40 OTP requests per IP per hour

## App Store Requirements

### Privacy & Legal
- **Terms of Service**: Available in-app via `TermsOfServiceScreen`
- **Privacy Policy**: Available in-app via `PrivacyPolicyScreen`
- **Account Deletion**: Implemented via `DELETE /users/me` endpoint
- **Privacy Descriptions**: Configured in `app.config.js` iOS `infoPlist`

### App Icons
- **Icon**: Uses `assets/logo/Logo.jpeg` (Expo auto-generates required sizes)
- **No Transparency**: App icons must not have transparency for App Store submission
- **Splash Screen**: Uses `assets/splash.png`

## Localization (i18n)

### Supported Languages
- English (en) - Default
- Spanish (es)
- German (de)
- French (fr)
- Korean (ko)
- Japanese (ja)
- Chinese (zh)

> **Note**: Russian (ru) has been removed from the bundle as requested.

### Configuration
- Default locale: `en`
- Supported locales: `en,es,de,fr,ko,ja,zh`
- Language preference is stored in AsyncStorage
- Translations are stored in `app/i18n/locales/`

## Development Workflow

### Local Development
1. Install dependencies: `pnpm install`
2. Generate Prisma Client: `pnpm --filter eatsense-api exec prisma generate`
3. Run database migrations: `pnpm --filter eatsense-api prisma migrate dev`
4. Start backend: `pnpm --filter eatsense-api start:dev`
5. Start mobile app: `pnpm start`

### Testing
```bash
# Backend tests
cd apps/api
pnpm test

# Mobile tests
pnpm test

# E2E tests (if configured)
pnpm test:e2e
```

### Building for Production
```bash
# Build backend
pnpm --filter eatsense-api build

# Build iOS (EAS)
pnpm dlx eas-cli@latest build -p ios --profile production

# Submit to TestFlight
pnpm dlx eas-cli@latest submit -p ios --profile production --latest
```

## Troubleshooting

### Common Issues

#### Backend won't start
- Check Node.js version: `node --version` (should be 20.19+)
- Check database connection: `DATABASE_URL` in `apps/api/.env`
- Check Redis connection: `REDIS_URL` in `apps/api/.env`
- Run Prisma generate: `pnpm --filter eatsense-api exec prisma generate`

#### Mobile app won't build
- Check Expo CLI version: `npx expo --version`
- Clear cache: `pnpm start --clear`
- Check `.env` file: Ensure `EXPO_PUBLIC_API_BASE_URL` is set
- Check `app.config.js`: Ensure `bundleIdentifier` is `ch.eatsense.app`

#### OAuth sign-in fails
- Check Google Client ID: `EXPO_PUBLIC_GOOGLE_CLIENT_ID` in `.env`
- Check Apple Sign-In: Requires Apple Developer account and proper configuration
- Check backend endpoints: Ensure `/auth/apple` and `/auth/google` are working

#### Rate limits not working
- Check Redis connection: `REDIS_URL` in `apps/api/.env`
- Check `DISABLE_LIMITS`: Should be `false` in production
- Check daily limit counters in Redis: `daily:food:${userId}:${today}`

## Support & Contact

- **Technical questions**: support@eatsense.ch
- **Incidents / outages**: ops@eatsense.ch
- **Legal / Privacy**: legal@eatsense.ch, privacy@eatsense.ch
- **Feature requests**: open a GitHub issue