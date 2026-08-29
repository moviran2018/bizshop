// App - Home & General 2.0
function openCart(){ document.getElementById('cartDrawer')?.classList.add('open'); renderCart(); }
function closeCart(){ document.getElementById('cartDrawer')?.classList.remove('open'); }
function toggleSearch(){ const s=document.getElementById('searchBar'); s.style.display=s.style.display==='none'?'block':'none'; if(s.style.display==='block') document.getElementById('searchInput')?.focus(); }
function toggleMobile(){ const n=document.getElementById('nav'); const isVis=n.style.display==='flex'; if(isVis){ n.style.display=''; n.removeAttribute('style'); } else { n.style.display='flex'; n.style.flexDirection='column'; n.style.position='absolute'; n.style.top='58px'; n.style.right='0'; n.style.left='0'; n.style.background='rgba(249,246,240,0.98)'; n.style.padding='18px'; n.style.borderBottom='1px solid var(--beige)'; n.style.backdropFilter='blur(12px)'; } }
function cardHTML(p){
  const img=(p.images && p.images[0])||'https://images.unsplash.com/photo-1594035910387-fea47794261f?w=700&q=80&auto=format&fit=crop';
  const badge=p.is_bestseller?'پرفروش':p.is_new?'جدید':p.is_featured?'برگزیده':'';
  const old=p.original_price?`<span class="old">${formatPrice(p.original_price)}</span>`:'';
  const cat=(p.category||'').toUpperCase();
  return `<a href="product.html?slug=${p.slug}" class="card">
    <div class="card-img"><img src="${img}" alt="${p.title}" loading="lazy">${badge?`<span class="card-badge">${badge}</span>`:''}<span class="card-quick">مشاهده و خرید →</span></div>
    <div class="card-body">
      <div class="card-cat">${cat}</div>
      <div class="card-title">${p.title}</div>
      <div class="card-gender">${p.gender==='man'?'مردانه':p.gender==='woman'?'زنانه':'یونیسکس'} • ${p.subtitle||''}</div>
      <div class="card-price"><span class="now">${formatPrice(p.price)}</span>${old}</div>
    </div>
  </a>`;
}
let currentSlide=0, sliderTimer=null, progressTimer=null;
function buildHeroSlider(products){
  const sliderProducts=products.slice(0,5);
  if(!sliderProducts.length) return;
  const slidesEl=document.getElementById('slides');
  const dotsEl=document.getElementById('sliderDots');
  if(!slidesEl) return;
  slidesEl.innerHTML=sliderProducts.map((p,i)=>`
    <div class="slide ${i===0?'active':''}" data-index="${i}">
      <img class="slide-bg" src="${(p.images&&p.images[0])||'https://images.unsplash.com/photo-1594035910387-fea47794261f?w=1920&q=85&auto=format&fit=crop'}" alt="${p.title}">
      <span class="slide-badge">${p.is_bestseller?'پرفروش':p.is_new?'جدید':'✦ ویژه'}</span>
      <div class="slide-inner">
        <div class="slide-text">
          <span class="slide-eyebrow en">${(p.category||'LUXE').toUpperCase()} COLLECTION</span>
          <div class="slide-title"><span class="en-title">${p.title}</span>${p.subtitle||''}</div>
          <span class="slide-sub">${p.gender==='man'?'مردانه':p.gender==='woman'?'زنانه':'یونیسکس'} • ${p.volume||'100ml'} • ${p.concentration||'Extrait'}</span>
          <p class="slide-desc">${p.description||''}</p>
          <div class="slide-price"><span>${formatPrice(p.price)}</span>${p.original_price?`<span class="old">${formatPrice(p.original_price)}</span>`:''}</div>
          <div class="slide-actions">
            <a href="product.html?slug=${p.slug}" class="btn btn-gold">مشاهده محصول ←</a>
            <button class="btn btn-outline">افزودن به سبد</button>
          </div>
        </div>
        <div class="slide-side" style="color:rgba(255,255,255,0.7);font-size:0.72rem;letter-spacing:0.14em;display:none" class="hide-mobile">${p.features?.[0]||'ماندگاری 14 ساعته • پخش بوی قوی'}</div>
      </div>
    </div>
  `).join('');
  if(dotsEl) dotsEl.innerHTML=sliderProducts.map((_,i)=>`<span class="slider-dot ${i===0?'active':''}" onclick="goToSlide(${i})"></span>`).join('');
  // fix add to cart button
  slidesEl.querySelectorAll('.slide').forEach((el,idx)=>{
    const btn=el.querySelector('.btn-outline');
    if(btn) btn.onclick=(e)=>{e.preventDefault(); Store.addToCart(sliderProducts[idx],1); renderCart(); openCart();};
  });
  startSlider();
  initSliderTouch();
}
function showSlide(idx){
  const slides=document.querySelectorAll('.slide');
  const dots=document.querySelectorAll('.slider-dot');
  if(!slides.length) return;
  currentSlide=(idx+slides.length)%slides.length;
  slides.forEach((s,i)=>s.classList.toggle('active', i===currentSlide));
  dots.forEach((d,i)=>d.classList.toggle('active', i===currentSlide));
  resetProgress();
}
function sliderNext(){ showSlide(currentSlide+1); }
function sliderPrev(){ showSlide(currentSlide-1); }
function goToSlide(i){ showSlide(i); }
function startSlider(){
  clearInterval(sliderTimer); clearInterval(progressTimer);
  sliderTimer=setInterval(()=>showSlide(currentSlide+1), 5000);
  resetProgress();
}
function resetProgress(){
  const bar=document.getElementById('progressBar');
  if(!bar) return;
  bar.style.transition='none'; bar.style.width='0';
  setTimeout(()=>{ bar.style.transition='width 5s linear'; bar.style.width='100%'; }, 30);
}
function initSliderTouch(){
  const el=document.getElementById('heroSlider');
  if(!el) return;
  let sx=0;
  el.addEventListener('touchstart',e=>sx=e.touches[0].clientX,{passive:true});
  el.addEventListener('touchend',e=>{
    const dx=e.changedTouches[0].clientX - sx;
    if(Math.abs(dx)>50) dx<0?sliderNext():sliderPrev();
  },{passive:true});
  el.addEventListener('mouseenter',()=>{clearInterval(sliderTimer); clearInterval(progressTimer)});
  el.addEventListener('mouseleave',startSlider);
}
async function renderHome(){
  const products=await Store.getProducts();
  buildHeroSlider(products);
  const featured=products.filter(p=>p.is_featured).slice(0,4);
  const news=products.filter(p=>p.is_new).slice(0,4);
  const fg=document.getElementById('featuredGrid');
  const ng=document.getElementById('newGrid');
  if(fg) fg.innerHTML=(featured.length?featured:products.slice(0,4)).map(cardHTML).join('');
  if(ng) ng.innerHTML=(news.length?news:products.slice(4,8)).map(cardHTML).join('');
  const cols=[
    {slug:'signature',title:'SIGNATURE',desc:'جاودانه و اصیل — وقار همیشگی',img:'https://images.unsplash.com/photo-1594035910387-fea47794261f?w=700&q=80&auto=format&fit=crop'},
    {slug:'floral',title:'FLORE',desc:'لطیف، زنانه و ظریف — شکوفه‌ها',img:'https://images.unsplash.com/photo-1590732596281-b8a5a22d8edb?w=700&q=80&auto=format&fit=crop'},
    {slug:'woody',title:'WOODY',desc:'گرم، عمیق و پیچیده — چوب‌ها',img:'https://images.unsplash.com/photo-1541643600914-78b084683601?w=700&q=80&auto=format&fit=crop'},
    {slug:'fresh',title:'FRESH',desc:'خنک، شفاف و نشاط‌آور',img:'https://images.unsplash.com/photo-1523293182086-7651a899d37f?w=700&q=80&auto=format&fit=crop'},
    {slug:'limited',title:'LIMITED',desc:'کمیاب، منحصراً برای تو',img:'https://images.unsplash.com/photo-1502185425727-3750737f0043?w=700&q=80&auto=format&fit=crop'},
  ];
  const cg=document.getElementById('collectionsGrid');
  if(cg) cg.innerHTML=cols.map(c=>`<a href="products.html?collection=${c.slug}" class="col-card"><img src="${c.img}" alt="${c.title}" loading="lazy"><div class="col-overlay"><h3>${c.title}</h3><p>${c.desc}</p></div></a>`).join('');
  const ig=document.getElementById('instaGrid');
  if(ig){ ig.innerHTML=Array.from({length:12}).map((_,i)=>`<div class="insta-item"><img src="https://picsum.photos/seed/luxe2_${i}/500/500" loading="lazy" alt="insta"></div>`).join(''); }
  updateCartBadge();
  const si=document.getElementById('searchInput');
  if(si) si.addEventListener('keydown',e=>{ if(e.key==='Enter') location.href=`products.html?q=${encodeURIComponent(si.value)}`; });
}
function renderCart(){
  const cart=Store.getCart();
  const body=document.getElementById('cartBody');
  const totalEl=document.getElementById('cartTotal');
  if(!body) return;
  if(!cart.length){ body.innerHTML='<p style="text-align:center;color:#999;padding:50px">سبد خالی است — یک رایحه انتخاب کن ✦</p>'; if(totalEl) totalEl.textContent='۰'; return; }
  body.innerHTML=cart.map(i=>`<div class="cart-item">
    <img src="${i.image}" alt="">
    <div><div style="font-weight:700;font-size:0.84rem">${i.title}</div><div style="color:var(--gray-500);font-size:0.77rem">${formatPrice(i.price)} × ${i.qty}</div>
    <div style="display:flex;gap:6px;margin-top:8px;align-items:center"><button onclick="changeQty('${i.id}',-1)" style="width:26px;height:26px;border:1px solid var(--beige);border-radius:50%;cursor:pointer;background:white">−</button><span style="min-width:20px;text-align:center;font-weight:700">${i.qty}</span><button onclick="changeQty('${i.id}',1)" style="width:26px;height:26px;border:1px solid var(--beige);border-radius:50%;cursor:pointer;background:white">+</button></div></div>
    <button onclick="removeFromCart('${i.id}')" style="background:none;border:none;color:#C00;cursor:pointer;font-size:1.2rem">×</button>
  </div>`).join('');
  const total=cart.reduce((s,i)=>s+i.price*i.qty,0);
  if(totalEl) totalEl.textContent=formatPrice(total);
}
function changeQty(id,delta){
  let c=Store.getCart(); const f=c.find(i=>i.id===id); if(!f) return; f.qty+=delta; if(f.qty<=0) c=c.filter(i=>i.id!==id); Store.saveCart(c); renderCart();
}
function removeFromCart(id){ let c=Store.getCart().filter(i=>i.id!==id); Store.saveCart(c); renderCart(); }
function checkout(){
  const cart=Store.getCart();
  if(!cart.length) return toast('سبد خالی است');
  const orders=JSON.parse(localStorage.getItem('luxe_orders')||'[]');
  orders.unshift({id:Date.now(),items:cart,total:cart.reduce((s,i)=>s+i.price*i.qty,0),date:new Date().toISOString()});
  localStorage.setItem('luxe_orders',JSON.stringify(orders));
  localStorage.removeItem('luxe_cart'); updateCartBadge(); renderCart(); toast('سفارش ثبت شد — به زودی تماس میگیریم ✓'); setTimeout(closeCart,900);
}
// 3D lightweight tilt + hero parallax (no heavy lib)
function init3D(){
  // card tilt
  document.addEventListener('mousemove', e=>{
    const cards=document.querySelectorAll('.card,.col-card');
    cards.forEach(card=>{
      const rect=card.getBoundingClientRect();
      const inView=e.clientX>=rect.left&&e.clientX<=rect.right&&e.clientY>=rect.top&&e.clientY<=rect.bottom;
      if(!inView){ card.style.transform=''; return; }
      const x=(e.clientX-rect.left)/rect.width -0.5;
      const y=(e.clientY-rect.top)/rect.height -0.5;
      const rx=(-y*8).toFixed(2), ry=(x*10).toFixed(2);
      card.style.transform=`perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg) translateZ(8px)`;
      card.classList.add('tilting');
    });
  });
  document.addEventListener('mouseleave', ()=>document.querySelectorAll('.card,.col-card').forEach(c=>{c.style.transform='';c.classList.remove('tilting')}), true);
  // hero parallax
  const heroBg=document.querySelector('.hero-bg');
  if(heroBg) window.addEventListener('scroll',()=>{
    const y=scrollY*0.18;
    heroBg.style.transform=`scale(1.02) translateY(${y}px)`;
  },{passive:true});
}
document.addEventListener('DOMContentLoaded', ()=>{ renderHome().then(init3D); });
