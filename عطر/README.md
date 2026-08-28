# LUXÉ PARFUM — پروژه عطر لوکس ماژولار

سایت فارسی، ریسپانسیو، ماژولار با پنل ادمین حرفه‌ای + سوپابیس + دیپلوی Cloudflare Pages.

## ویژگی‌ها
- **بی‌نهایت محصول** — هر محصول لندینگ اختصاصی با:
  - گالری تصاویر نامحدود
  - متن غنی (HTML)
  - ویدیو (یوتیوب / MP4)
  - پادکست (MP3)
  - مدل سه‌بعدی (GLB/GLTF با model-viewer)
- پنل ادمین کامل (CRUD) در `admin/dashboard.html`
- فیلتر کالکشن/جنسیت/قیمت، جستجو، سبد خرید
- سوپابیس (اختیاری) — بدون آن هم با LocalStorage کامل کار میکند
- کاملا فارسی RTL + تم لوکس کرم/طلایی/مشکی عین luxeparfum.framer.website

## ساختار
```
عطر/
├── index.html          # لندینگ 11 سکشن
├── products.html       # لیست + فیلتر
├── product.html        # لندینگ اختصاصی هر محصول (?slug=...)
├── css/style.css       # تم لوکس
├── css/admin.css       # پنل ادمین
├── js/config.js        # سوپابیس کانفیگ
├── js/store.js         # دیتا لایر
├── js/app.js           # منطق عمومی
├── admin/login.html
├── admin/dashboard.html
├── supabase/schema.sql
└── _redirects
```

## راه‌اندازی لوکال
1. فولدر `عطر` را با Live Server یا `npx serve .` اجرا کن
2. به `admin/login.html` برو (هر ایمیل/رمز برای دمو)
3. محصول جدید بساز — تصاویر/ویدیو/پادکست/3D را پر کن

## اتصال سوپابیس
1. در supabase.com پروژه بساز
2. SQL Editor → محتوای `supabase/schema.sql` را اجرا کن
3. Storage → bucket `luxe-assets` (public) بساز
4. در پنل ادمین → تنظیمات → URL و Anon Key را وارد کن
5. یا در کنسول: `localStorage.setItem('SUPABASE_URL','...')`

## دیپلوی Cloudflare Pages (متصل به GitHub)
1. ریپو را به GitHub پوش کن (فولدر `عطر` را به عنوان root انتخاب کن یا کل bizshop)
2. Cloudflare Dashboard → Pages → Create → Connect to Git
3. Build preset: **None** — Build command: خالی — Output directory: `/` یا `عطر`
4. اگر سوپابیس داری، Env vars اضافه کن: `VITE_SUPABASE_URL` و `VITE_SUPABASE_ANON_KEY`
5. Deploy

## مدل سه‌بعدی
فایل `.glb` را در Supabase Storage آپلود کن و URL را در فیلد "مدل سه‌بعدی" وارد کن.
نمونه رایگان: https://modelviewer.dev/shared-assets/models/Astronaut.glb

—
ساخته شده با ✦ برای LUXÉ PARFUM
