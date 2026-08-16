const UI = {
  toast(msg, type = 'success', duration = 3000) {
    const container = document.querySelector('.toast-container');
    if (!container) return;
    const icons = { success: '✅', error: '❌', warning: '⚠️' };
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span class="toast-icon">${icons[type] || '✅'}</span><span class="toast-msg">${msg}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100px)';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  },

  modal(title, content) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay active';
    overlay.innerHTML = `
      <div class="modal">
        <div class="modal-header">
          <h3>${title}</h3>
          <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">&times;</button>
        </div>
        <div class="modal-body">${content}</div>
      </div>`;
    document.body.appendChild(overlay);
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
  }
};

document.addEventListener('DOMContentLoaded', async () => {
  await I18n.init();

  function updateLangSwitcher() {
    document.querySelectorAll('.lang-dropdown').forEach(dd => {
      let anyVisible = false;
      dd.querySelectorAll('.lang-option').forEach(opt => {
        const code = opt.dataset.lang;
        const enabled = DB.isLangEnabled(code);
        opt.style.display = enabled ? '' : 'none';
        opt.classList.toggle('active', code === I18n.lang);
        if (enabled) anyVisible = true;
      });
      dd.style.display = anyVisible ? '' : 'none';
    });
  }
  updateLangSwitcher();
  document.addEventListener('langchange', updateLangSwitcher);

  document.addEventListener('click', e => {
    if (!e.target.closest('.lang-dropdown')) {
      document.querySelectorAll('.lang-dropdown.open').forEach(d => d.classList.remove('open'));
    }
  });

  if (document.querySelector('.product-detail')) {
    window.addEventListener('dbready', initProductDetail);
  }

  await DB.init();

  initTopBar();
  initNavigation();
  initHeroSlider();
  initMobileMenu();
  initBackToTop();
  initSearch();
  DB._updateCartBadge();

  if (document.querySelector('.featured-products-grid')) {
    renderProducts(DB.getFeaturedProducts(), '.featured-products-grid');
  }
  if (document.querySelector('.new-products-grid')) {
    renderProducts(DB.getNewProducts(), '.new-products-grid');
  }
  if (document.querySelector('.bestsellers-grid')) {
    renderProducts(DB.getBestSellers(), '.bestsellers-grid');
  }

  if (document.querySelector('.categories-grid')) {
    renderCategories();
  }
  if (document.querySelector('.features-bar')) {
    renderFeatures();
  }
  if (document.querySelector('.category-banners')) {
    renderBanners();
  }
  if (document.querySelector('.products-grid')) {
    initProductsPage();
  }
  if (document.querySelector('.cart-items')) {
    initCartPage();
  }
  if (document.querySelector('.checkout-form')) {
    initCheckoutPage();
  }
  if (document.querySelector('.admin-content') || document.getElementById('adminContent') || document.getElementById('adminLoginForm')) {
    await initAdminPanel();
  }
  if (document.querySelector('.chatbot-window')) {
    initChatbot();
  }
});

function initNavigation() {
  const header = document.querySelector('header');
  window.addEventListener('scroll', () => {
    header.classList.toggle('scrolled', window.scrollY > 50);
  });

  const currentPath = window.location.pathname;
  document.querySelectorAll('.nav-list a').forEach(a => {
    if (a.getAttribute('href') === currentPath.split('/').pop() || 
        (a.getAttribute('href') === '/' && currentPath.endsWith('index.html'))) {
      a.classList.add('active');
    }
  });
}

