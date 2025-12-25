# Wykies Automation — Admin (Cloudflare Pages, Prefilled API)

API endpoint used:
```
https://script.google.com/macros/s/AKfycbynudewxl8FUOILFPOva_fKpYtZDugzSQRNPASt0G1xix4HZ0jiAjZc3a45KaHpZG5g/exec
```

## Deploy to Cloudflare Pages
1. Push this folder to a GitHub repo.
2. Cloudflare Dashboard → Pages → Create project → Connect to GitHub → select repo.
3. Build settings:
   - Framework preset: **Vite** (or None)
   - Build command: `npm run build`
   - Build output directory: `dist`
4. Add custom domain: `admin.wykiesautomation.co.za`.

## Local build
```
npm install
npm run build
```

## Notes
- SPA routing handled by `_redirects`: `/* /public/index.html 200`.
- Products page tries GET `https://script.google.com/macros/s/AKfycbynudewxl8FUOILFPOva_fKpYtZDugzSQRNPASt0G1xix4HZ0jiAjZc3a45KaHpZG5g/exec/products` and shows results.
- Login posts to `https://script.google.com/macros/s/AKfycbynudewxl8FUOILFPOva_fKpYtZDugzSQRNPASt0G1xix4HZ0jiAjZc3a45KaHpZG5g/exec/auth` with `{ passphrase }` and stores `token`.
- If your Apps Script returns different shapes/paths, adjust `src/main.js` accordingly.
