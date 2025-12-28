
# Wykies Automation — Admin (Products, Payments, Invoices)

This bundle contains a **Google Sign‑In–protected Admin** for:
- **Products**: add/edit/delete, image uploads to Drive, CSV export, publish hook
- **Payments**: list, CSV/XLSX export, resend invoice, repair PDF (proxy)
- **Invoices**: create/edit/delete, line items, totals, PDF generate, email, mark paid

## What’s inside

- `index.html` — Admin UI shell (Products, Payments, Invoices)
- `admin.css` — Dark theme with brand‑blue accents (#2F76FF)
- `config.js` — Configuration (fill in **APP_SCRIPT_DEPLOY_ID** and **DRIVE_FOLDER_ID**)
- `productsApi.js` — Products tab + Google Sign‑In gate + uploads + publish
- `paymentsApi.js` — Payments tab (adds ID token header for proxy)
- `invoicesApi.js` — Invoices tab (CRUD + PDF + email)
- `apps-script/Code.gs` — Backend (Apps Script) with products + invoices + auth
- `proxy/publish.worker.js` — Cloudflare Worker stub for `/publish` token‑verified endpoint

## Prerequisites

- **Google OAuth Client ID (Web)** — already in `config.js`.
- **Google Sheet** — ID is set to `12qRMe6pAPVaQtosZBnhVtpMwyNks7W8uY9PX1mF620k`.
- **Google Drive folder** for product images & invoices — set the Folder ID in `config.js`.
- (Optional) **Admin proxy** on `admin-proxy.wykiesautomation.co.za` with endpoints `/publish` and `/payments` that accept `X-ID-Token`.

## Step 1 — Apps Script backend

1. Open <https://script.google.com/> and create a new project.
2. Replace the default code with the contents of `apps-script/Code.gs`.
3. Save the project.
4. **Deploy** → **New deployment** → **Web app**:
   - *Execute as*: **Me**
   - *Who has access*: **Anyone with the link**
5. Copy the deployment URL; extract the **Deploy ID** (the long `AKfycb...` string).
6. Update `config.js` in this bundle: replace `APP_SCRIPT_DEPLOY_ID` with your Deploy ID.
7. On first run, Apps Script will ask for permissions (Drive, Mail, UrlFetch) — accept.

### Initializing sheets (first run)
- Products: a sheet named `products` will be created with headers:
  `SKU | Name | PriceIncl | UpdatedAt | ImagesJSON`
- Invoices: sheets `invoices` and `invoice_items` will be created on first write.
- Settings: sheet `settings` will be created automatically for invoice counters.
- Price log: sheet `price_log` created when first logging price changes.

## Step 2 — Google Drive setup

1. Create a folder for images/PDFs in Google Drive.
2. Right‑click → Share → **Anyone with the link: Viewer** (Apps Script sets sharing when uploading too).
3. Copy the Folder URL; the **Folder ID** is the long string in the URL.
4. Paste it into `config.js` → `DRIVE_FOLDER_ID`.

## Step 3 — Front‑end deploy (Admin panel)

### GitHub Pages (recommended)
1. Create a repo (or use your existing Pages repo / subdomain hosting).
2. Copy all files in this folder to your repo root (or `/admin` path if you serve as a subpath).
3. Commit & push to `main`. Enable GitHub Pages if not already.
4. Point your subdomain (e.g., `admin.wykiesautomation.co.za`) to GitHub Pages via DNS CNAME.

### Any static hosting
Upload `index.html`, `admin.css`, `config.js`, `productsApi.js`, `paymentsApi.js`, `invoicesApi.js` to your host.

## Step 4 — Admin proxy (optional but recommended)

- Implement `/publish` to read products from the Apps Script endpoint and **commit** a `products.json` into your public site repo. Use a GitHub PAT stored as an environment secret. Verify `X-ID-Token` with Google `tokeninfo` and ensure email is allowlisted.
- The included `proxy/publish.worker.js` is a **Cloudflare Worker** stub that:
  - Verifies `X-ID-Token`
  - Checks `aud` against `GOOGLE_CLIENT_ID` (set via env in Worker)
  - Currently returns **501 Not Implemented** so you don’t accidentally write.

## Step 5 — Using the Admin

1. Open your Admin URL.
2. Click **Continue with Google** and sign in as `wykiesautomation@gmail.com`.
3. **Products**: add/edit, upload images, export CSV, **Publish** to push live (once proxy wired).
4. **Invoices**: create/edit, **Generate PDF**, **Email**, **Mark Paid**.
5. **Payments**: view, export, resend/repair (proxy must handle these operations).

## Troubleshooting

- **Sign‑in works but tabs are hidden** → Ensure you signed in with the allowlisted email and that `config.js` points to your Apps Script Deploy ID.
- **Uploads fail** → Check Drive Folder ID and sharing; verify Apps Script has Drive scope.
- **PDF email fails** → Apps Script needs MailApp permission; reauthorize the deployment.
- **Publish returns 501** → Implement GitHub commit logic in your proxy; the Worker is a safe stub.

## Security notes

- Only `wykiesautomation@gmail.com` is allowed to perform write actions.
- The browser stores a Google ID token in memory only; server verifies it with Google’s tokeninfo.
- Consider restricting **listProducts/listInvoices** to signed‑in users if you don’t want public reads.

---

**Brand**: Original blue `#2F76FF` retained across Admin UI.

**Support**: Update `config.js` with your Deploy ID and Drive Folder ID, then redeploy.
