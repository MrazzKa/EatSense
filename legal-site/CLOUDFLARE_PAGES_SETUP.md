# Cloudflare — Deploy the Landing Site

Two paths — pick one. **Option A (Pages) is simpler for a pure static site.** Option B (Workers Builds) is what the newer CF dashboard defaults to when you click "Connect to Git" from the Workers section.

---

## Option A — Cloudflare Pages (recommended)

### 1. Find the Pages UI

In the CF dashboard the Pages entry is nested:

- **Dashboard → Compute (Workers) → [Workers & Pages] → Create → Pages tab → Connect to Git**

If you land in a form titled **"Set up your application"** with fields like "Build command / Deploy command / `npx wrangler deploy`" — you are in the **Workers Builds** flow, not Pages. Go back and pick the Pages tab. Or use Option B below.

### 2. Configure the Pages project

- **Project name:** `eatsense-landing`
- **Production branch:** `main`
- **Framework preset:** `None`
- **Build command:** *(leave empty)*
- **Build output directory:** `legal-site/public`
- **Root directory (advanced):** *(leave empty)*

### 3. Deploy

Click **Save and Deploy** → first build takes ~30 s. URL: `eatsense-landing.pages.dev`.

### 4. Custom domain

Project → **Custom domains** → add `eatsense.ch` and `www.eatsense.ch`. If DNS is in Cloudflare, it auto-configures. Otherwise add `CNAME eatsense.ch → eatsense-landing.pages.dev`.

---

## Option B — Workers Builds (if you're already in this form)

The form you're seeing expects a `wrangler.toml`. I've added one at `legal-site/wrangler.toml`. Fill in the form as follows:

| Field | Value |
|---|---|
| **Project name** | `eatsense-landing` |
| **Build command** | *(leave empty)* |
| **Deploy command** | `npx wrangler deploy` |
| **Non-production branch deploy command** | `npx wrangler versions upload` |
| **Path** | `legal-site` |
| **API token** | Leave as is — CF creates it automatically |
| **Variables** | None needed |

### What the `wrangler.toml` does

```toml
name = "eatsense-landing"
compatibility_date = "2025-04-01"

[assets]
directory = "./public"
not_found_handling = "404-page"
```

- `[assets] directory` — serves everything in `legal-site/public/` as static files
- `not_found_handling = "404-page"` — falls back to a `404.html` if present; otherwise returns 404
- No Worker script needed — pure static

### First deploy

After saving, CF will:
1. Clone the repo
2. `cd legal-site`
3. Run `npx wrangler deploy` — which reads `wrangler.toml`, uploads `public/` as assets
4. Expose it at `eatsense-landing.<your-subdomain>.workers.dev`

### Custom domain

Worker → **Settings → Domains & Routes → Add → Custom Domain** → `eatsense.ch`.

---

## Redirects (both options)

Already configured in `public/_redirects`:

```
/experts       https://expert-portal-pi.vercel.app   302
/experts/*     https://expert-portal-pi.vercel.app/:splat   302
```

**Note:** `_redirects` is a **Pages-only** feature. If you go with **Option B (Workers)**, the `_redirects` file is ignored — you'd need to handle `/experts` redirect differently:

- Simplest: add a `legal-site/public/experts/index.html` with a meta refresh / JS redirect
- Cleaner: switch to Option A (Pages) which supports `_redirects` natively

When the expert portal is later moved to Railway at `experts.eatsense.ch`, update the redirect target accordingly.

## Security headers (both options)

`public/_headers` works on Pages; on Workers you'd need to set them via the Worker script. For now, CF's default security is adequate.

## After deploy — checklist

- [ ] `https://eatsense.ch/` loads landing page
- [ ] `https://eatsense.ch/experts` redirects to portal (Pages only)
- [ ] `https://eatsense.ch/privacy`, `/terms`, `/support` open their respective pages
- [ ] Hero phone shows `eatsense.png` (upload to `legal-site/public/images/eatsense.png` first)
- [ ] **Remove** the old Vercel project for the landing site
- [ ] Lower DNS TTL before switching, raise back to normal after confirmed working

## Rollback

- **Pages:** every deploy is retained → one-click rollback in the Deployments list
- **Workers Builds:** use `npx wrangler rollback` or re-deploy a previous commit

## My recommendation

**Go with Option A (Pages).** Back out of the current form:
1. Dashboard → Workers & Pages
2. Look for the tabs **Workers | Pages** at the top
3. Click **Pages → Create → Connect to Git**

The Pages flow has `_redirects`, `_headers`, and preview deployments out-of-the-box — exactly what a static site needs.
