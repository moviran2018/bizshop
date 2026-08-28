// App - Home & General
function openCart(){ document.getElementById('cartDrawer')?.classList.add('open'); renderCart(); }
function closeCart(){ document.getElementById('cartDrawer')?.classList.remove('open'); }
function toggleSearch(){ const s=document.getElementById('searchBar'); s.style.display=s.style.display==='none'?'block':'none'; if(s.style.display==='block') document.getElementById('searchInput')?.focus(); }
function toggleMobile(){ const n=document.getElementById('nav'); n.style.display=n.style.display==='flex'?'none':'flex'; n.style.flexDirection='column'; n.style.position='absolute'; n.style.top='64px'; n.style.right='0'; n.style.left='0'; n.style.background='var(--cream)'; n.style.padding='18px'; n.style.borderBottom='1px solid var(--beige)'; }

function cardHTML(p){
  const img=(p.images && p.images[0])||'https://images.unsplash.com/photo-1594035910387-fea47794261f?w=600';
  const badge=p.is_bestseller?'پرفروش':p.is_new?'جدید':'';
  const old=p.original_price?`<span class="old">${formatPrice(p.original_price)}</span>`:'';
  return `<a href="product.html?slug=${p.slug}" class="card">
    <div class="card-img"><img src="${img}" alt="${p.title}" loading="lazy">${badge?`<span class="card-badge">${badge}</span>`:''}</div>
    <div class="card-body">
      <div class="card-cat">${p.category?.toUpperCase()||''}</div>
      <div class="card-title">${p.title}</div>
      <div class="card-gender">${p.gender==='man'?'مردانه':p.gender==='woman'?'زنانه':'یونیسکس'} • ${p.subtitle||''}</div>
      <div class="card-price"><span class="now">${formatPrice(p.price)}</span>${old}</div>
    </div>
  </a>`;
}

async function renderHome(){
  const products=await Store.getProducts();
  const featured=products.filter(p=>p.is_featured).slice(0,4);
  const news=products.filter(p=>p.is_new).slice(0,4);
  const fg=document.getElementById('featuredGrid');
  const ng=document.getElementById('newGrid');
  if(fg) fg.innerHTML=featured.map(cardHTML).join('')||products.slice(0,4).map(cardHTML).join('');
  if(ng) ng.innerHTML=news.map(cardHTML).join('')||products.slice(4,8).map(cardHTML).join('');
  // collections
  const cols=[
    {slug:'signature',title:'SIGNATURE',desc:'جاودانه و اصیل',img:'https://images.unsplash.com/photo-1594035910387-fea47794261f?w=600'},
    {slug:'floral',title:'FLORE',desc:'لطیف و زنانه',img:'https://images.unsplash.com/photo-1590732596281-b8a5a22d8edb?w=600'},
    {slug:'woody',title:'WOODY',desc:'گرم و عمیق',img:'https://images.unsplash.com/photo-1541643600914-78b084683601?w=600'},
    {slug:'fresh',title:'FRESH',desc:'خنک و شفاف',img:'https://images.unsplash.com/photo-1523293182086-7651a899d37f?w=600'},
    {slug:'limited',title:'LIMITED',desc:'کمیاب و خاص',img:'https://images.unsplash.com/photo-1502185425727-3750737f0043?w=600'},
  ];
  const cg=document.getElementById('collectionsGrid');
  if(cg) cg.innerHTML=cols.map(c=>`<a href="products.html?collection=${c.slug}" class="col-card"><img src="${c.img}"><div class="col-overlay"><h3>${c.title}</h3><p>${c.desc}</p></div></a>`).join('');
  // insta
  const ig=document.getElementById('instaGrid');
  if(ig){ ig.innerHTML=Array.from({length:12}).map((_,i)=>`<div class="insta-item"><img src="https://picsum.photos/seed/luxe${i}/400/400" loading="lazy"></div>`).join(''); }
  updateCartBadge();
  // search
  const si=document.getElementById('searchInput');
  if(si) si.addEventListener('keydown',e=>{ if(e.key==='Enter') location.href=`products.html?q=${encodeURIComponent(si.value)}`; });
}

function renderCart(){
  const cart=Store.getCart();
  const body=document.getElementById('cartBody');
  const totalEl=document.getElementById('cartTotal');
  if(!body) return;
  if(!cart.length){ body.innerHTML='<p style="text-align:center;color:#888;padding:40px">سبد خالی است</p>'; if(totalEl) totalEl.textContent='۰'; return; }
  body.innerHTML=cart.map(i=>`<div class="cart-item">
    <img src="${i.image}">
    <div><div style="font-weight:700;font-size:0.85rem">${i.title}</div><div style="color:var(--gray-500);font-size:0.78rem">${formatPrice(i.price)} × ${i.qty}</div>
    <div style="display:flex;gap:6px;margin-top:6px"><button onclick="changeQty('${i.id}',-1)" style="width:26px;height:26px;border:1px solid var(--beige);border-radius:50%;cursor:pointer">−</button><span style="min-width:20px;text-align:center">${i.qty}</span><button onclick="changeQty('${i.id}',1)" style="width:26px;height:26px;border:1px solid var(--beige);border-radius:50%;cursor:pointer">+</button></div></div>
    <button onclick="removeFromCart('${i.id}')" style="background:none;border:none;color:#C00;cursor:pointer">×</button>
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
  // برای دمو: ذخیره سفارش در localStorage
  const orders=JSON.parse(localStorage.getItem('luxe_orders')||'[]');
  orders.unshift({id:Date.now(),items:cart,total:cart.reduce((s,i)=>s+i.price*i.qty,0),date:new Date().toISOString()});
  localStorage.setItem('luxe_orders',JSON.stringify(orders));
  localStorage.removeItem('luxe_cart'); updateCartBadge(); renderCart(); toast('سفارش ثبت شد — به زودی تماس میگیریم ✓'); setTimeout(closeCart,800);
}

document.addEventListener('DOMContentLoaded', renderHome);
