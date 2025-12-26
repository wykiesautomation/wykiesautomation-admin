
# Wykies Automation – Admin Front-end (Token Enforced)

This folder hosts a static front-end (GitHub Pages) that talks to a Google Apps Script Web App backend.

## Configure
1. Edit `config.json` and set `BACKEND_URL` to your deployed Apps Script Web App URL, e.g.
   `https://script.google.com/macros/s/AKfycbxYourDeploymentId/exec`
2. Ensure the backend has Script Properties set:
   - `SHEET_ID` = `12qRMe6pAPVaQtosZBnhVtpMwyNks7W8uY9PX1mF620k`
   - `SECRET`   = long random string (see backend README)
   - `ADMIN_EMAIL` = `wykiesautomation@gmail.com`
   - `ADMIN_PASS_SHA256` = SHA-256 hex of your chosen password

## Deploy
- Commit these files to your GitHub repo (root of the Pages site).
- Optionally add a `CNAME` file containing `wykiesautomation.co.za`.

## Use
- Open the site → go to **Login** → enter email/password → **Sign in**.
- You’ll be redirected to **Dashboard** with counters.
- **Products/Gallery** tabs allow writing when token is valid.

## Quick tests (curl)
```bash
# Ping
curl -s "$BACKEND_URL?action=ping"

# Login
curl -s -X POST -H "Content-Type: application/json"   -d '{"email":"wykiesautomation@gmail.com","pass":"YOUR_PASSWORD"}'   "$BACKEND_URL?action=login"

# Save product (with token)
TOKEN="<paste token>"
curl -s -X POST -H "Content-Type: application/json"   -d '{"token":"'"$TOKEN"'","id":"WA-01","name":"ESP32 Gate Opener","price":1499,"desc":"Wi‑Fi/Bluetooth unit"}'   "$BACKEND_URL?action=save_product"
```
