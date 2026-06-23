# .well-known — Universal Links / App Links

These files let `https://www.eatsense.ch/...` links open the EatSense app directly
(used by the pharmacy QR / share links → `PharmacyDeepLinkHandler`).

- `apple-app-site-association` — iOS Universal Links. `appID` = `<TeamID>.<bundleId>`
  = `73T7PB4F99.ch.eatsense.app`. Served as `application/json` via `_headers`.
- `assetlinks.json` — Android App Links.

## ⚠️ Action required before Android App Links work

`assetlinks.json` → `sha256_cert_fingerprints` is currently **empty**. Add the
SHA-256 fingerprint(s) of the signing certificate:

- The **Play App Signing** certificate SHA-256 (Play Console → Setup → App signing),
  and/or
- The EAS-managed upload key SHA-256 (`eas credentials` → Android → production).

Until a fingerprint is present, Android falls back to the custom scheme
(`eatsense://pharmacy?code=…`) and the in-app "enter code" flow, which already work.

iOS Universal Links work as soon as this file is deployed to `www.eatsense.ch` and the
app (with `applinks:www.eatsense.ch`) is installed.
