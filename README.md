# Wykies Automation Admin Panel

This is the admin panel for Wykies Automation.

## Deployment
- Push these files to your GitHub repo named `admin` (or any name).
- Enable GitHub Pages in Settings → Pages → Source: `main` → `/ (root)`.
- Set custom domain to `admin.wykiesautomation.co.za`.

## DNS
- In Cloudflare, add CNAME:
  Name: admin
  Target: <your-github-username>.github.io
  Proxy: ON

## Notes
- Passphrase login is client-side for demo; move to server-side for production.
- Wire API calls to Google Apps Script for live updates.