function initHeroSlider() {
  const slider = document.getElementById('heroSlider');
  if (!slider) return;

  const s = DB.getSettings();
  let slidesData = (s.heroSlider || []).length ? s.heroSlider : [
    { title: __('hero.default1.title'), subtitle: __('hero.default1.sub'), btnText: __('hero.default1.btn'), btnLink: 'products.html?sort=discount', image: 'https://picsum.photos/seed/bizslide1/1600/600', pinned: false },
    { title: __('hero.default2.title'), subtitle: __('hero.default2.sub'), btnText: __('hero.default2.btn'), btnLink: 'products.html?brand=بیز', image: 'https://picsum.photos/seed/bizslide2/1600/600', pinned: false },
    { title: __('hero.default3.title'), subtitle: __('hero.default3.sub'), btnText: __('hero.default3.btn'), btnLink: 'products.html', image: 'https://picsum.photos/seed/bizslide3/1600/600', pinned: false },
    { title: __('hero.default4.title'), subtitle: __('hero.default4.sub'), btnText: __('hero.default4.btn'), btnLink: 'products.html?category=الکترونیک', image: 'https://picsum.photos/seed/bizslide4/1600/600', pinned: false }
  ];

  const pinnedSlides = slidesData.filter(s => s.pinned);
  const isSlideshow = DB.getSettings().slideshowEnabled !== false;
  const displaySlides = (pinnedSlides.length > 0) ? pinnedSlides : slidesData;

  slider.innerHTML = displaySlides.map((slide, i) => `
    <div class="hero-slide${i === 0 ? ' active' : ''}">
      <img class="slide-bg" src="${slide.image || 'https://picsum.photos/seed/default/1600/600'}" alt="${slide.title || ''}">
      <div class="slide-overlay"></div>
      <div class="slide-content">
        <h1>${slide.title || ''}</h1>
        <p>${slide.subtitle || ''}</p>
        ${slide.btnText && slide.btnLink ? `<a href="${slide.btnLink}" class="btn btn-primary">${slide.btnText}</a>` : ''}
      </div>
    </div>
  `).join('');

  if (displaySlides.length > 1) {
    slider.insertAdjacentHTML('beforeend', `
      <button class="hero-arrow prev">❮</button>
      <button class="hero-arrow next">❯</button>
      ${isSlideshow ? `<div class="hero-nav">${displaySlides.map((_, i) => `<div class="hero-dot${i === 0 ? ' active' : ''}" data-index="${i}"></div>`).join('')}</div>` : ''}
    `);

    const slides = slider.querySelectorAll('.hero-slide');
    const dots = slider.querySelectorAll('.hero-dot');
    const prev = slider.querySelector('.hero-arrow.prev');
    const next = slider.querySelector('.hero-arrow.next');
    let current = 0;
    let interval;

    function goTo(idx) {
      slides.forEach((s, i) => s.classList.toggle('active', i === idx));
      dots.forEach((d, i) => d.classList.toggle('active', i === idx));
      current = idx;
    }

    function nextSlide() { goTo((current + 1) % slides.length); }
    function prevSlide() { goTo((current - 1 + slides.length) % slides.length); }

    if (prev) prev.addEventListener('click', prevSlide);
    if (next) next.addEventListener('click', nextSlide);
    dots.forEach(d => d.addEventListener('click', () => goTo(parseInt(d.dataset.index))));

    function startAuto() { interval = setInterval(nextSlide, 5000); }
    function stopAuto() { clearInterval(interval); }
    if (isSlideshow && slides.length > 1) { startAuto(); slider.addEventListener('mouseenter', stopAuto); slider.addEventListener('mouseleave', startAuto); }
  }
}

function initMobileMenu() {
  const toggle = document.querySelector('.mobile-toggle');
  const menu = document.querySelector('.mobile-menu');
  const overlay = document.querySelector('.mobile-menu-overlay');
  const close = document.querySelector('.mobile-menu-close');

  function open() { menu.classList.add('active'); overlay.classList.add('active'); document.body.style.overflow = 'hidden'; }
  function closeMenu() { menu.classList.remove('active'); overlay.classList.remove('active'); document.body.style.overflow = ''; }

  if (toggle) toggle.addEventListener('click', open);
  if (close) close.addEventListener('click', closeMenu);
  if (overlay) overlay.addEventListener('click', closeMenu);
}

