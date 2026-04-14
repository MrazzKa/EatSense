# Cloudflare Pages — Deploy Instructions

Replaces Vercel for the static landing site. CF Pages is free, commercial-safe, and has unlimited bandwidth.

## Prerequisites

- Cloudflare account (free)
- Domain `eatsense.ch` (or whichever) managed in Cloudflare DNS (or accessible to add CNAME)

## One-time setup

### 1. Create the Pages project

1. Go to https://dash.cloudflare.com → **Workers & Pages** → **Create application** → **Pages** → **Connect to Git**
2. Connect your GitHub account, select the `eatsense` repository
3. Configure build settings:
   - **Project name:** `eatsense-landing`
   - **Production branch:** `main`
   - **Framework preset:** `None`
   - **Build command:** *(leave empty)*
   - **Build output directory:** `legal-site/public`
   - **Root directory (advanced):** *(leave empty — we use output dir to point inside)*
4. Click **Save and Deploy**

First deploy takes ~1 min. You'll get a URL like `eatsense-landing.pages.dev`.

### 2. Custom domain

1. In the project → **Custom domains** → **Set up a custom domain**
2. Enter `eatsense.ch` (and `www.eatsense.ch` as a second domain)
3. If DNS is on Cloudflare: it auto-configures CNAME
4. Otherwise: add `CNAME eatsense.ch → eatsense-landing.pages.dev` in your DNS provider

### 3. Environment

No env vars needed — it's a pure static site.

### 4. Redirects

Already configured in `public/_redirects`:

```
/experts       https://expert-portal-pi.vercel.app   302
/experts/*     https://expert-portal-pi.vercel.app/:splat   302
```

Once the expert portal is also moved to Railway (`experts.eatsense.ch`), update these to the new URL.

### 5. Security headers

Already configured in `public/_headers`.

## After migration

- [ ] Verify `https://eatsense.ch/` loads
- [ ] Verify `https://eatsense.ch/experts` redirects to portal
- [ ] Verify `https://eatsense.ch/privacy`, `/terms`, `/support` still work
- [ ] **Remove** the Vercel project for the landing site (keep portal for now)
- [ ] Update DNS TTL back to normal if lowered

## Rollback

CF Pages keeps every deploy — one-click rollback via dashboard.
