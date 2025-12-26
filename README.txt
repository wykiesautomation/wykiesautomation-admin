
# Wykies Automation — Admin Dashboard (Option A Skeleton)

## Deploy to GitHub Pages subdomain
1. Push this folder to its own repo.
2. Publish to GitHub Pages.
3. Map `admin.wykiesautomation.co.za` via Cloudflare to this Pages site.

## Configure
- Edit `config.json`:
  - `appsScriptUrl`: Google Apps Script Web App URL
  - `adminPassphrase`: temporary passphrase (migrate to JWT later)

## Tabs
- **Products**: editable grid, Save posts `updateProduct` to Apps Script.
- **Gallery**: drag & drop -> posts `galleryUpload` (implement file storage in Apps Script/Drive).
- **Payments**: read-only list from `payments`.
- **Price Changes**: read-only list from `priceChanges`.

## Next
- Replace passphrase gate with JWT auth.
- Add Cloudflare WAF & rate limits to `/admin` and `/api`.