function initBackToTop() {
  const btn = document.querySelector('.back-to-top');
  if (!btn) return;
  window.addEventListener('scroll', () => btn.classList.toggle('visible', window.scrollY > 400));
  btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
}
function initTopBar() {
  const s = DB.getSettings();
  if (!s) return;
  const m = s.mobile || {};

  // Apply mobile settings
  if (m.hideTopbar) document.body.classList.add('mobile-hide-topbar');
  if (m.hideSocial) document.body.classList.add('mobile-hide-social');
  if (m.productCols) document.body.style.setProperty('--mobile-cols', m.productCols);
  if (m.sliderHeight) document.body.style.setProperty('--mobile-slider-h', m.sliderHeight + 'px');

  if (s.phone) {
    const el = document.getElementById('topbarPhone');
    if (el) { el.textContent = '📞 ' + s.phone; el.href = 'tel:' + s.phone; }
    const fp = document.getElementById('footerPhone');
    if (fp) { fp.textContent = s.phone; fp.href = 'tel:' + s.phone; }
  }
  if (s.email) {
    const el = document.getElementById('topbarEmail');
    if (el) { el.textContent = '✉ ' + s.email; el.href = 'mailto:' + s.email; }
    const fe = document.getElementById('footerEmail');
    if (fe) { fe.textContent = s.email; fe.href = 'mailto:' + s.email; }
  }
  if (s.address) {
    const a = document.getElementById('footerAddress');
    if (a) a.textContent = ' ' + s.address;
  }
  const sm = s.socialMedia;
  if (sm) {
    const container = document.getElementById('topbarSocial');
    if (container) {
      const links = container.querySelectorAll('a');
      if (sm.instagram && links[0]) links[0].href = sm.instagram;
      if (sm.telegram && links[1]) links[1].href = sm.telegram;
      if (sm.whatsapp && links[2]) links[2].href = sm.whatsapp;
    }
    const fSocial = document.getElementById('footerSocial');
    if (fSocial) {
      const flinks = fSocial.querySelectorAll('a');
      if (sm.instagram && flinks[0]) flinks[0].href = sm.instagram;
      if (sm.telegram && flinks[1]) flinks[1].href = sm.telegram;
      if (sm.whatsapp && flinks[2]) flinks[2].href = sm.whatsapp;
      if (sm.bale && flinks[3]) flinks[3].href = sm.bale;
    }
  }
}

function initSearch() {
  const searchInput = document.getElementById('searchInput');
  if (!searchInput) return;
  const searchIcon = document.querySelector('.search-icon');

  function doSearch() {
    const q = searchInput.value.trim();
    if (q) window.location.href = `/products?search=${encodeURIComponent(q)}`;
  }

  searchInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      if (window.innerWidth <= 768 && searchBox) searchBox.classList.remove('mobile-show');
      doSearch();
    }
  });
  if (searchIcon) searchIcon.addEventListener('click', doSearch);
}

