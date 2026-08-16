const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = 3000;
const ROOT = __dirname;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml",
  ".pdf": "application/pdf",
};

const CONTEXT_FILE = path.join(ROOT, "data", "chatbot-context.md");
const DEEPSEEK_API_KEY = process.env.deepseek_api_key || process.env.DEEPSEEK_API_KEY || "";

function tryFile(basePath) {
  if (fs.existsSync(basePath)) {
    const stat = fs.statSync(basePath);
    if (stat.isDirectory()) {
      for (const name of ["index.html", "login.html", "dashboard.html"]) {
        const joined = path.join(basePath, name);
        if (fs.existsSync(joined)) return joined;
      }
      return null;
    }
    return basePath;
  }
  const withHtml = basePath + ".html";
  if (fs.existsSync(withHtml)) return withHtml;
  return null;
}

function getBody(req) {
  return new Promise((resolve) => {
    let data = "";
    req.on("data", (c) => (data += c));
    req.on("end", () => {
      try { resolve(JSON.parse(data)); } catch { resolve({}); }
    });
  });
}

async function chatWithAI(messages, context) {
  if (!DEEPSEEK_API_KEY) {
    return "⚠️ سرویس هوش مصنوعی پیکربندی نشده. لطفاً کلید API را تنظیم کنید.";
  }

  const systemMsg = {
    role: "system",
    content: `تو دستیار هوشمند فروشگاه بیزشاپ هستی.
با استفاده از اطلاعات زیر به سوالات مشتری پاسخ بده.
فقط از روی اطلاعات داده شده جواب بده.
اگه جواب در اطلاعات موجود نیست، بگو: "متاسفانه اطلاعات دقیقی ندارم. لطفاً شماره تماس خود را بگذارید تا کارشناسان ما با شما تماس بگیرند."
پاسخ‌هایت کوتاه، مفید و به زبان فارسی باشد.
محصولات را با قیمت و تخفیف معرفی کن.
اگه کاربر محصولی خواست، لینک آن را هم بگو.

${context}`
  };

  const chatMessages = [systemMsg];
  for (const msg of messages) {
    chatMessages.push({ role: msg.role === "bot" ? "assistant" : "user", content: msg.text });
  }

  const body = JSON.stringify({
    model: "deepseek-chat",
    messages: chatMessages,
    max_tokens: 1024
  });

  try {
    const resp = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + DEEPSEEK_API_KEY },
      body
    });
    const data = await resp.json();
    const text = data?.choices?.[0]?.message?.content;
    if (text) return text;
    return "⚠️ " + JSON.stringify(data?.error || data);
  } catch (e) {
    return "⛔ خطا در ارتباط با سرور هوش مصنوعی: " + e.message;
  }
}

http.createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    return res.end();
  }

  if (req.method === "POST" && req.url === "/api/chat") {
    const { message, history } = await getBody(req);
    const context = fs.existsSync(CONTEXT_FILE)
      ? fs.readFileSync(CONTEXT_FILE, "utf8")
      : "فروشگاه بیزشاپ";
    const messages = [...(history || []), { role: "user", text: message }];
    const reply = await chatWithAI(messages, context);
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    return res.end(JSON.stringify({ reply }));
  }

  let url = req.url.split("?")[0].replace(/\/$/, "") || "/";
  let filePath = path.join(ROOT, url === "/" ? "index.html" : url);
  let found = tryFile(filePath);

  if (!found) {
    res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
    return res.end("<h1>404 Not Found</h1>");
  }

  const ext = path.extname(found);
  const contentType = MIME[ext] || "application/octet-stream";
  const content = fs.readFileSync(found);
  res.writeHead(200, { "Content-Type": contentType });
  res.end(content);
}).listen(PORT, "0.0.0.0", () => {
  console.log(`BizShop running at http://localhost:${PORT}`);
  if (!DEEPSEEK_API_KEY) console.log("⚠️  deepseek_api_key not set — chatbot won't work.");
});
