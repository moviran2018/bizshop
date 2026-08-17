// Cloudflare Worker — BizShop API (chatbot + admin backend + data store)
// - چت‌بات: از هوش مصنوعی رایگان خود Cloudflare استفاده می‌کنه
// - مدیریت: API کامل برای پنل ادمین (محصولات، دسته‌ها، سفارش‌ها، تنظیمات، مشتریان)
// - ذخیره‌سازی: Cloudflare KV (سمت سرور)

const CONTEXT = `
# اطلاعات فروشگاه بیزشاپ

## اطلاعات کلی
- نام فروشگاه: بیزشاپ (BizShop)
- تلفن: 09123456789
- ایمیل: info@bizshop.ir
- آدرس: تهران، خیابان ولیعصر، مجتمع تجاری بیز
- ساعات کاری: ۹ صبح تا ۹ شب

## قوانین فروش
- هزینه ارسال: ۱۵۰,۰۰۰ تومان
- ارسال رایگان برای خریدهای بالای ۳,۰۰۰,۰۰۰ تومان
- ارسال به سراسر کشور - زمان ارسال: ۲۴ تا ۴۸ ساعت
- ۷ روز ضمانت بازگشت کالا
- پرداخت آنلاین و پرداخت در محل

## محصولات
### ۱. هدفون بلوتوث بیز - ۱,۲۸۰,۰۰۰ تومان (۲۲٪ تخفیف) - برند بیز
### ۲. مچ‌بند هوشمند بیز - ۸۹۰,۰۰۰ تومان (۱۹٪ تخفیف) - برند بیز
### ۳. شارژر بیسیم ۳ کاره - ۶۵۰,۰۰۰ تومان (۱۷٪ تخفیف) - برند بیز - پرفروش
### ۴. کیف لپ‌تاپ بیز - ۹۸۰,۰۰۰ تومان (۲۲٪ تخفیف) - برند بیز
### ۵. اسپیکر بلوتوث قابل حمل - ۷۵۰,۰۰۰ تومان (۱۸٪ تخفیف) - برند بیز
### ۶. ماوس گیمینگ RGB - ۵۲۰,۰۰۰ تومان (۲۰٪ تخفیف) - برند بیز - پرفروش
### ۷. کابل تایپ C سریع - ۹۸,۰۰۰ تومان (۲۷٪ تخفیف) - برند بیز
### ۸. محافظ صفحه نمایش شیشه‌ای - ۸۵,۰۰۰ تومان (۲۹٪ تخفیف) - برند بیز
### ۹. پاوربانک ۲۰۰۰۰mAh - ۸۹۰,۰۰۰ تومان (۱۹٪ تخفیف) - برند بیز
### ۱۰. هولدر گوشی ماشین - ۲۱۰,۰۰۰ تومان (۲۵٪ تخفیف) - برند بیز
### ۱۱. لپ‌تاپ ایسوس ZenBook 14 - ۲۸,۵۰۰,۰۰۰ تومان (۱۲٪ تخفیف) - برند ایسوس
### ۱۲. گوشی سامسونگ Galaxy S24 - ۳۸,۹۰۰,۰۰۰ تومان (۹٪ تخفیف) - برند سامسونگ
`;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization"
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...CORS }
  });
}

async function readBody(request) {
  try { return await request.json(); } catch { return {}; }
}

// ─── KV helpers ───
function kvKey(lang, col) { return `data:${lang}:${col}`; }

async function readCollection(env, request, lang, col, fallbackPath) {
  const raw = await env.bizshop_data.get(kvKey(lang, col));
  if (raw) {
    try { return JSON.parse(raw); } catch {}
  }
  // Fallback: seed from static JSON files
  try {
    const url = new URL(request.url);
    const res = await env.ASSETS.fetch(url.origin + fallbackPath);
    if (res.ok) {
      const data = await res.json();
      await env.bizshop_data.put(kvKey(lang, col), JSON.stringify(data));
      return data;
    }
  } catch {}
  return col === "products" ? [] : col === "categories" ? [] : col === "orders" ? [] : {};
}

async function writeCollection(env, lang, col, data) {
  await env.bizshop_data.put(kvKey(lang, col), JSON.stringify(data));
}

// ─── Admin auth ───
function getToken(request) {
  const h = request.headers.get("Authorization") || "";
  return h.replace(/^Bearer\s+/i, "").trim();
}

async function isAdmin(request, env) {
  const token = getToken(request);
  if (!token) return false;
  const stored = await env.bizshop_data.get("admin:token:" + token);
  if (!stored) return false;
  try {
    const { exp } = JSON.parse(stored);
    if (Date.now() > exp) { await env.bizshop_data.delete("admin:token:" + token); return false; }
    return true;
  } catch { return false; }
}