function renderProducts(products, selector) {
  const grid = document.querySelector(selector);
  if (!grid) return;
  if (products.length === 0) {
    grid.innerHTML = `<div class="empty-state"><div class="empty-icon">📦</div><h3>${__('product.notFound')}</h3><p>${__('product.notFoundDesc')}</p></div>`;
    return;
  }
  grid.innerHTML = products.map(p => {
    const discount = p.discount || 0;
    const pname = p.name;
    return `
      <div class="product-card">
        <div class="card-image">
          <a href="/product?id=${p.id}">
            <img src="${p.images[0]}" alt="${pname}" loading="lazy" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22600%22 height=%22600%22><rect fill=%22%23222%22 width=%22600%22 height=%22600%22/><text x=%22300%22 y=%22320%22 text-anchor=%22middle%22 fill=%22%23666%22 font-size=%2240%22>📦</text></svg>'">
          </a>
          <div class="card-badges">
            ${discount > 0 ? `<span class="card-badge discount">${discount}%-</span>` : ''}
            ${p.bestseller ? `<span class="card-badge bestseller">${__('product.bestseller')}</span>` : ''}
          </div>
          <div class="card-actions">
            <button class="card-action-btn" onclick="addToWishlist(${p.id})" title="${__('product.wishlist')}">❤</button>
          </div>
        </div>
        <div class="card-body">
          <div class="card-category">${p.category}</div>
          <h3 class="card-title"><a href="/product?id=${p.id}">${pname}</a></h3>
          <div class="card-rating">
            <span class="stars">${'★'.repeat(Math.floor(p.rating))}${p.rating % 1 >= 0.5 ? '½' : ''}</span>
            <span>(${p.reviews})</span>
          </div>
          <div class="card-price">
            <span class="current-price">${DB.formatPrice(p.price, p.currency)}</span>
            ${p.oldPrice ? `<span class="old-price">${DB.formatPrice(p.oldPrice, p.currency)}</span>` : ''}
          </div>
          <button class="add-to-cart-btn" onclick="addToCartClick(${p.id})">🛒 ${__('product.addToCart')}</button>
        </div>
      </div>`;
  }).join('');
}

function renderCategories() {
  const grid = document.querySelector('.categories-grid');
  if (!grid) return;
  const cats = DB.getCategories();
  const icons = ['📱', '💻', '👕', '📚', '☕', '🎧', '⌚', '🔌'];
  grid.innerHTML = cats.map((c, i) => `
    <a href="products.html?category=${encodeURIComponent(c.name)}" class="category-item">
      <span class="cat-icon">${icons[i % icons.length]}</span>
      <h4>${c.name}</h4>
      <span>${__n('product.count', c.count)}</span>
    </a>`).join('');
}

function renderFeatures() {
  const bar = document.querySelector('.features-bar');
  if (!bar) return;
  const features = DB.getSettings().features || [];
  bar.innerHTML = features.map(f => `
    <div class="feature-item">
      <div class="feature-icon">${f.icon}</div>
      <div class="feature-text">
        <h4>${f.title}</h4>
        <p>${f.description}</p>
      </div>
    </div>`).join('');
}

function renderBanners() {
  const container = document.querySelector('.category-banners');
  if (!container) return;
  const banners = DB.getSettings().banners || [];
  container.innerHTML = banners.map(b => `
    <a href="${b.link}" class="category-banner">
      <img src="${b.image}" alt="${b.title}" loading="lazy">
      <div class="banner-overlay" style="background: linear-gradient(135deg, ${b.color}88, transparent);"></div>
      <div class="banner-content">
        <h3>${b.title}</h3>
        <p>${b.subtitle}</p>
        <span class="banner-link">${__('common.search')} <span>←</span></span>
      </div>
    </a>`).join('');
}

// Global helpers
function addToCartClick(id) {
  const product = DB.getProduct(id);
  if (!product) return;
  DB.addToCart(id);
  UI.toast(__('product.addedToCart', { name: product.name }), 'success');
  const btns = document.querySelectorAll(`.add-to-cart-btn[onclick*="${id}"]`);
  btns.forEach(b => {
    b.textContent = '✓ ' + __('common.save');
    b.classList.add('in-cart');
    setTimeout(() => {
      b.textContent = '🛒 ' + __('product.addToCart');
      b.classList.remove('in-cart');
    }, 2000);
  });
}

function addToWishlist(id) {
  let wishlist = JSON.parse(localStorage.getItem('bizshop_wishlist') || '[]');
  const product = DB.getProduct(id);
  const pname = product ? product.name : '';
  if (wishlist.includes(id)) {
    wishlist = wishlist.filter(i => i !== id);
    UI.toast(__('product.removedFromWishlist', { name: pname }), 'warning');
  } else {
    wishlist.push(id);
    UI.toast(__('product.addedToWishlist', { name: pname }), 'success');
  }
  localStorage.setItem('bizshop_wishlist', JSON.stringify(wishlist));
}

