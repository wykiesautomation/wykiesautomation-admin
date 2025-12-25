
# Wykies Automation — Admin (Cloudflare Pages)

This ZIP is ready for Cloudflare Pages. It includes:
- `public/index.html` (SPA entry)
- `_redirects` with `/* /public/index.html 200` for SPA routing
- `_headers` (basic security headers)
- `public/config.json` (set your Apps Script URL)
- `src/main.js` (placeholder router)
- `package.json` (Vite build)

## Deploy to Cloudflare Pages
1. Push this folder to a GitHub repo (e.g., `wykiesautomation-admin`).
2. In Cloudflare Dashboard → Pages → Create project → Connect to GitHub.
3. Select the repo.
4. Build settings:
   - Framework preset: **None** or **Vite**
   - Build command: `npm run build`
   - Build output directory: `dist`
5. Environment variables: none required.
6. Deploy. Cloudflare will auto-detect and serve the site.
7. Add custom domain: `admin.wykiesautomation.co.za` → Cloudflare will set DNS + SSL.

## Local build
```
npm install
npm run build
```
Output in `dist/`.

## Notes
- For SPA routing, Cloudflare Pages uses Netlify-compatible `_redirects` file.
- To add server-side functions, create `functions/` folder (not included here).
