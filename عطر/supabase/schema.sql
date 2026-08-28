-- LUXÉ Parfum - Supabase Schema
-- اجرا در Supabase SQL Editor

-- Enable UUID
create extension if not exists "uuid-ossp";

-- ================= PRODUCTS =================
create table if not exists products (
  id uuid primary key default uuid_generate_v4(),
  slug text unique not null,
  title text not null,
  subtitle text,
  brand text default 'LUXÉ PARFUM',
  category text not null check (category in ('signature','floral','woody','fresh','limited')),
  gender text not null check (gender in ('man','woman','unisex')),
  price bigint not null,
  original_price bigint,
  stock int default 100,
  description text,
  long_description text, -- HTML rich text
  images jsonb default '[]'::jsonb, -- ["url1","url2",...]
  video_url text, -- youtube / mp4
  video_type text default 'youtube' check (video_type in ('youtube','mp4','none')),
  audio_url text, -- podcast mp3
  audio_title text,
  model_3d_url text, -- .glb / .gltf
  features jsonb default '[]'::jsonb, -- ["ماندگاری 12 ساعته",...]
  notes_top text,
  notes_middle text,
  notes_base text,
  volume text default '100ml',
  concentration text default 'Extrait de Parfum',
  is_featured boolean default false,
  is_new boolean default false,
  is_bestseller boolean default false,
  is_active boolean default true,
  views int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ================= COLLECTIONS =================
create table if not exists collections (
  id uuid primary key default uuid_generate_v4(),
  slug text unique not null,
  title text not null,
  description text,
  image text,
  color text,
  created_at timestamptz default now()
);

-- ================= ORDERS =================
create table if not exists orders (
  id uuid primary key default uuid_generate_v4(),
  customer_name text not null,
  customer_phone text not null,
  customer_address text not null,
  items jsonb not null, -- [{product_id, title, qty, price}]
  total bigint not null,
  status text default 'pending' check (status in ('pending','paid','shipped','delivered','cancelled')),
  created_at timestamptz default now()
);

-- ================= SETTINGS (hero, features, etc) =================
create table if not exists settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz default now()
);

-- ================= JOURNAL =================
create table if not exists journals (
  id uuid primary key default uuid_generate_v4(),
  slug text unique not null,
  title text not null,
  excerpt text,
  content text,
  image text,
  author text,
  created_at timestamptz default now()
);

-- Enable RLS
alter table products enable row level security;
alter table collections enable row level security;
alter table orders enable row level security;
alter table settings enable row level security;
alter table journals enable row level security;

-- Public read, only authenticated write (admin)
create policy "public read products" on products for select using (true);
create policy "auth write products" on products for all using (auth.role() = 'authenticated');

create policy "public read collections" on collections for select using (true);
create policy "auth write collections" on collections for all using (auth.role() = 'authenticated');

create policy "public read journals" on journals for select using (true);
create policy "auth write journals" on journals for all using (auth.role() = 'authenticated');

create policy "public read settings" on settings for select using (true);
create policy "auth write settings" on settings for all using (auth.role() = 'authenticated');

create policy "auth read orders" on orders for select using (auth.role() = 'authenticated');
create policy "public insert orders" on orders for insert with check (true);
create policy "auth update orders" on orders for update using (auth.role() = 'authenticated');

-- Storage bucket for images/videos/3d/audio
-- از داشبورد Supabase بسازید: Storage > Create bucket > name: luxe-assets (public)

-- Seed collections
insert into collections (slug, title, description, image, color) values
('signature','SIGNATURE','رایحه‌های جاودانه که اصالت را تعریف می‌کنند.','https://images.unsplash.com/photo-1594035910387-fea47794261f?w=600','beige'),
('floral','FLORE','شکوفه‌های لطیف، زنانه و ظریف.','https://images.unsplash.com/photo-1595425959632-34f2822322ce?w=600','pink'),
('woody','WOODY','چوب‌های گرم، عمیق و پیچیده.','https://images.unsplash.com/photo-1541643600914-78b084683601?w=600','brown'),
('fresh','FRESH','رایحه‌های خنک، تمیز و نشاط‌آور.','https://images.unsplash.com/photo-1523293182086-7651a899d37f?w=600','light'),
('limited','LIMITED','خلق‌های کمیاب، منحصراً برای شما.','https://images.unsplash.com/photo-1502185425727-3750737f0043?w=600','gold')
on conflict (slug) do nothing;

-- Sample products (8)
insert into products (slug, title, subtitle, category, gender, price, original_price, description, images, video_url, audio_url, model_3d_url, features, is_featured, is_bestseller, is_new) values
('ambre-supreme','AMBRE SUPRÊME','گرم و اغواگر','signature','man',4850000,5200000,'ترکیبی از عنبر ناب، وانیل ماداگاسکار و چوب صندل. ماندگاری 14 ساعته با پخش بوی بی‌نظیر.','["https://images.unsplash.com/photo-1594035910387-fea47794261f?w=800","https://images.unsplash.com/photo-1541643600914-78b084683601?w=800"]','https://www.youtube.com/embed/ScMzIvxBSi4','https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3','https://modelviewer.dev/shared-assets/models/Astronaut.glb','["ماندگاری 14 ساعته","پخش بوی قوی","شیشه کریستال دست‌ساز"]',true,true,false),
('bois-noble','BOIS NOBLE','عمیق و اصیل','woody','unisex',4200000,null,'چوب سدر اطلس، عود کامبوج و مشک سفید.','["https://images.unsplash.com/photo-1595425959632-34f2822322ce?w=800"]',null,null,null,'["ترکیب چوبی-شرقی","مناسب چهار فصل"]',true,false,true),
('agrumes-aurore','AGRUMES AURORE','درخشان و مرکباتی','fresh','unisex',3900000,null,'پرتقال خونی سیسیل، ترنج و شکوفه پرتقال.','["https://images.unsplash.com/photo-1523293182086-7651a899d37f?w=800"]',null,null,null,'["شروع مرکباتی","قلب گلی"]',true,false,false),
('rose-supreme','ROSE SUPRÊME','رمانتیک و مخملی','floral','woman',5100000,5800000,'رز بلغاری، عود و زعفران.','["https://images.unsplash.com/photo-1594035910387-fea47794261f?w=800"]',null,null,null,'["رز ارگانیک","ماندگاری بالا"]',false,true,false),
('edition-or','ÉDITION OR','کمیاب و مجلل','limited','man',8900000,null,'نسخه محدود با طلای 24 عیار در ترکیب.','["https://images.unsplash.com/photo-1502185425727-3750737f0043?w=800"]',null,null,null,'["نسخه لیمیتد 500 عددی","جعبه چوبی"]',false,false,true)
on conflict (slug) do nothing;
