
# Wykies Automation Admin (Fixed SPA)

Single-page admin with hash-based tabs (Login, Products, Gallery, Dashboard).

## How to deploy
1. Upload all files in this folder to your GitHub repo (root of published branch).
2. Keep the `CNAME` file with `admin.wykiesautomation.co.za`.
3. In repo **Settings → Pages**, select the branch (e.g., `main`) and folder `/ (root)`.
4. Wait ~1 minute for Pages to rebuild.
5. Visit https://admin.wykiesautomation.co.za and hard refresh (Ctrl+F5 / Cmd+Shift+R).

## Notes
- The CSS includes a *global* pseudo-element override to stop duplicated hash text in the top-right nav.
  If you later want pseudo-elements for icons, replace the global rule with this scoped one:
  ```css
  .nav a::before, .nav a::after { content: "" !important; display: inline !important; }
  ```
- Wire your real backend by replacing the demo login & product handlers in `index.html` with your Apps Script / Flask JWT endpoints.
