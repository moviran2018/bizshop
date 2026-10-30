# PROJECT_MAP — bizshop (root)

Run: start-server.bat (local) | Cloudflare Pages (bizshop.pages.dev)
Deploy: wrangler.toml, pages_build_output_dir = "." — Pages + Functions (_worker.js)
Data: Cloudflare KV bizshop_data — keys `data:{lang}:{col}` (products/categories/orders/settings)
AI: binding AI (Cloudflare Workers AI, free 10k neurons/day)

Routes (API, _worker.js):
- GET  /api/data?lang=fa|en|ar          (storefront bundle)
- POST /api/orders                        (create order)
- POST /api/auth/login                    (ADMIN_PASSWORD, token 7d in KV)
- GET  /api/auth/check
- GET  /api/admin/stats?lang=
- CRUD /api/admin/products, /api/admin/categories (/api/admin/orders, /settings, /customers, /export, /import

Frontend (static, lang/ 3 langs): index, products, product, cart, checkout, admin/login, admin/dashboard
JS: main.js, data.js, chatbot.js (AI chat), admin.js/admin-core.js, i18n.js, viewer3d.js
Modules: js/modules/registry.js (window.BizModules) + shipping-pill.js (demo) — add new widget = new file + push into registry
Lang: lang/{fa,en,ar}.json + data/{fa,en,ar}/*.json seed
Sub-projects (moved out 2026-10-30, now siblings of this repo):
- ../restaurant/          static restaurant site
- ../real-estate-3d/      static 3D real-estate demo
- ../عطر/                 perfume storefront
- ../dreamwell/           Next.js app (was data/dreamwell)
- ../dreamwell-static/    static site, own git repo (was data/dreamwell-static)
- ../soda/                single-page demo
This repo now contains only the bizshop storefront.
Notes:
- Admin password is read from the ADMIN_PASSWORD environment variable (set it as a
  Cloudflare Pages secret, e.g. `npx wrangler pages secret put ADMIN_PASSWORD`).
  Do not commit credentials to this file or to the repository.
- .wrangler/cache/pages.json says project "atr" (stale?) — deployed site is bizshop.pages.dev
- _products_debug.json at root — scratch file
- No test suite present. No build step (static).
