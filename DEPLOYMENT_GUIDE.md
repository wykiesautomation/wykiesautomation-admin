
# Wykies Automation — Admin Site Deployment Guide

**Last updated:** 2025-12-26 10:02

This guide covers publishing the admin panel to **GitHub Pages** at `admin.wykiesautomation.co.za` and wiring it to **Google Sheets** via **Apps Script**.

## 1) Repository & Pages
1. Create a repo, e.g. `wykiesautomation-admin`.
2. Commit the `admin/` folder to the repo root.
3. Enable **Settings → Pages → Deploy from a branch**.
4. Publish and test at `https://<username>.github.io/wykiesautomation-admin/`.

## 2) Custom Subdomain
- In Cloudflare DNS, create `admin` **CNAME** → `<username>.github.io`.
- Enable proxy, SSL/TLS **Full (strict)**, and WAF.

## 3) Authentication
- The demo uses a **passphrase** client-side for visibility only. Replace with **server-side authentication** (JWT) and store secrets in **Apps Script Properties** (or Workers/Pages env).

## 4) CMS API (Apps Script)
- Point `config.json` → `appsScriptWebAppUrl` to your deployed web app.
- Implement endpoints:
  - `saveProducts` → writes to the **Products** Sheet.
  - `getProducts` → returns JSON for the public site.
  - Optional: `resendInvoice` → emails the invoice again.

## 5) PayFast ITN
- Handle ITN in Apps Script or at the Cloudflare edge. Validate **signature**, **source IPs**, and **amounts** before fulfillment.

## 6) Security Hardening
- Add CSP, rate limiting, and avoid exposing secrets.
- Keep admin under `/admin` and disallow via `robots.txt` on the public site.

