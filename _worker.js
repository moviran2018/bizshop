// Cloudflare Worker — chatbot API for BizShop
// از هوش مصنوعی رایگان خود Cloudflare استفاده می‌کنه
// نیازی به کلید API خارجی نیست

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

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type" }
      });
    }

    if (request.method === "POST" && url.pathname === "/api/chat") {
      const { message, history } = await request.json();

      const systemMsg = {
        role: "system",
        content: `تو دستیار هوشمند فروشگاه بیزشاپ هستی.
با استفاده از اطلاعات زیر به سوالات مشتری پاسخ بده.
فقط از روی اطلاعات داده شده جواب بده.
اگه جواب در اطلاعات موجود نیست، بگو: "متاسفانه اطلاعات دقیقی ندارم. لطفاً شماره تماس خود را بگذارید تا کارشناسان ما با شما تماس بگیرند."
پاسخ‌هایت کوتاه، مفید و به زبان فارسی باشد.
محصولات را با قیمت و تخفیف معرفی کن.

${CONTEXT}`
      };

      const messages = [systemMsg];
      if (history) {
        for (const msg of history) {
          messages.push({ role: msg.role === "bot" ? "assistant" : "user", content: msg.text });
        }
      }
      messages.push({ role: "user", content: message });

      try {
        const reply = await env.AI.run("@cf/meta/llama-3.1-8b-instruct-fp8-fast", { messages });
        const text = reply?.response || "";

        return new Response(JSON.stringify({ reply: text }), {
          headers: { "Content-Type": "application/json" }
        });
      } catch (e) {
        return new Response(JSON.stringify({ reply: "⛔ " + (e.message || "خطا در پردازش") }), {
          headers: { "Content-Type": "application/json" }
        });
      }
    }

    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }
    return new Response("Not Found", { status: 404 });
  }
};
