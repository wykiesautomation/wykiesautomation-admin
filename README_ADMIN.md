# Wykies Admin — Pages/Gallery CMS + Allowlist

## Files
- `admin.index.html` — Admin UI (Google Sign-In allowlist, Pages editor, Payments with Resend Invoice stub).
- `appsscript.json` — Manifest (Africa/Johannesburg, Stackdriver logging).
- `Code.gs` — Apps Script backend (GET pages/gallery/catalog, POST savePage, stubs for checkout/resendInvoice).

## Setup
1. Open Google Cloud Console → OAuth Client → add origin `https://admin.wykiesautomation.co.za`.
2. Deploy Apps Script as Web App (execute as Me; accessible by Anyone).
3. Put PayFast secrets in Script Properties (server-side only).
4. Create Sheets tabs: `Pages (slug,title,content)`, `Gallery (filename,caption,order,url)`.

## Admin Usage
- Sign in with Google. Allowlist: `wykiesautomation@gmail.com`.
- Pages tab shows existing pages from Sheets; click to load, edit Markdown, **Save** posts with your email for audit.
- Payments tab includes **Resend Invoice** (backend stub provided).

## Security
- Allowlist enforced server-side for `savePage`.
- No secrets in client HTML.
