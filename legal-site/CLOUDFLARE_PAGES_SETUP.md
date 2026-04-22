# Cloudflare Pages — Step-by-step (from zero)

Project name on Cloudflare: **`eatsense`** (not `eatsense-landing`).

---

## Step 1 — Open the Pages UI (the exact clicks)

The dashboard has two similar flows ("Workers Builds" and "Pages"). You want **Pages**.

1. Go to https://dash.cloudflare.com
2. Left sidebar → **Compute (Workers)** → click it
3. You land on **Workers & Pages** overview
4. At the top you'll see **Overview** with two tabs: **Workers** | **Pages**
5. Click the **Pages** tab
6. Click **Create application** → then the sub-tab **Pages** → **Connect to Git**

**Check:** the page title should say **"Create a project"** and the button panel should offer GitHub / GitLab. If the page says **"Set up your application"** with a "Deploy command" field — you are in Workers Builds. Go back and select the **Pages** tab.

---

## Step 2 — Connect GitHub

1. Click **Connect GitHub account** → authorize Cloudflare
2. In "Select a repository" → pick your `eatsense` repo (grant access to just that repo if asked)
3. Click **Begin setup**

---

## Step 3 — Fill the build form

Enter exactly these values:

| Field | Value |
|---|---|
| **Project name** | `eatsense` |
| **Production branch** | `main` |
| **Framework preset** | `None` |
| **Build command** | *(leave empty)* |
| **Build output directory** | `legal-site/public` |
| **Root directory (advanced)** | *(leave empty)* |
| **Environment variables** | *(none)* |

Then click **Save and Deploy**.

First build takes ~20–40 s. When done, your URL is:
`https://eatsense.pages.dev`

Open it — you should see the landing page. `/privacy`, `/terms`, `/support` should all load.

---

## Step 4 — Add the custom domain `eatsense.ch`

In Pages project → **Custom domains** tab → **Set up a custom domain**.

Because DNS stays at **Infomaniak** (not Cloudflare), you'll use CNAME, not the automatic flow.

### 4a. What to enter in Cloudflare

- Domain: `www.eatsense.ch` → Save
- Domain: `experts.eatsense.ch` → Save (for the expert portal later)

Cloudflare will display records you need to add. For each one it shows a **target** like `eatsense.pages.dev`.

### 4b. What to add in Infomaniak DNS

Log in to Infomaniak → **Domains → eatsense.ch → DNS Zone**.

Add **one CNAME**:

| Type | Name | Target | TTL |
|---|---|---|---|
| CNAME | `www` | `eatsense.pages.dev` | 3600 |

**Do NOT** add a CNAME on the bare apex (`eatsense.ch` / `@`) — it will break your email MX/TXT records.

### 4c. Make the bare `eatsense.ch` redirect to `www`

In Infomaniak → **Domains → eatsense.ch → Web Redirects** (or "Redirections"):

- Source: `eatsense.ch` (or `@`)
- Destination: `https://www.eatsense.ch`
- Type: `301 Permanent`

That's the only way to keep email working on the apex while the site is hosted elsewhere.

### 4d. Verify

After ~5–15 min (DNS propagation):
- `https://www.eatsense.ch` → shows landing page
- `https://eatsense.ch` → 301 redirects to `www.eatsense.ch`
- `https://www.eatsense.ch/experts` → 302 to `https://experts.eatsense.ch` (from `_redirects`)

---

## Step 5 — Remove the old Vercel landing project

Only after Step 4d verification passes:

1. Vercel dashboard → `eatsense` (landing) project → **Settings → General → Delete Project**
2. Keep the `expert-portal` Vercel project running until Railway cutover is complete.

---

## What's already in the repo

- `legal-site/public/_redirects` — routes `/experts` → `https://experts.eatsense.ch`
- `legal-site/public/_headers` — CSP/security headers + image caching
- `legal-site/wrangler.toml` — only used if you (later) switch to Workers Builds; Pages ignores it

## Rollback

Every Pages deploy is retained. Project → **Deployments** → pick previous → **Rollback**. One click.

## Notes

- `_redirects` and `_headers` are Pages-only. Keep them in `legal-site/public/`.
- Preview deploys: every non-`main` branch pushed to GitHub gets a preview URL automatically.
- Don't touch `wrangler.toml` unless you deliberately switch to Workers Builds — Pages doesn't read it.