// ─── Routes ───
async function handleApi(request, env, url) {
  const method = request.method;
  const path = url.pathname;

  // OPTIONS
  if (method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });

  // ── Auth: login ──
  if (path === "/api/auth/login" && method === "POST") {
    const { password } = await readBody(request);
    const adminPassword = env.ADMIN_PASSWORD || "bizshop123";
    if (password !== adminPassword) return json({ error: "invalid_credentials" }, 401);
    const token = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
    const exp = Date.now() + 7 * 24 * 3600 * 1000; // 7 days
    await env.bizshop_data.put("admin:token:" + token, JSON.stringify({ exp }));
    return json({ token, exp });
  }

  // ── Auth: verify ──
  if (path === "/api/auth/check" && method === "GET") {
    return json({ ok: await isAdmin(request, env) });
  }

  // ── Public: get all storefront data (products, categories, settings) ──
  if (path === "/api/data" && method === "GET") {
    const lang = url.searchParams.get("lang") || "fa";
    const [products, categories, settings] = await Promise.all([
      readCollection(env, request, lang, "products", `/data/${lang}/products.json`),
      readCollection(env, request, lang, "categories", `/data/${lang}/categories.json`),
      readCollection(env, request, lang, "settings", `/data/${lang}/settings.json`)
    ]);
    return json({ products, categories, settings });
  }

  // ── Public: create order ──
  if (path === "/api/orders" && method === "POST") {
    const body = await readBody(request);
    const lang = body.lang || "fa";
    const orders = await readCollection(env, request, lang, "orders", `/data/${lang}/orders.json`);
    const now = new Date();
    const order = {
      id: Date.now(),
      code: "BZ" + Date.now().toString().slice(-6),
      date: now.toISOString(),
      status: "pending",
      ...body,
      items: body.items || [],
      customer: body.customer || {}
    };
    orders.unshift(order);
    await writeCollection(env, lang, "orders", orders);
    return json({ ok: true, order }, 201);
  }

  // ── Admin required below ──
  if (!(await isAdmin(request, env))) {
    return json({ error: "unauthorized" }, 401);
  }

  // ── Stats ──
  if (path === "/api/admin/stats" && method === "GET") {
    const lang = url.searchParams.get("lang") || "fa";
    const [products, orders, categories] = await Promise.all([
      readCollection(env, request, lang, "products", `/data/${lang}/products.json`),
      readCollection(env, request, lang, "orders", `/data/${lang}/orders.json`),
      readCollection(env, request, lang, "categories", `/data/${lang}/categories.json`)
    ]);
    const active = products.filter(p => p.status !== "deleted");
    const stats = {
      totalProducts: active.length,
      totalOrders: orders.length,
      pendingOrders: orders.filter(o => o.status === "pending").length,
      totalSales: orders.reduce((s, o) => s + (o.total || 0), 0),
      lowStock: active.filter(p => p.stock < 10).length,
      outOfStock: active.filter(p => p.stock <= 0).length,
      categories: categories.length,
      customers: new Set(orders.map(o => (o.customer && (o.customer.phone || o.customer.name)) || o.customer || '')).size,
      salesByDay: buildSalesByDay(orders)
    };
    return json(stats);
  }

  // ── Products CRUD ──
  if (path === "/api/admin/products") {
    const lang = url.searchParams.get("lang") || "fa";
    const products = await readCollection(env, request, lang, "products", `/data/${lang}/products.json`);
    if (method === "GET") return json(products);
    if (method === "POST") {
      const p = await readBody(request);
      p.id = Date.now();
      p.createdAt = p.createdAt || new Date().toISOString();
      products.unshift(p);
      await writeCollection(env, lang, "products", products);
      return json(p, 201);
    }
  }

  const productMatch = path.match(/^\/api\/admin\/products\/(\d+)$/);
  if (productMatch && (method === "PUT" || method === "DELETE")) {
    const lang = url.searchParams.get("lang") || "fa";
    const id = parseInt(productMatch[1]);
    const products = await readCollection(env, request, lang, "products", `/data/${lang}/products.json`);
    const idx = products.findIndex(p => p.id === id);
    if (idx === -1) return json({ error: "not_found" }, 404);
    if (method === "DELETE") {
      products.splice(idx, 1);
      await writeCollection(env, lang, "products", products);
      return json({ ok: true });
    }
    const updated = { ...products[idx], ...(await readBody(request)), id };
    products[idx] = updated;
    await writeCollection(env, lang, "products", products);
    return json(updated);
  }

  // ── Categories CRUD ──
  if (path === "/api/admin/categories") {
    const lang = url.searchParams.get("lang") || "fa";
    const categories = await readCollection(env, request, lang, "categories", `/data/${lang}/categories.json`);
    if (method === "GET") return json(categories);
    if (method === "POST") {
      const c = await readBody(request);
      c.id = c.id || Date.now();
      categories.push(c);
      await writeCollection(env, lang, "categories", categories);
      return json(c, 201);
    }
  }

  const catMatch = path.match(/^\/api\/admin\/categories\/(\d+)$/);
  if (catMatch && (method === "PUT" || method === "DELETE")) {
    const lang = url.searchParams.get("lang") || "fa";
    const id = parseInt(catMatch[1]);
    const categories = await readCollection(env, request, lang, "categories", `/data/${lang}/categories.json`);
    const idx = categories.findIndex(c => c.id === id);
    if (idx === -1) return json({ error: "not_found" }, 404);
    if (method === "DELETE") {
      categories.splice(idx, 1);
      await writeCollection(env, lang, "categories", categories);
      return json({ ok: true });
    }
    categories[idx] = { ...categories[idx], ...(await readBody(request)), id };
    await writeCollection(env, lang, "categories", categories);
    return json(categories[idx]);
  }

  // ── Orders ──
  if (path === "/api/admin/orders") {
    const lang = url.searchParams.get("lang") || "fa";
    const orders = await readCollection(env, request, lang, "orders", `/data/${lang}/orders.json`);
    if (method === "GET") return json(orders);
  }

  const orderMatch = path.match(/^\/api\/admin\/orders\/(\d+)\/status$/);
  if (orderMatch && method === "PUT") {
    const lang = url.searchParams.get("lang") || "fa";
    const id = parseInt(orderMatch[1]);
    const { status } = await readBody(request);
    const orders = await readCollection(env, request, lang, "orders", `/data/${lang}/orders.json`);
    const order = orders.find(o => o.id === id);
    if (!order) return json({ error: "not_found" }, 404);
    order.status = status;
    await writeCollection(env, lang, "orders", orders);
    return json(order);
  }

  const orderDelMatch = path.match(/^\/api\/admin\/orders\/(\d+)$/);
  if (orderDelMatch && method === "DELETE") {
    const lang = url.searchParams.get("lang") || "fa";
    const id = parseInt(orderDelMatch[1]);
    const orders = await readCollection(env, request, lang, "orders", `/data/${lang}/orders.json`);
    await writeCollection(env, lang, "orders", orders.filter(o => o.id !== id));
    return json({ ok: true });
  }

  // ── Settings ──
  if (path === "/api/admin/settings") {
    const lang = url.searchParams.get("lang") || "fa";
    const settings = await readCollection(env, request, lang, "settings", `/data/${lang}/settings.json`);
    if (method === "GET") return json(settings);
    if (method === "PUT") {
      const next = { ...settings, ...(await readBody(request)) };
      await writeCollection(env, lang, "settings", next);
      return json(next);
    }
  }

  // ── Customers (derived from orders) ──
  if (path === "/api/admin/customers" && method === "GET") {
    const lang = url.searchParams.get("lang") || "fa";
    const orders = await readCollection(env, request, lang, "orders", `/data/${lang}/orders.json`);
    const map = new Map();
    orders.forEach(o => {
      const c = o.customer || {};
      const key = c.phone || c.name || 'unknown';
      if (!map.has(key)) {
        map.set(key, { name: c.name || '---', phone: c.phone || '---', address: c.address || '', orders: 0, total: 0, lastOrder: o.date });
      }
      const rec = map.get(key);
      rec.orders += 1;
      rec.total += (o.total || 0);
      rec.lastOrder = o.date;
    });
    return json(Array.from(map.values()));
  }

  // ── Export / backup ──
  if (path === "/api/admin/export" && method === "GET") {
    const lang = url.searchParams.get("lang") || "fa";
    const [products, categories, settings, orders] = await Promise.all([
      readCollection(env, request, lang, "products", `/data/${lang}/products.json`),
      readCollection(env, request, lang, "categories", `/data/${lang}/categories.json`),
      readCollection(env, request, lang, "settings", `/data/${lang}/settings.json`),
      readCollection(env, request, lang, "orders", `/data/${lang}/orders.json`)
    ]);
    return json({ exportedAt: new Date().toISOString(), lang, products, categories, settings, orders });
  }

  // ── Import / restore ──
  if (path === "/api/admin/import" && method === "POST") {
    const lang = url.searchParams.get("lang") || "fa";
    const body = await readBody(request);
    if (body.products) await writeCollection(env, lang, "products", body.products);
    if (body.categories) await writeCollection(env, lang, "categories", body.categories);
    if (body.settings) await writeCollection(env, lang, "settings", body.settings);
    if (body.orders) await writeCollection(env, lang, "orders", body.orders);
    return json({ ok: true });
  }

  return json({ error: "not_found" }, 404);
}

function buildSalesByDay(orders) {
  const map = {};
  orders.forEach(o => {
    const d = (o.date || "").slice(0, 10);
    if (!d) return;
    map[d] = (map[d] || 0) + (o.total || 0);
  });
  return Object.entries(map)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-14)
    .map(([date, total]) => ({ date, total }));
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname.startsWith("/api/")) {
      try {
        return await handleApi(request, env, url);
      } catch (e) {
        return json({ error: e.message || "server_error" }, 500);
      }
    }

    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }
    return new Response("Not Found", { status: 404 });
  }
};