function initProductsPage() {
  const params = new URLSearchParams(window.location.search);
  const grid = document.querySelector('.products-grid');
  const countEl = document.getElementById('resultsCount');
  const sortSelect = document.getElementById('sortSelect');

  function loadProducts() {
    const filters = { sort: sortSelect ? sortSelect.value : 'newest' };
    if (params.get('category')) filters.category = params.get('category');
    if (params.get('brand')) filters.brand = params.get('brand');
    if (params.get('search')) filters.search = params.get('search');

    document.querySelectorAll('.filter-category').forEach(cb => {
      if (cb.checked) filters.category = cb.value;
    });
    document.querySelectorAll('.filter-brand').forEach(cb => {
      if (cb.checked) filters.brand = cb.value;
    });

    let products = DB.getProducts(filters);
    if (countEl) countEl.textContent = __n('product.count', products.length);
    renderProducts(products, '.products-grid');
  }

  if (sortSelect) sortSelect.addEventListener('change', loadProducts);
  loadProducts();

  // Populate filters
  const brandFilter = document.querySelector('.filter-brands');
  if (brandFilter) {
    const brands = DB.getBrands();
    brandFilter.innerHTML = brands.map(b => `
      <label class="filter-option">
        <input type="checkbox" class="filter-brand" value="${b.name}">
        ${b.name} (${b.count})
      </label>`).join('');
    brandFilter.querySelectorAll('input').forEach(input => {
      input.addEventListener('change', loadProducts);
    });
  }

  const catFilter = document.querySelector('.filter-categories');
  if (catFilter) {
    const cats = DB.getCategories();
    catFilter.innerHTML = cats.map(c => `
      <label class="filter-option">
        <input type="checkbox" class="filter-category" value="${c.name}">
        ${c.name} (${c.count})
      </label>`).join('');
    catFilter.querySelectorAll('input').forEach(input => {
      input.addEventListener('change', loadProducts);
    });
  }

  const filterToggle = document.getElementById('filterToggle');
  const filterSidebar = document.querySelector('.filters-sidebar');
  if (filterToggle && filterSidebar) {
    filterToggle.addEventListener('click', () => {
      filterSidebar.classList.toggle('mobile-show');
      const overlay = document.querySelector('.filter-overlay');
      if (overlay) overlay.classList.toggle('active');
    });
    const overlay = document.createElement('div');
    overlay.className = 'filter-overlay';
    Object.assign(overlay.style, {
      position:'fixed', top:0, left:0, right:0, bottom:0,
      background:'rgba(0,0,0,0.5)', zIndex:2000,
      opacity:0, visibility:'hidden',
      transition:'all 0.3s ease'
    });
    overlay.addEventListener('click', () => {
      filterSidebar.classList.remove('mobile-show');
      overlay.classList.remove('active');
    });
    filterSidebar.after(overlay);
    const obs = new MutationObserver(() => {
      overlay.style.opacity = overlay.style.visibility =
        filterSidebar.classList.contains('mobile-show') ? '1' : '0';
      overlay.style.visibility = filterSidebar.classList.contains('mobile-show') ? 'visible' : 'hidden';
    });
    obs.observe(filterSidebar, { attributes: true, attributeFilter: ['class'] });
  }
}

