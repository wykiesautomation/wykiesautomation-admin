Wykies Automation — Admin (GitHub Pages)
----------------------------------------
Files:
 - index.html  (Final SPA with drag-and-drop reordering)
 - CNAME       (custom domain binding)

Deploy:
 1) Commit these files to the ROOT of main in your admin repo.
 2) Settings → Pages: Source = Deploy from a branch; Branch = main; Folder = /(root).
 3) Custom domain: admin.wykiesautomation.co.za (Enforce HTTPS).
 4) In index.html set CONFIG.fallbackAppsScript to your Apps Script Web App URL (…/exec)
    until your Cloudflare Worker /api route is live; then set it back to null.
