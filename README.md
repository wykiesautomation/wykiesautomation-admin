# Wykies Admin — Visual Wired + Analytics

Adds an **Analytics** tab with:
- 7‑day revenue, orders, and top product cards
- **Revenue by Day (30d)** line chart
- **Sales by Product (30d)** bar chart

## Expected endpoints
- `GET /api?path=analytics/summary-7d` → `{ revenue, orders, top }`
- `GET /api?path=analytics/revenue-daily` → `[{ date, revenue }]`
- `GET /api?path=analytics/top-products` → `[{ id|name, qty, revenue }]`

Charts are drawn on `<canvas>` without external libraries. If endpoints are empty, UI renders gracefully.

All previous features remain: GIS allowlist auth, Products (Edit/New/Hide), Price Log with CSV export, Payments resend, Pages, Settings, Audit.
