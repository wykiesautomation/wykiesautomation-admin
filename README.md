
# Wykies Automation — Admin Panel

This repository contains the Admin UI. Authentication is handled server-side by an Apps Script endpoint that returns a short-lived token. Never store or check the passphrase on the client.

## Configure
- Set `adminAuthEndpoint` in `config.json` to the deployed Apps Script auth URL.
- Set `apiBase` to the same Apps Script base used by the public site.

## Endpoints
- `POST /auth` (example): body `{ passphrase }` → `{ token }`
- `GET /products` → `{ products: [...] }`
- `POST /products` → upsert product
- `DELETE /products?id=123` → delete product
