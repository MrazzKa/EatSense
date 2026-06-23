# EatSense Site (landing + legal)

Static, dependency-free site (vanilla HTML/CSS/JS). Served on **Cloudflare** at
`https://eatsense.ch`. No build step — everything lives in `public/`.

## Pages
- `/` - Landing page (hero, how it works, features, programs, biomarkers, testimonials, pricing, FAQ, CTA)
- `/privacy` - Privacy Policy
- `/terms` - Terms of Use
- `/support` - Support Center
- `/pharmacy` - Pharmacy linking page
- `/experts` → 302 redirect to `https://experts.eatsense.ch` (see `public/_redirects`)

The landing is fully internationalized (EN/DE/FR/RU/KK/ES) via the inline `translations`
object + `setLanguage()` in `public/index.html`. Store buttons link to both the App Store and
Google Play (`id=ch.eatsense.app`).

## Local preview
```bash
cd apps/legal-site
npm run dev            # npx serve public -l 3000
```

## Deploy (Cloudflare Pages — recommended)
The `public/` directory is the publish dir. `public/_redirects` and `public/_headers` are honored.
```bash
cd apps/legal-site
npx wrangler pages deploy public --project-name eatsense
```
(Or connect the repo in the Cloudflare dashboard with build output dir = `apps/legal-site/public`.)
`wrangler.toml` is provided for the Workers Builds (Git) flow; ignored when using Pages.

## URLs for the stores
- Privacy Policy URL: `https://eatsense.ch/privacy`
- Support URL: `https://eatsense.ch/support`
