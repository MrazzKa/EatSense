# Railway Deployment Guide

This guide assumes you have a Railway project with the following services:

- **Web Service:** `eatsense-api` – deploys the NestJS backend from `apps/api`
- **PostgreSQL:** managed Railway database
- **Redis:** managed Railway redis
- **MinIO:** docker service (`minio/minio:latest`) with a persistent volume

## 1. Build Artifacts

```bash
# From repository root
pnpm install
pnpm -r build
pnpm --filter eatsense-api prisma migrate deploy
```

`pnpm -r build` runs `nest build` and confirms the mobile placeholder script.

## 2. Configure Railway Web Service

| Setting | Value |
| --- | --- |
| **Root Directory** | `apps/api` |
| **Install Command** | `pnpm install --frozen-lockfile` |
| **Build Command** | `pnpm build` |
| **Start Command** | `pnpm start:railway` |

## 3. Environment Variables

Use Railway variable references to avoid hard-coding secrets. Example:

| Key | Value |
| --- | --- |
| `NODE_ENV` | `production` |
| `PORT` | `8080` |
| `DATABASE_URL` | `${{PG_DATABASE_URL}}` |
| `REDIS_URL` | `${{REDIS_URL}}` |
| `API_BASE_URL` | `https://api.eatsense.app` |
| `APP_BASE_URL` | `https://app.eatsense.app` |
| `CORS_ORIGINS` | `https://app.eatsense.app,https://studio.expo.dev` |
| `JWT_SECRET` | generate securely |
| `JWT_REFRESH_SECRET` | generate securely |
| `SENDGRID_API_KEY` | SendGrid API key |
| `MAIL_FROM` | `EatSense <timur.kamaraev@eatsense.ch>` |
| `OPENAI_API_KEY` | OpenAI API key |
| `FDC_API_KEY` | USDA FoodData Central key |
| `FREE_DAILY_ANALYSES` | `3` |
| `PRO_DAILY_ANALYSES` | `25` |
| `DISABLE_LIMITS` | `false` |
| `ADMIN_BYPASS_LIMITS` | `false` |
| `ASSISTANT_FLOWS_ENABLED` | `true` |
| `HEALTH_SCORE_WEIGHTS` | reuse from `env.template` |
| `CACHE_DEFAULT_TTL_SEC` | `900` |
| `USDA_CACHE_TTL_SEC` | `259200` |
| `ANALYSIS_CACHE_TTL_SEC` | `86400` |
| `ARTICLES_FEED_CACHE_TTL_SEC` | `900` |
| `ARTICLES_DETAIL_CACHE_TTL_SEC` | `86400` |
| `ASSISTANT_SESSION_TTL_SEC` | `1800` |
| `S3_ENDPOINT` | `${{MINIO_URL}}` (e.g. `https://minio.up.railway.app`) |
| `S3_BUCKET` | `eatsense-media` |
| `S3_REGION` | `us-east-1` |
| `S3_ACCESS_KEY_ID` | MinIO access key |
| `S3_SECRET_ACCESS_KEY` | MinIO secret key |
| `S3_FORCE_PATH_STYLE` | `true` |
| `EXPO_ACCESS_TOKEN` | service token (optional) |

Add other cache or feature flags as needed (`NUTRITION_PROVIDER`, etc.).

## 4. Attach Postgres & Redis

In the Railway dashboard, add variable references:

- `DATABASE_URL = ${DATABASE_URL}` from the PostgreSQL resource (connection string)
- `REDIS_URL = ${REDIS_URL}` from the Redis resource

## 5. MinIO Service

1. Add a **Docker** service on Railway using `minio/minio:latest`.
2. Set the start command to:
   ```bash
   minio server /data --console-address :9001
   ```
3. Create a volume for `/data`.
4. Configure access key and secret in the service variables (`MINIO_ROOT_USER`, `MINIO_ROOT_PASSWORD`).
5. Expose the HTTP endpoint (port 9000) and console (9001) internally.
6. Use the generated URL for `S3_ENDPOINT`. Ensure `S3_FORCE_PATH_STYLE=true`.

## 6. Domain & SSL

- Point `api.eatsense.app` to the Railway web-service CNAME (`*.up.railway.app`).
- Use Railway’s custom domain wizard to provision TLS automatically.

## 7. Smoke Test

After deployment:

```bash
curl https://api.eatsense.app/health
node apps/api/test-api.js usda:search "greek yogurt"
node apps/api/test-api.js analyze-text "oatmeal 60g with milk"
```

Then follow the [smoke checklist](./smoke-checklist.md) to validate OTP login, USDA search, analysis pipeline, articles feed, notifications preferences, and AI assistant flows.
