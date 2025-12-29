
# Wykies Automation — Admin Dashboard

Lightweight static admin panel that talks to Google Apps Script for authentication and CRUD on the Google Sheet CMS.

## Configure
1. Set `config.json` → `cms.appsScriptBase` to your Apps Script Web App URL.
2. In Apps Script, set Script Properties: `ADMIN_USER`, `ADMIN_PASS`, `ADMIN_EMAIL`, and `SHEET_ID`.
3. Deploy the Web App (access: Anyone).

## Features
- Login (basic token)
- Product upsert (SKU as key)
- Product table view
- Gallery endpoint placeholder
