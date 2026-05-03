# Expert Portal — Railway Deployment

Moves the expert portal from Vercel to Railway for unified infra with the API. Uses a Dockerfile so the pnpm monorepo builds cleanly.

## Files added

- `apps/expert-portal/Dockerfile` — multi-stage Next.js standalone build
- `apps/expert-portal/railway.json` — Railway service config (points to Dockerfile, expects build context = repo root)

## One-time setup

### 1. Create the Railway service

1. Open your existing Railway project (same one hosting the API)
2. **+ New** → **GitHub Repo** → select `eatsense`
3. Railway will detect `railway.json` — confirm:
   - **Builder:** Dockerfile
   - **Dockerfile path:** `apps/expert-portal/Dockerfile`
   - **Root directory:** *(leave empty — we want the monorepo root as build context)*
4. Service name: `expert-portal`

### 2. Environment variables

Add in Service → Variables:

| Key | Value |
|---|---|
| `NEXT_PUBLIC_API_URL` | `https://<your-api-service>.up.railway.app` (or `api.eatsense.ch`) |
| `NEXT_PUBLIC_PORTAL_URL` | `https://expert.eatsense.app` (used as magic-link redirect target) |
| `PORT` | `3000` (Railway auto-injects if omitted, but safe to set) |
| `NODE_ENV` | `production` |

Check `apps/expert-portal/lib/api.ts` for any other `NEXT_PUBLIC_*` variables the frontend reads at build time.

### 3. Domain

1. Service → **Settings** → **Networking** → **Generate Domain** (gives you a `*.up.railway.app` URL to test)
2. Once verified → **Custom Domain** → add `expert.eatsense.app`
3. Update DNS: `CNAME expert.eatsense.app → <railway domain>`

### 4. API CORS

Add the new domain to the API's `CORS_ORIGINS` env var:

```
https://eatsense.ch,https://www.eatsense.ch,https://expert.eatsense.app
```

Redeploy the API service after changing.

### 5. Update the landing redirect

Once the Railway portal is live at `expert.eatsense.app`, update `legal-site/public/_redirects`:

```
/experts       https://expert.eatsense.app         302
/experts/*     https://expert.eatsense.app/:splat  302
```

Push → Cloudflare Pages redeploys automatically.

### 6. Magic link redirect URL

Inside the portal code, magic link login passes a `redirectUrl` to the API. Make sure any hardcoded URLs reference the new domain. Search for occurrences:

```bash
grep -rn "expert-portal-pi.vercel.app\|expert.eatsense.app" apps/expert-portal/
```

Update as needed and set via env var if possible.

## Verify

- [ ] Railway build completes
- [ ] `https://<railway-domain>/` loads login page
- [ ] Enter email → magic link email received
- [ ] Click link → redirects to `/dashboard`
- [ ] `/chats` lists conversations
- [ ] No CORS errors in browser console

## Rollback

- Keep the old Vercel deploy live until migration is confirmed working
- Switch DNS back to `*.vercel.app` if problems surface

## Cost

On Railway, this runs alongside the API on the same project. Memory footprint of a Next.js standalone app in production is ~80–150 MB. Should fit in existing Railway plan without upgrade.
