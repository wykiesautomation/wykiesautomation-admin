# Wykies Automation — Admin Site

**Purpose:** Single-page Admin dashboard for Products, Gallery, Payments, and Logs; passphrase login with roles (Admin/Viewer). Routes align to Apps Script endpoints and Google Sheets CMS.

## Files
- `index.html` — Dashboard SPA (Overview, Products, Gallery, Payments, Logs)
- `login.html` — Passphrase login (stores token in `localStorage`)
- `admin.css` — Dark slate theme + brand blue accents (**#2F76FF**)
- `admin.js` — Data loading, CRUD wiring, gallery DnD, payments resend
- `config/config.example.json` — Placeholders for `scriptUrl` & `sheetId`

## Configuration
Create `config/config.json` (not committed) with:
```json
{
  "scriptUrl": "https://script.google.com/macros/s/REPLACE_WITH_DEPLOYED_WEB_APP_ID/exec",
  "sheetId": "12qRMe6pAPVaQtosZBnhVtpMwyNks7W8uY9PX1mF620k"
}
```

## Notes
- Strict CSP is set in `<meta http-equiv="Content-Security-Policy">`.
- Secrets stay server-side (Apps Script Properties). Rate-limit resend via server.
- Matches Admin spec v1.0 and MasterSpec v5 (dark slate + Inter, tabs, role badge).