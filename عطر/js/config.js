// LUXÉ PARFUM - Config
// برای اتصال به سوپابیس، مقادیر را در localStorage یا .env پر کنید
// بدون سوپابیس هم فروشگاه با دیتای نمونه (fallback) کامل کار میکند

const SUPABASE_URL = localStorage.getItem('SUPABASE_URL') || '';
const SUPABASE_ANON_KEY = localStorage.getItem('SUPABASE_ANON_KEY') || '';

let supabaseClient = null;
if (SUPABASE_URL && SUPABASE_ANON_KEY && window.supabase) {
  supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  console.log('Supabase connected');
} else {
  console.log('Supabase not configured — using local/demo data');
}

// Helper
function formatPrice(n){
  return new Intl.NumberFormat('fa-IR').format(n) + ' تومان';
}
function toast(msg){
  const t=document.getElementById('toast');
  if(!t) return;
  t.textContent=msg; t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'),2500);
}
