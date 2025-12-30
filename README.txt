
Admin — Google Sign-In wired
Client ID: 291364861368-s24qqsvj6bik88452a0tabkp1d41qtv9.apps.googleusercontent.com

Deploy steps:
1) Push this folder to your `wykiesautomation-admin` repo (root).
2) GitHub Pages: Settings → Pages → Source = `main` (root).
3) DNS CNAME: admin.wykiesautomation.co.za → YOUR-USERNAME.github.io.
4) Apps Script: ensure your admin endpoints verify Authorization: Bearer <ID_TOKEN>.
   - If using JWK verification via Cloudflare Worker, set VERIFY_ENDPOINT Script Property.
