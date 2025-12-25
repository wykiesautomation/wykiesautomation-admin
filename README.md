
# Wykies Automation — Admin Panel (SPA)

Ready-to-deploy skeleton for GitHub Pages under https://admin.wykiesautomation.co.za

## Deploy (manual)
1. Install dependencies: `npm install`
2. Deploy to GitHub Pages: `npm run deploy`

## Configure
- Update `public/config.json` with your Apps Script deployment URL.
- DNS: Create CNAME record `admin` -> `YOURUSERNAME.github.io`.
- GitHub: Settings -> Pages -> Source: `gh-pages` branch, root.

## Why 404.html?
GitHub Pages is static-only. `public/404.html` redirects unknown routes to `/` so SPA routing works (e.g., `/login`).
