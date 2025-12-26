
# Wykies Automation – Google Apps Script Backend (Token Enforced)

## Setup
1. Open https://script.google.com → New project → paste `Code.gs` and `2.gs` into the editor.
2. Set **Script Properties** (File → Project properties → Script properties):
   - `SHEET_ID` = `12qRMe6pAPVaQtosZBnhVtpMwyNks7W8uY9PX1mF620k`
   - `SECRET`   = run `printNewSecret()` and copy the suggested value
   - `ADMIN_EMAIL` = `wykiesautomation@gmail.com`
   - `ADMIN_PASS_SHA256` = run `printAdminPasswordHash()` after temporarily setting your password inside the function; copy the hex output
3. Deploy: **Deploy → New deployment → Web app**
   - Execute as: Me
   - Who has access: Anyone
   - Copy the Web App URL and paste it into `web/config.json` as `BACKEND_URL`.

## Endpoints
- `GET  ?action=ping` → health
- `GET  ?action=products` → list products (public)
- `GET  ?action=images` → list images (public)
- `GET  ?action=admin_status&token=...` → verify token
- `POST ?action=login` → {email, pass} → {token}
- `POST ?action=save_product` → {token, id, name, price, desc}
- `POST ?action=add_image` → {token, url, alt}
- `POST ?action=delete_product` → {token, id}
- `POST ?action=delete_image` → {token, url}

## Quick tests
```bash
WEB_APP_URL="https://script.google.com/macros/s/AKfycbx.../exec"

curl -s "$WEB_APP_URL?action=ping"

# Login
curl -s -X POST -H "Content-Type: application/json"   -d '{"email":"wykiesautomation@gmail.com","pass":"YOUR_PASSWORD"}'   "$WEB_APP_URL?action=login"

# Save (requires token)
TOKEN="<paste token>"
curl -s -X POST -H "Content-Type: application/json"   -d '{"token":"'"$TOKEN"'","id":"WA-01","name":"ESP32 Gate Opener","price":1499,"desc":"Wi‑Fi/Bluetooth unit"}'   "$WEB_APP_URL?action=save_product"
```