function initProductDetail() {
  const params = new URLSearchParams(window.location.search);
  const id = parseInt(params.get('id'));
  if (!id) {
    document.querySelector('.product-detail').innerHTML = '<div class="empty-state"><div class="empty-icon">🔍</div><h3>'+__('product.notSelected')+'</h3><p>'+__('product.notSelectedDesc')+'</p><a href="products.html" class="btn btn-primary">'+__('product.viewProducts')+'</a></div>';
    return;
  }
  const product = DB.getProduct(id);
  if (!product) {
    document.querySelector('.product-detail').innerHTML = '<div class="empty-state"><div class="empty-icon">😕</div><h3>'+__('product.notFound')+'</h3><p>'+__('product.notFoundDesc')+'</p><a href="products.html" class="btn btn-primary">'+__('product.viewProducts')+'</a></div>';
    return;
  }

  const setText = (el, val) => { const e = document.getElementById(el); if (e) e.textContent = val; };
  const setHTML = (el, val) => { const e = document.getElementById(el); if (e) e.innerHTML = val; };

  const pname = product.name;
  document.title = pname + ' | ' + __('site.name');
  setText('prodName', pname);
  setText('prodNameTitle', pname);
  setText('prodCategory', product.category);
  setText('prodBrand', product.brand);
  const stars = '★'.repeat(Math.floor(product.rating || 0));
  setHTML('prodRating', __n('product.rating', product.reviews || 0, { stars }));
  setText('prodPrice', DB.formatPrice(product.price, product.currency));
  setText('prodOldPrice', product.oldPrice ? DB.formatPrice(product.oldPrice, product.currency) : '');
  setText('prodDiscount', product.discount ? __('product.discount', { n: product.discount }) : '');
  setText('prodDescription', product.description || '');
  setText('prodStock', __n('product.stock', product.stock || 0));

  const img = document.getElementById('prodMainImage');
  if (img) { img.src = product.images?.[0] || 'https://picsum.photos/seed/default/600/600'; img.alt = product.name; img.onerror = function(){this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22600%22 height=%22600%22><rect fill=%22%23222%22 width=%22600%22 height=%22600%22/><text x=%22300%22 y=%22320%22 text-anchor=%22middle%22 fill=%22%23666%22 font-size=%2240%22>📦</text></svg>';}; }

  if (product.video) {
    const el = document.getElementById('prodVideo');
    if (el) {
      let src = product.video;
      const ytMatch = src.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/);
      if (ytMatch) src = `https://www.youtube.com/embed/${ytMatch[1]}`;
      el.innerHTML = `
      <h3>🎬 ${__('product.videoIntro')}</h3>
      <div style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;border-radius:var(--radius);margin-top:10px;background:var(--gray-100);">
        <iframe src="${src}" style="position:absolute;top:0;left:0;width:100%;height:100%;border:0;" allowfullscreen></iframe>
      </div>`;
    }
  }

  if (product.model3d) {
    var v = document.createElement('script');
    v.src = 'js/viewer3d.js';
    v.onload = function() {
      if (typeof THREE !== 'undefined' && window.initModelViewer) {
        window.initModelViewer('prodModelViewer', product.model3d); return;
      }
      var s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
      s.onload = function() {
        var o = document.createElement('script');
        o.src = 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js';
        o.onload = function() {
          var g = document.createElement('script');
          g.src = 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js';
          g.onload = function() { window.initModelViewer('prodModelViewer', product.model3d); };
          g.onerror = err; document.head.appendChild(g);
        };
        o.onerror = err; document.head.appendChild(o);
      };
      s.onerror = err; document.head.appendChild(s);
    };
    function err() { document.getElementById('prodModelViewer').innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#999;font-size:14px;">⚠️ ' + (window.__ ? __('product.model3dError') : '3D model unavailable') + '</div>'; }
    document.head.appendChild(v);
  }

  const featuresList = document.getElementById('prodFeatures');
  if (featuresList) featuresList.innerHTML = (product.features || []).map(f => `<li>${f}</li>`).join('');

  const thumbs = document.getElementById('galleryThumbs');
  if (thumbs) {
    thumbs.innerHTML = (product.images || [product.images?.[0] || '']).map((img, i) =>
      `<div class="gallery-thumb ${i === 0 ? 'active' : ''}" data-img="${img.replace(/"/g, '&quot;')}">
        <img src="${img}" alt="">
      </div>`).join('');
    thumbs.querySelectorAll('.gallery-thumb').forEach(el => {
      el.addEventListener('click', () => changeGalleryImage(el, el.dataset.img));
    });
  }

  const addBtn = document.querySelector('.add-to-cart-detail');
  if (addBtn) addBtn.onclick = () => {
    const qty = parseInt(document.getElementById('prodQty')?.value) || 1;
    DB.addToCart(id, qty);
    UI.toast(__('product.addedToCartFinal', { name: pname }), 'success');
    addBtn.textContent = '✓ ' + __('common.save');
    addBtn.style.background = 'var(--success)';
    setTimeout(() => { addBtn.textContent = '🛒 ' + __('product.addToCart'); addBtn.style.background = ''; }, 1500);
  };

  const minusBtn = document.getElementById('prodQtyMinus');
  const plusBtn = document.getElementById('prodQtyPlus');
  const qtyInput = document.getElementById('prodQty');
  if (minusBtn) minusBtn.onclick = () => { if (parseInt(qtyInput?.value) > 1) qtyInput.value = parseInt(qtyInput.value) - 1; };
  if (plusBtn) plusBtn.onclick = () => { if (parseInt(qtyInput?.value) < (product.stock || 999)) qtyInput.value = parseInt(qtyInput.value) + 1; };

  const wishBtn = document.getElementById('wishlistBtn');
  if (wishBtn) wishBtn.onclick = () => addToWishlist(id);

  // Related Products
  renderRelatedProducts(product);
}

function renderRelatedProducts(product) {
  const container = document.getElementById('relatedProducts');
  if (!container) return;
  let related;
  if (product.relatedIds && product.relatedIds.length) {
    related = product.relatedIds.map(id => DB.getProduct(id)).filter(Boolean).slice(0, 4);
  } else {
    related = DB.getProducts({ status: 'active' })
      .filter(p => p.id !== product.id && (p.category === product.category || p.brand === product.brand))
      .slice(0, 4);
  }
  if (related.length === 0) {
    container.parentElement.style.display = 'none';
    return;
  }
  renderProducts(related, '#relatedProducts');
}

function changeGalleryImage(el, src) {
  document.querySelectorAll('.gallery-thumb').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  document.getElementById('prodMainImage').src = src;
}

function initCartPage() {
  renderCartItems();
}

function renderCartItems() {
  const container = document.querySelector('.cart-items');
  const summary = document.querySelector('.cart-summary');
  if (!container) return;

  const cart = DB.getCart();
  if (cart.length === 0) {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">🛒</div><h3>${__('cart.empty')}</h3><p>${__('cart.emptyDesc')}</p><a href="products.html" class="btn btn-primary">${__('product.viewProducts')}</a></div>`;
    if (summary) summary.innerHTML = '';
    return;
  }

  let subtotal = 0;
  container.innerHTML = cart.map(item => {
    const p = DB.getProduct(item.id);
    if (!p) return '';
    const total = p.price * item.qty;
    subtotal += total;
    const pname = p.name;
    return `
      <div class="cart-item" data-id="${p.id}">
        <div class="cart-item-image">
          <img src="${p.images[0]}" alt="${pname}" loading="lazy" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22100%22 height=%22100%22><rect fill=%22%23222%22 width=%22100%22 height=%22100%22/><text x=%2250%22 y=%2260%22 text-anchor=%22middle%22 fill=%22%23666%22 font-size=%2230%22>📦</text></svg>'">
        </div>
        <div class="cart-item-info">
          <h4>${pname}</h4>
          <div class="item-price">${DB.formatPrice(p.price, p.currency)}</div>
          <div class="item-total">${DB.formatPrice(total, p.currency)}</div>
        </div>
        <div class="cart-item-actions">
          <div class="qty-selector">
            <button onclick="changeCartQty(${p.id}, ${item.qty - 1})">−</button>
            <input type="text" value="${item.qty}" readonly>
            <button onclick="changeCartQty(${p.id}, ${item.qty + 1})">+</button>
          </div>
          <button class="remove-item" onclick="removeCartItem(${p.id})">🗑 ${__('common.delete')}</button>
        </div>
      </div>`;
  }).join('');

  if (summary) {
    const settings = DB.getSettings();
    const shipping = subtotal >= (settings.freeShippingMin || 3000000) ? 0 : (settings.shippingCost || 150000);
    const freeText = __('cart.free');
    summary.innerHTML = `
      <h3>${__('cart.summary')}</h3>
      <div class="summary-row"><span>${__('cart.count')}</span><span>${DB.getCartCount()} ${__('cart.unit')}</span></div>
      <div class="summary-row"><span>${__('cart.subtotal')}</span><span>${DB.formatPrice(subtotal)}</span></div>
      <div class="summary-row"><span>${__('cart.shipping')}</span><span>${shipping === 0 ? freeText : DB.formatPrice(shipping)}</span></div>
      <div class="summary-row total"><span>${__('cart.total')}</span><span>${DB.formatPrice(subtotal + shipping)}</span></div>
      <button class="btn btn-primary checkout-btn" onclick="window.location.href='checkout.html'">${__('cart.pay')}</button>
      <a href="products.html" style="display:block;text-align:center;margin-top:12px;color:var(--gray-600);font-size:0.85rem;">${__('cart.continue')}</a>`;
  }
}

function changeCartQty(id, qty) {
  if (qty <= 0) {
    DB.removeFromCart(id);
  } else {
    DB.updateCartQty(id, qty);
  }
  renderCartItems();
}

function removeCartItem(id) {
  DB.removeFromCart(id);
  renderCartItems();
  UI.toast(__('product.removedFromCart'), 'warning');
}

function initCheckoutPage() {
  const cart = DB.getCart();
  if (cart.length === 0) {
    document.querySelector('.checkout-grid').innerHTML = `<div class="empty-state"><h3>${__('checkout.empty')}</h3><a href="products.html" class="btn btn-primary">${__('product.viewProducts')}</a></div>`;
    return;
  }

  const subtotal = DB.getCartTotal();
  const settings = DB.getSettings();
  const shipping = subtotal >= (settings.freeShippingMin || 3000000) ? 0 : (settings.shippingCost || 150000);
  const total = subtotal + shipping;

  document.getElementById('checkoutSubtotal').textContent = DB.formatPrice(subtotal);
  document.getElementById('checkoutShipping').textContent = shipping === 0 ? __('cart.free') : DB.formatPrice(shipping);
  document.getElementById('checkoutTotal').textContent = DB.formatPrice(total);

  document.querySelectorAll('.payment-method').forEach(el => {
    el.addEventListener('click', () => {
      document.querySelectorAll('.payment-method').forEach(m => m.classList.remove('selected'));
      el.classList.add('selected');
    });
  });

  document.getElementById('submitOrder').addEventListener('click', async () => {
    const name = document.getElementById('custName').value.trim();
    const phone = document.getElementById('custPhone').value.trim();
    const address = document.getElementById('custAddress').value.trim();

    if (!name || !phone || !address) {
      UI.toast(__('checkout.required'), 'error');
      return;
    }

    if (phone.length < 10) {
      UI.toast(__('checkout.invalidPhone'), 'error');
      return;
    }

    const orderItems = cart.map(item => {
      const p = DB.getProduct(item.id);
      return { id: item.id, name: p ? p.name : __('product.defaultName'), qty: item.qty, price: p?.price, currency: p?.currency };
    });

    DB.addOrder({ items: orderItems, subtotal, shipping, total, customer: { name, phone, address } });
    DB.saveCart([]);

    UI.toast(__('checkout.registered'), 'success');
    document.querySelector('.checkout-grid').innerHTML = `
      <div class="empty-state" style="grid-column:1/-1">
        <div class="empty-icon">🎉</div>
        <h3>${__('checkout.success')}</h3>
        <p>${__('checkout.successDesc', { code: Date.now() })}</p>
        <p style="font-size:0.85rem;color:var(--gray-600);">${__('checkout.successContact')}</p>
        <a href="products.html" class="btn btn-primary mt-20">${__('checkout.continue')}</a>
      </div>`;
  });
}
