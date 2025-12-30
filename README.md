
# Wykies Automation — Admin Site

Tabs: Products, Gallery, Payments, Logs. Dev mode bypasses backend auth.

## Configure
- Edit `config.json` with Apps Script URL and Sheet ID.
- Set `devMode` to `false` for production and implement `action=auth` validation on backend.

## Endpoints (expected)
- `?action=products` (GET) — list products
- `?action=save_products` (POST) — save products
- `?action=gallery` (GET)
- `?action=upload_gallery` (POST)
- `?action=payments` (GET)
- `?action=resend_invoice&invoiceNo=INV-YYYY-XXXXX` (GET)
- `?action=pricechanges` (GET)
- `?action=auth&pass=...` (GET)

## Notes
- No secrets in client JS. Passphrase and PayFast passphrase must live in backend (Apps Script/Cloudflare Worker env).
