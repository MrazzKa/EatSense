# EatSense Legal Site

Static site for App Store Review legal pages.

## Pages
- `/` - Landing page (main site)
- `/privacy` - Privacy Policy
- `/terms` - Terms of Use
- `/support` - Support Center

## Deploy to Vercel (Recommended)
1. **Login first:**
   ```bash
   npx vercel login
   ```
   *Follow the prompts in your browser.*

2. **Deploy:**
   ```bash
   npx vercel --prod
   ```

## Deploy to Netlify
```bash
cd legal-site
npx netlify deploy --prod --dir=public
```

## URLs for App Store Connect
After deployment, update these in App Store Connect:
- Privacy Policy URL: `https://your-domain.vercel.app/privacy`
- Support URL: `https://your-domain.vercel.app/support`
