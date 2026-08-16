const ADMIN = {
  currentPage: 'dashboard',

  async init() {
    if (!I18n._loaded) await I18n.init();
    if (!DB._products || !DB._products.length) await DB.init();
    const isLoggedIn = localStorage.getItem('bizshop_admin') === 'true';
    if (document.getElementById('adminLoginForm')) {
      document.getElementById('adminLoginForm').addEventListener('submit', e => {
        e.preventDefault();
        const u = document.getElementById('adminUser').value;
        const p = document.getElementById('adminPass').value;
        if (u === 'admin' && p === 'bizshop123') {
          localStorage.setItem('bizshop_admin', 'true');
          window.location.href = 'dashboard.html';
        } else {
          UI.toast(__('admin.login.error'), 'error');
        }
      });
      return;
    }
    if (!isLoggedIn) { window.location.href = 'login.html'; return; }
    this.setupNav();
    this.setupLogout();
    this.navigate(window.location.hash.replace('#', '') || 'dashboard');
  },

  setupNav() {
    document.querySelectorAll('.sidebar-nav a[data-page], .bottom-nav-item[data-page]').forEach(a => {
      a.addEventListener('click', e => {
        const page = a.dataset.page;
        if (page) { e.preventDefault(); this.navigate(page); }
      });
    });
  },

  setupLogout() {
    const btn = document.getElementById('logoutBtn');
    if (btn) btn.addEventListener('click', () => { localStorage.removeItem('bizshop_admin'); window.location.href = 'login.html'; });
  },

  navigate(page) {
    this.currentPage = page;
    window.location.hash = page;
    document.querySelectorAll('.sidebar-nav a[data-page], .bottom-nav-item[data-page]').forEach(a => a.classList.toggle('active', a.dataset.page === page));
    const titles = { dashboard: __('admin.page.dashboard'), products: __('admin.page.products'), categories: __('admin.page.categories'), orders: __('admin.page.orders'), settings: __('admin.page.settings') };
    const titleEl = document.getElementById('pageTitle');
    if (titleEl) titleEl.textContent = titles[page] || __('admin.page.dashboard');
    const el = document.getElementById('adminContent');
    if (this[`render${page.charAt(0).toUpperCase() + page.slice(1)}`]) this[`render${page.charAt(0).toUpperCase() + page.slice(1)}`](el);
    else this.renderDashboard(el);
  },

  // ─── DASHBOARD ───
  renderDashboard(el) {
    const s = DB.getStats();
    const recentOrders = DB.getOrders().slice(0, 5);
    const lowStockItems = DB.getProducts({ stock: 'low', status: 'active' }).slice(0, 5);
    el.innerHTML = `
      <div class="stats-grid">
        <div class="stat-card" style="border-right:4px solid var(--primary);">
          <div class="stat-icon" style="background:rgba(249,115,22,0.12);color:var(--primary);">📦</div>
          <div class="stat-info"><h4>${s.totalProducts}</h4><p>${__('admin.dashboard.stats.activeProducts')}</p></div>
        </div>
        <div class="stat-card" style="border-right:4px solid var(--success);">
          <div class="stat-icon" style="background:rgba(34,197,94,0.12);color:var(--success);">💰</div>
          <div class="stat-info"><h4>${DB.formatPrice(s.totalSales)}</h4><p>${__('admin.dashboard.stats.totalSales')}</p></div>
        </div>
        <div class="stat-card" style="border-right:4px solid var(--warning);">
          <div class="stat-icon" style="background:rgba(245,158,11,0.15);color:#B7950B;">📋</div>
          <div class="stat-info"><h4>${s.totalOrders}</h4><p>${__('admin.dashboard.stats.orders', { n: s.pendingOrders })}</p></div>
        </div>
        <div class="stat-card" style="border-right:4px solid var(--danger);">
          <div class="stat-icon" style="background:rgba(239,68,68,0.12);color:var(--danger);">⚠️</div>
          <div class="stat-info"><h4>${s.lowStock}</h4><p>${__('admin.dashboard.stats.lowStock')}</p></div>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;">
        <div class="admin-table-wrap">
          <div class="admin-toolbar"><h3>🕐 ${__('admin.dashboard.recentOrders')}</h3><a href="#" onclick="ADMIN.navigate('orders');return false;" style="font-size:0.85rem;color:var(--primary);">${__('common.viewAll')}</a></div>
          <table class="admin-table">
            <thead><tr><th>${__('admin.table.code')}</th><th>${__('admin.table.customer')}</th><th>${__('admin.table.amount')}</th><th>${__('admin.table.status')}</th></tr></thead>
            <tbody>${recentOrders.length ? recentOrders.map(o => `<tr><td>#${o.id}</td><td>${o.customer?.name || '---'}</td><td>${DB.formatPrice(o.total || 0)}</td><td><span class="badge-status ${o.status}">${o.status === 'pending' ? __('order.pending') : o.status === 'active' || o.status === 'completed' ? __('order.completedFull') : __('order.cancelledFull')}</span></td></tr>`).join('') : '<tr><td colspan="4" style="text-align:center;padding:30px;">'+__('admin.dashboard.noOrders')+'</td></tr>'}</tbody>
          </table>
        </div>
        <div class="admin-table-wrap">
          <div class="admin-toolbar"><h3>⚠️ ${__('admin.dashboard.lowStockTitle')}</h3></div>
          <table class="admin-table">
            <thead><tr><th>${__('admin.table.product')}</th><th>${__('admin.table.stock')}</th><th>${__('admin.table.price')}</th></tr></thead>
            <tbody>${lowStockItems.length ? lowStockItems.map(p => `<tr><td><div class="product-cell"><img src="${p.images?.[0] || ''}" alt="" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2250%22 height=%2250%22><rect fill=%22%23222%22 width=%2250%22 height=%2250%22/><text x=%2225%22 y=%2230%22 text-anchor=%22middle%22 fill=%22%23666%22 font-size=%2220%22>📦</text></svg>'"><span class="prod-name">${p.name}</span></div></td><td><span class="badge-status ${p.stock <= 0 ? 'inactive' : 'pending'}">${p.stock}</span></td><td>${DB.formatPrice(p.price, p.currency)}</td></tr>`).join('') : '<tr><td colspan="3" style="text-align:center;padding:30px;">'+__('admin.dashboard.allStockOK')+'</td></tr>'}</tbody>
          </table>
        </div>
      </div>`;
  },

  // ─── PRODUCTS ───
  renderProducts(el) {
    const filter = document.getElementById('prodFilter')?.value || 'all';
    let products = DB.getProducts({ status: filter === 'all' ? '' : filter });
    if (filter === 'active') products = DB.getProducts({ status: 'active' });
    else if (filter === 'inactive') products = DB.getProducts().filter(p => p.status === 'inactive');
    else if (filter === 'deleted') products = DB.getProducts().filter(p => p.status === 'deleted');
    else if (filter === 'all') { const all = DB._products; products = all; }
    else products = DB.getProducts({ status: 'active' });

    const q = document.getElementById('prodSearchInput')?.value?.toLowerCase() || '';
    const cursor = document.getElementById('prodSearchInput')?.selectionStart || 0;
    if (q) products = products.filter(p => p.name.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q));

    el.innerHTML = `
      <div class="admin-table-wrap">
        <div class="admin-toolbar">
          <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;">
            <input type="text" id="prodSearchInput" placeholder="${__('admin.products.search')}" value="${q}" style="padding:8px 14px;border:2px solid var(--gray-200);border-radius:8px;font-family:inherit;width:220px;">
            <select id="prodFilter" onchange="ADMIN.renderProducts(document.getElementById('adminContent'))" style="padding:8px 14px;border:2px solid var(--gray-200);border-radius:8px;font-family:inherit;">
              <option value="all" ${filter==='all'?'selected':''}>${__('admin.products.all', { n: DB._products.length })}</option>
              <option value="active" ${filter==='active'?'selected':''}>${__('admin.products.active')}</option>
              <option value="inactive" ${filter==='inactive'?'selected':''}>${__('admin.products.inactive')}</option>
              <option value="deleted" ${filter==='deleted'?'selected':''}>${__('admin.products.deleted')}</option>
            </select>
          </div>
          <button class="btn btn-primary btn-sm" onclick="ADMIN.showProductModal()">➕ ${__('admin.products.new')}</button>
        </div>
        <div id="prodTableWrap" style="overflow-x:auto;">
          <table class="admin-table">
            <thead><tr>
              <th style="width:50px;">#</th>
              <th>${__('admin.table.product')}</th>
              <th>${__('admin.table.sku')}</th>
              <th>${__('admin.table.category')}</th>
              <th>${__('admin.table.price')}</th>
              <th>${__('admin.table.discount')}</th>
              <th>${__('admin.table.stock')}</th>
              <th>${__('admin.table.bestseller')}</th>
              <th>${__('admin.table.status')}</th>
              <th style="width:140px;">${__('admin.table.actions')}</th>
            </tr></thead>
            <tbody>${products.length ? products.map(p => `
              <tr>
                <td>${p.id}</td>
                <td><div class="product-cell"><img src="${p.images?.[0] || 'https://picsum.photos/seed/default/100/100'}" alt="" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2250%22 height=%2250%22><rect fill=%22%23222%22 width=%2250%22 height=%2250%22/><text x=%2225%22 y=%2230%22 text-anchor=%22middle%22 fill=%22%23666%22 font-size=%2220%22>📦</text></svg>'"><div class="prod-name">${p.name}</div></td>
                <td style="font-size:0.8rem;color:var(--gray-600);">${p.sku || '-'}</td>
                <td>${p.category || '-'}</td>
                <td>${DB.formatPrice(p.price, p.currency)}</td>
                <td>${p.discount ? `<span class="badge-status pending">${p.discount}%</span>` : '-'}</td>
                <td><span class="badge-status ${p.stock > 20 ? 'active' : p.stock > 0 ? 'pending' : 'inactive'}">${p.stock}</span></td>
                <td>${p.bestseller ? '<span style="color:var(--warning);font-size:1.2rem;">★</span>' : '—'}</td>
                <td><span class="badge-status ${p.status === 'active' ? 'active' : 'inactive'}">${p.status === 'active' ? __('common.active') : p.status === 'inactive' ? __('common.inactive') : __('admin.products.deleted')}</span></td>
                <td>
                  <div class="action-btns">
                    <button class="action-btn edit" onclick="ADMIN.showProductModal(${p.id})" title="${__('common.edit')}">✏️</button>
                    <button class="action-btn edit" onclick="ADMIN.duplicateProduct(${p.id})" title="${__('common.copy')}">📋</button>
                    <button class="action-btn delete" onclick="ADMIN.deleteProduct(${p.id})" title="${__('common.delete')}">🗑</button>
                  </div>
                </td>
              </tr>`).join('') : '<tr><td colspan="10" style="text-align:center;padding:40px;">'+__('admin.products.noResults')+'</td></tr>'}</tbody>
          </table>
        </div>
      </div>`;
    const si = document.getElementById('prodSearchInput');
    if (si) {
      si.selectionStart = si.selectionEnd = Math.min(cursor, q.length);
      si.addEventListener('keyup', () => this.renderProducts(el));
      si.focus();
    }
  },

  duplicateProduct(id) {
    const p = DB.duplicateProduct(id);
    if (p) { UI.toast(__('admin.products.duplicated', { name: p.name }), 'success'); this.renderProducts(document.getElementById('adminContent')); }
  },

  deleteProduct(id) {
    const p = DB.getProduct(id);
    UI.modal(__('admin.productDelete.title'), `
      <p>${__('admin.productDelete.confirm', { name: p?.name })}</p>
      <div style="display:flex;gap:10px;margin-top:20px;flex-wrap:wrap;">
        <button class="btn btn-primary btn-sm" style="flex:1;" onclick="ADMIN.confirmDelete(${id})">${__('admin.productDelete.delete')}</button>
        <button class="btn btn-outline btn-sm" style="flex:1;" onclick="ADMIN.toggleProductStatus(${id})">${__('admin.productDelete.disable')}</button>
        <button class="btn btn-secondary btn-sm" onclick="document.querySelector('.modal-overlay')?.remove()">${__('common.cancel')}</button>
      </div>`);
  },

  confirmDelete(id) {
    DB.deleteProduct(id, true);
    UI.toast(__('admin.products.deletedPerm'), 'error');
    document.querySelector('.modal-overlay')?.remove();
    this.renderProducts(document.getElementById('adminContent'));
  },

  toggleProductStatus(id) {
    const p = DB.getProduct(id);
    if (!p) return;
    const newStatus = p.status === 'active' ? 'inactive' : 'active';
    DB.updateProduct(id, { status: newStatus });
    UI.toast(__('admin.products.statusChanged', { status: newStatus === 'active' ? __('common.active') : __('common.inactive') }), 'success');
    document.querySelector('.modal-overlay')?.remove();
    this.renderProducts(document.getElementById('adminContent'));
  },

  showProductModal(id) {
    const p = id ? DB.getProduct(id) : null;
    const cats = DB.getCategories();
    const isEdit = !!p;
    const title = isEdit ? __('admin.productModal.edit') : __('admin.productModal.new');
    const tagsStr = p?.tags?.join(', ') || '';
    const featuresStr = p?.features?.join('\n') || '';
    const imagesStr = p?.images?.join('\n') || '';

    UI.modal(title, `
      <form id="productForm" style="display:grid;gap:14px;">
        <div class="form-group"><label>${__('admin.productModal.name')}</label><input type="text" id="pfName" value="${p?.name || ''}" required></div>
        <div style="display:grid;grid-template-columns:1fr 1fr 100px 1fr;gap:12px;">
          <div class="form-group"><label>${__('admin.productModal.sku')}</label><input type="text" id="pfSku" value="${p?.sku || DB.generateSKU()}" dir="ltr"></div>
          <div class="form-group"><label>${__('admin.productModal.price')}</label><input type="number" id="pfPrice" value="${p?.price || ''}" required></div>
          <div class="form-group"><label>${__('admin.productModal.currency')}</label><select id="pfCurrency" style="width:100%;padding:8px;border:1px solid var(--border,#ddd);border-radius:6px;background:var(--card,#fff);color:var(--text,#333);font-size:13px;"><option value="toman" ${p?.currency === 'toman' ? 'selected' : ''}>تومان</option><option value="rial" ${p?.currency === 'rial' ? 'selected' : ''}>ریال</option><option value="usd" ${p?.currency === 'usd' ? 'selected' : ''}>$ دلار</option><option value="eur" ${p?.currency === 'eur' ? 'selected' : ''}>€ یورو</option><option value="aed" ${p?.currency === 'aed' ? 'selected' : ''}>درهم امارات</option><option value="sar" ${p?.currency === 'sar' ? 'selected' : ''}>ریال سعودی</option><option value="kwd" ${p?.currency === 'kwd' ? 'selected' : ''}>دینار کویت</option><option value="omr" ${p?.currency === 'omr' ? 'selected' : ''}>ریال عمان</option><option value="qar" ${p?.currency === 'qar' ? 'selected' : ''}>ریال قطر</option><option value="bhd" ${p?.currency === 'bhd' ? 'selected' : ''}>دینار بحرین</option></select></div>
          <div class="form-group"><label>${__('admin.productModal.discount')}</label><input type="number" id="pfDiscount" value="${p?.discount || 0}" min="0" max="100"></div>
        </div>
        <div id="pricePreview" style="background:var(--bg,#f5f5f5);border:1px solid var(--border,#ddd);border-radius:8px;padding:10px 14px;font-size:14px;display:none;">
          <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
            <span style="text-decoration:line-through;color:#999;" id="previewOldPrice"></span>
            <span style="font-size:18px;font-weight:800;color:var(--dark,#222);" id="previewCurrentPrice"></span>
            <span style="background:#e17055;color:#fff;padding:2px 10px;border-radius:20px;font-size:12px;font-weight:700;" id="previewDiscountBadge"></span>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
          <div class="form-group">
            <label>${__('admin.productModal.category')}</label>
            <select id="pfCategory">${cats.map(c => `<option value="${c.name}" ${p?.category === c.name ? 'selected' : ''}>${c.icon} ${c.name}</option>`).join('')}</select>
          </div>
          <div class="form-group"><label>${__('admin.productModal.brand')}</label><input type="text" id="pfBrand" value="${p?.brand || ''}"></div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;">
          <div class="form-group"><label>${__('admin.productModal.stock')}</label><input type="number" id="pfStock" value="${p?.stock || 0}" min="0"></div>
          <div class="form-group">
            <label>${__('admin.productModal.status')}</label>
            <select id="pfStatus"><option value="active" ${p?.status === 'active' ? 'selected' : ''}>${__('common.active')}</option><option value="inactive" ${p?.status === 'inactive' ? 'selected' : ''}>${__('common.inactive')}</option></select>
          </div>
          <div class="form-group" style="display:flex;align-items:flex-end;padding-bottom:8px;">
            <label style="display:flex;align-items:center;gap:8px;cursor:pointer;">
              <input type="checkbox" id="pfBestseller" ${p?.bestseller ? 'checked' : ''} style="width:20px;height:20px;accent-color:var(--primary);">
              <span style="font-weight:700;">${__('admin.productModal.bestseller')}</span>
            </label>
          </div>
        </div>
        <div class="form-group"><label>${__('admin.productModal.video')}</label><input type="text" id="pfVideo" value="${p?.video || ''}" placeholder="${__('admin.productModal.videoPlaceholder')}"></div>
        <div class="form-group"><label>${__('admin.productModal.model3d')}</label><input type="text" id="pfModel3d" value="${p?.model3d || ''}" placeholder="${__('admin.productModal.model3dPlaceholder')}"></div>
        <div class="form-group">
          <label>${__('admin.productModal.images')}</label>
          <textarea id="pfImages" rows="3" placeholder="https://...image1.jpg&#10;https://...image2.jpg">${imagesStr}</textarea>
        </div>
        <div class="form-group"><label>${__('admin.productModal.description')}</label><textarea id="pfDescription" rows="3">${p?.description || ''}</textarea></div>
        <div class="form-group">
          <label>${__('admin.productModal.features')}</label>
          <textarea id="pfFeatures" rows="3" placeholder="${__('admin.productModal.features')}">${featuresStr}</textarea>
        </div>
        <div class="form-group"><label>${__('admin.productModal.tags')}</label><input type="text" id="pfTags" value="${tagsStr}" placeholder="${__('admin.productModal.tagsPlaceholder')}"></div>
        <div class="form-group">
          <label>${__('admin.productModal.related')}</label>
          <div style="margin-bottom:8px;"><input type="text" id="pfRelatedSearch" placeholder="${__('admin.productModal.relatedSearch')}" style="width:100%;padding:8px 12px;border:1px solid #ddd;border-radius:8px;font-size:14px;background:var(--bg);color:var(--text);"></div>
          <div id="pfRelatedList" style="display:grid;grid-template-columns:1fr 1fr;gap:6px;max-height:200px;overflow-y:auto;padding:8px;background:var(--bg);border:1px solid #eee;border-radius:8px;">
            ${DB.getProducts().map(rp => `<label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer;padding:4px 6px;border-radius:6px;background:${p?.relatedIds?.includes(rp.id) ? 'var(--primary)' : 'transparent'};color:${p?.relatedIds?.includes(rp.id) ? '#fff' : 'var(--text)'};" data-relate-id="${rp.id}">
              <input type="checkbox" value="${rp.id}" ${p?.relatedIds?.includes(rp.id) ? 'checked' : ''} style="accent-color:var(--primary);width:16px;height:16px;">
              <img src="${rp.images?.[0] || 'https://picsum.photos/seed/default/40/40'}" style="width:28px;height:28px;object-fit:cover;border-radius:4px;" onerror="this.src='https://picsum.photos/seed/default/40/40'">
              <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${rp.name}</span>
            </label>`).join('')}
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
          <div class="form-group"><label>${__('admin.productModal.rating')}</label><input type="number" id="pfRating" value="${p?.rating || 0}" min="0" max="5" step="0.1"></div>
          <div class="form-group"><label>${__('admin.productModal.reviews')}</label><input type="number" id="pfReviews" value="${p?.reviews || 0}" min="0"></div>
        </div>
        <div style="display:flex;gap:10px;">
          <button type="submit" class="btn btn-primary" style="flex:1;">${isEdit ? __('admin.productModal.save') : __('admin.productModal.create')}</button>
          <button type="button" class="btn btn-outline" onclick="document.querySelector('.modal-overlay')?.remove()">${__('common.cancel')}</button>
        </div>
      </form>`);

    function updatePricePreview() {
      const priceVal = parseFloat(document.getElementById('pfPrice')?.value) || 0;
      const discVal = parseFloat(document.getElementById('pfDiscount')?.value) || 0;
      const cur = document.getElementById('pfCurrency')?.value || 'toman';
      const preview = document.getElementById('pricePreview');
      if (discVal > 0 && priceVal > 0) {
        const oldP = Math.round(priceVal / (1 - discVal / 100));
        document.getElementById('previewOldPrice').textContent = DB.formatPrice(oldP, cur);
        document.getElementById('previewCurrentPrice').textContent = DB.formatPrice(priceVal, cur);
        document.getElementById('previewDiscountBadge').textContent = __('product.discount', {n: discVal});
        preview.style.display = 'block';
      } else {
        preview.style.display = 'none';
      }
    }
    ['pfPrice','pfDiscount'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('input', updatePricePreview);
    });
    const pfCur = document.getElementById('pfCurrency');
    if (pfCur) pfCur.addEventListener('change', updatePricePreview);
    updatePricePreview();

    document.getElementById('productForm').addEventListener('submit', e => {
      e.preventDefault();
      const g = id => document.getElementById(id)?.value || '';
      const features = g('pfFeatures').split('\n').map(s => s.trim()).filter(Boolean);
      const tags = g('pfTags').split(',').map(s => s.trim()).filter(Boolean);
      const images = g('pfImages').split('\n').map(s => s.trim()).filter(Boolean);
      if (!images.length) images.push('https://picsum.photos/seed/product/600/600');

      let video = g('pfVideo');
      const ytMatch = video.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/);
      if (ytMatch) video = `https://www.youtube.com/embed/${ytMatch[1]}`;

      const data = {
        name: g('pfName'), sku: g('pfSku'),
        price: parseInt(g('pfPrice')) || 0, currency: g('pfCurrency') || 'toman', discount: parseInt(g('pfDiscount')) || 0,
        category: g('pfCategory'), brand: g('pfBrand'),
        stock: parseInt(g('pfStock')) || 0, status: g('pfStatus'),
        video, model3d: g('pfModel3d'), images, description: g('pfDescription'),
        features, tags, rating: parseFloat(g('pfRating')) || 0, reviews: parseInt(g('pfReviews')) || 0,
        bestseller: document.getElementById('pfBestseller')?.checked || false,
        relatedIds: Array.from(document.querySelectorAll('#pfRelatedList input[type="checkbox"]:checked')).map(cb => parseInt(cb.value)).filter(n => !isNaN(n))
      };

      if (isEdit) { DB.updateProduct(id, data); UI.toast(__('admin.productModal.saved'), 'success'); }
      else { DB.addProduct(data); UI.toast(__('admin.productModal.created'), 'success'); }
      document.querySelector('.modal-overlay')?.remove();
      this.renderProducts(document.getElementById('adminContent'));
    });

    const relatedSearch = document.getElementById('pfRelatedSearch');
    const relatedList = document.getElementById('pfRelatedList');
    if (relatedSearch && relatedList) {
      relatedSearch.addEventListener('input', () => {
        const q = relatedSearch.value.trim().toLowerCase();
        relatedList.querySelectorAll('label').forEach(label => {
          const name = label.querySelector('span')?.textContent?.toLowerCase() || '';
          label.style.display = (!q || name.includes(q)) ? '' : 'none';
        });
      });
      relatedList.addEventListener('change', e => {
        if (e.target.matches('input[type="checkbox"]')) {
          const label = e.target.closest('label');
          if (label) {
            label.style.background = e.target.checked ? 'var(--primary)' : 'transparent';
            label.style.color = e.target.checked ? '#fff' : 'var(--text)';
          }
        }
      });
    }
  },

  // ─── CATEGORIES ───
  renderCategories(el) {
    const cats = DB.getCategories();
    el.innerHTML = `
      <div class="admin-table-wrap">
        <div class="admin-toolbar">
          <h3>${__('admin.categories.title', { n: cats.length })}</h3>
          <button class="btn btn-primary btn-sm" onclick="ADMIN.showCategoryModal()">${__('admin.categories.new')}</button>
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:16px;padding:20px;">
          ${cats.length ? cats.map(c => `
            <div style="background:var(--white);border:1px solid var(--gray-200);border-radius:var(--radius);padding:20px;display:flex;align-items:center;gap:16px;transition:var(--transition);">
              <div style="font-size:2.5rem;">${c.icon || '📁'}</div>
              <div style="flex:1;">
                <h4 style="font-weight:700;margin-bottom:2px;">${c.name}</h4>
                <span style="font-size:0.8rem;color:var(--gray-500);">${__('admin.categories.count', { n: c.count })}</span>
              </div>
              <div style="display:flex;gap:6px;">
                <button class="action-btn edit" onclick="ADMIN.showCategoryModal(${c.id})" title="${__('common.edit')}">✏️</button>
                <button class="action-btn delete" onclick="ADMIN.deleteCategory(${c.id})" title="${__('common.delete')}">🗑</button>
              </div>
            </div>`).join('') : '<div style="text-align:center;padding:40px;grid-column:1/-1;">'+__('admin.categories.empty')+'</div>'}
        </div>
      </div>`;
  },

  showCategoryModal(id) {
    const c = id ? DB.getCategory(id) : null;
    const title = c ? __('admin.categories.editModal') : __('admin.categories.newModal');
    UI.modal(title, `
      <form id="catForm">
        <div class="form-group"><label>${__('admin.categories.name')}</label><input type="text" id="cfName" value="${c?.name || ''}" required></div>
        <div class="form-group"><label>${__('admin.categories.icon')}</label><input type="text" id="cfIcon" value="${c?.icon || '📁'}" placeholder="📱"></div>
        <div class="form-group"><label>${__('admin.categories.sort')}</label><input type="number" id="cfSort" value="${c?.sort || DB._categories.length}" min="0"></div>
        <div style="display:flex;gap:10px;">
          <button type="submit" class="btn btn-primary" style="flex:1;">${c ? __('admin.categories.save') : __('admin.categories.create')}</button>
          <button type="button" class="btn btn-outline" onclick="document.querySelector('.modal-overlay')?.remove()">${__('common.cancel')}</button>
        </div>
      </form>`);
    document.getElementById('catForm').addEventListener('submit', e => {
      e.preventDefault();
      const g = id => document.getElementById(id)?.value || '';
      const data = { name: g('cfName'), icon: g('cfIcon'), sort: parseInt(g('cfSort')) || 0 };
      if (c) { DB.updateCategory(c.id, data); UI.toast(__('admin.categories.saved'), 'success'); }
      else { DB.addCategory(data); UI.toast(__('admin.categories.created'), 'success'); }
      document.querySelector('.modal-overlay')?.remove();
      this.renderCategories(document.getElementById('adminContent'));
    });
  },

  deleteCategory(id) {
    const c = DB.getCategory(id);
    if (!c) return;
    UI.modal(__('admin.categories.deleteTitle'), `
      <p>${__('admin.categories.deleteConfirm', { name: c.name })}</p>
      <p style="font-size:0.85rem;color:var(--gray-600);margin-top:8px;">${__('admin.categories.hasProducts', { n: c.count })}</p>
      <div style="display:flex;gap:10px;margin-top:20px;">
        <button class="btn btn-danger btn-sm" style="flex:1;background:var(--danger);color:white;" onclick="ADMIN.confirmDeleteCategory(${id})">🗑 ${__('common.delete')}</button>
        <button class="btn btn-outline btn-sm" onclick="document.querySelector('.modal-overlay')?.remove()">${__('common.cancel')}</button>
      </div>`);
  },

  confirmDeleteCategory(id) {
    DB.deleteCategory(id);
    document.querySelector('.modal-overlay')?.remove();
    this.renderCategories(document.getElementById('adminContent'));
  },

  // ─── ORDERS ───
  renderOrders(el) {
    const orders = DB.getOrders();
    el.innerHTML = `
      <div class="admin-table-wrap">
        <div class="admin-toolbar"><h3>${__('admin.orders.title', { n: orders.length })}</h3></div>
        <div style="overflow-x:auto;">
          <table class="admin-table">
            <thead><tr><th>${__('admin.table.code')}</th><th>${__('admin.table.customer')}</th><th>${__('admin.table.phone')}</th><th>${__('admin.table.address')}</th><th>${__('admin.table.date')}</th><th>${__('admin.table.amount')}</th><th>${__('admin.table.status')}</th><th>${__('admin.table.actions')}</th></tr></thead>
            <tbody>${orders.length ? orders.map(o => `
              <tr>
                <td>#${o.id}</td>
                <td>${o.customer?.name || '---'}</td>
                <td dir="ltr">${o.customer?.phone || '---'}</td>
                <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${o.customer?.address || ''}">${o.customer?.address || '---'}</td>
                <td>${o.date}</td>
                <td>${DB.formatPrice(o.total || 0)}</td>
                <td>
                  <select onchange="ADMIN.updateOrderStatus(${o.id}, this.value)" style="padding:4px 8px;border:2px solid var(--gray-200);border-radius:6px;font-family:inherit;font-size:0.8rem;">
                    <option value="pending" ${o.status === 'pending' ? 'selected' : ''}>${__('order.pending')}</option>
                    <option value="active" ${o.status === 'active' ? 'selected' : ''}>${__('order.completedFull')}</option>
                    <option value="inactive" ${o.status === 'inactive' ? 'selected' : ''}>${__('order.cancelledFull')}</option>
                  </select>
                </td>
                <td><button class="action-btn edit" onclick="ADMIN.viewOrder(${o.id})">👁</button></td>
              </tr>`).join('') : '<tr><td colspan="8" style="text-align:center;padding:40px;">'+__('admin.orders.empty')+'</td></tr>'}</tbody>
          </table>
        </div>
      </div>`;
  },

  updateOrderStatus(id, status) {
    DB.updateOrderStatus(id, status);
    UI.toast(__('admin.orders.updated'), 'success');
  },

  viewOrder(id) {
    const o = DB.getOrders().find(o => o.id === id);
    if (!o) return;
    const itemsHtml = (o.items || []).map(item =>
      `<div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--gray-200);">
        <span>${item.name || __('product.defaultName')}</span>
        <span>${item.qty} × ${DB.formatPrice(item.price, item.currency)}</span>
      </div>`).join('') || '<p>'+__('admin.orders.noItems')+'</p>';

    UI.modal(__('admin.orders.viewTitle', { id: o.id }), `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px;padding:16px;background:var(--gray-100);border-radius:var(--radius-sm);">
        <div><strong>${__('admin.orders.customer')}</strong><br>${o.customer?.name || '---'}</div>
        <div><strong>${__('admin.orders.phone')}</strong><br>${o.customer?.phone || '---'}</div>
        <div><strong>${__('admin.orders.date')}</strong><br>${o.date}</div>
        <div><strong>${__('admin.table.status')}</strong><br><span class="badge-status ${o.status}">${o.status === 'pending' ? __('order.pending') : o.status === 'active' || o.status === 'completed' ? __('order.completedFull') : __('order.cancelledFull')}</span></div>
        <div style="grid-column:1/-1;"><strong>${__('admin.table.address')}:</strong><br>${o.customer?.address || '---'}</div>
      </div>
      <h4 style="margin-bottom:10px;">${__('admin.orders.items')}</h4>
      ${itemsHtml}
      <div style="margin-top:16px;padding-top:12px;border-top:2px solid var(--gray-200);display:flex;justify-content:space-between;font-weight:800;font-size:1.1rem;">
        <span>${__('admin.orders.total')}</span>
        <span style="color:var(--primary);">${DB.formatPrice(o.total || 0)}</span>
      </div>`);
  },

  // ─── SETTINGS ───
  renderSettings(el) {
    const s = DB.getSettings();
    el.innerHTML = `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;">
        <div class="checkout-form">
          <h3>${__('admin.settings.storeInfo')}</h3>
          <form id="settingsForm">
            <div class="form-group"><label>${__('admin.settings.storeName')}</label><input type="text" id="sSiteName" value="${s.siteName || ''}"></div>
            <div class="form-group"><label>${__('admin.settings.description')}</label><textarea id="sDescription" rows="2">${s.description || ''}</textarea></div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
              <div class="form-group"><label>${__('admin.settings.phone')}</label><input type="text" id="sPhone" value="${s.phone || ''}" dir="ltr"></div>
              <div class="form-group"><label>${__('admin.settings.email')}</label><input type="email" id="sEmail" value="${s.email || ''}"></div>
            </div>
            <div class="form-group"><label>${__('admin.settings.address')}</label><textarea id="sAddress" rows="2">${s.address || ''}</textarea></div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
              <div class="form-group"><label>${__('admin.settings.shipping')}</label><input type="number" id="sShipping" value="${s.shippingCost || 150000}"></div>
              <div class="form-group"><label>${__('admin.settings.freeShipping')}</label><input type="number" id="sFreeShipping" value="${s.freeShippingMin || 3000000}"></div>
            </div>
            <button type="submit" class="btn btn-primary" style="width:100%;">${__('admin.settings.save')}</button>
          </form>
        </div>
        <div>
          <div class="checkout-form" style="margin-bottom:20px;">
            <h3>${__('admin.settings.social')}</h3>
            <form id="socialForm">
              <div class="form-group"><label>${__('admin.settings.instagram')}</label><input type="text" id="sInstagram" value="${s.socialMedia?.instagram || ''}"></div>
              <div class="form-group"><label>${__('admin.settings.telegram')}</label><input type="text" id="sTelegram" value="${s.socialMedia?.telegram || ''}"></div>
              <div class="form-group"><label>${__('admin.settings.whatsapp')}</label><input type="text" id="sWhatsapp" value="${s.socialMedia?.whatsapp || ''}"></div>
              <div class="form-group"><label>${__('admin.settings.baleBot')}</label><input type="text" id="sBaleBot" value="${s.baleBot?.botUsername || ''}" placeholder="bizshop_bot"></div>
              <button type="submit" class="btn btn-primary" style="width:100%;">${__('admin.settings.socialSave')}</button>
            </form>
          </div>
          <div class="checkout-form">
            <h3>${__('admin.settings.theme')}</h3>
            <form id="themeForm">
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
                <div class="form-group"><label>${__('admin.settings.primaryColor')}</label><input type="color" id="sPrimaryColor" value="${s.theme?.primaryColor || '#6C5CE7'}" style="height:44px;padding:4px;"></div>
                <div class="form-group"><label>${__('admin.settings.secondaryColor')}</label><input type="color" id="sSecondaryColor" value="${s.theme?.secondaryColor || '#FD79A8'}" style="height:44px;padding:4px;"></div>
              </div>
              <button type="submit" class="btn btn-primary" style="width:100%;">${__('admin.settings.themeSave')}</button>
            </form>
          </div>
        </div>
      </div>
      <div class="checkout-form" style="margin-top:20px;border:2px solid var(--secondary);">
        <h3 style="display:flex;align-items:center;gap:8px;">🔐 ${__('admin.languages.title')}</h3>
        <p style="font-size:0.85rem;color:var(--gray-500);margin:4px 0 12px;">${__('admin.languages.desc')}</p>
        <div style="margin-bottom:12px;">
          <label style="display:block;margin-bottom:6px;font-weight:600;">${__('admin.languages.setPassword')}</label>
          <div style="display:flex;gap:8px;">
            <input type="password" id="langPassInput" placeholder="${__('admin.languages.passwordPlaceholder')}" style="flex:1;padding:8px 12px;border:1px solid var(--border,#ddd);border-radius:6px;font-size:14px;background:var(--card,#fff);color:var(--text,#333);">
            <button class="btn btn-primary" id="langPassSaveBtn">${__('admin.languages.savePassword')}</button>
          </div>
        </div>
        <div style="margin-bottom:12px;">
          <label style="display:block;margin-bottom:6px;font-weight:600;">${__('admin.languages.unlockToChange')}</label>
          <div style="display:flex;gap:8px;">
            <input type="password" id="langUnlockInput" placeholder="${__('admin.languages.unlockPlaceholder')}" style="flex:1;padding:8px 12px;border:1px solid var(--border,#ddd);border-radius:6px;font-size:14px;background:var(--card,#fff);color:var(--text,#333);">
            <button class="btn btn-outline" id="langUnlockBtn">${__('admin.languages.unlock')}</button>
          </div>
          <span id="langUnlockStatus" style="font-size:0.8rem;"></span>
        </div>
        <div id="langToggleArea" style="opacity:0.4;pointer-events:none;display:flex;gap:16px;flex-wrap:wrap;">
          <label style="display:flex;align-items:center;gap:6px;cursor:pointer;padding:8px 14px;background:var(--bg,#f5f5f5);border-radius:8px;">
            <input type="checkbox" id="langFa" ${(s.enabledLanguages?.fa !== false) ? 'checked' : ''} style="width:18px;height:18px;accent-color:var(--primary);"> 🇮🇷 فارسی
          </label>
          <label style="display:flex;align-items:center;gap:6px;cursor:pointer;padding:8px 14px;background:var(--bg,#f5f5f5);border-radius:8px;">
            <input type="checkbox" id="langEn" ${(s.enabledLanguages?.en !== false) ? 'checked' : ''} style="width:18px;height:18px;accent-color:var(--primary);"> 🇬🇧 English
          </label>
          <label style="display:flex;align-items:center;gap:6px;cursor:pointer;padding:8px 14px;background:var(--bg,#f5f5f5);border-radius:8px;">
            <input type="checkbox" id="langAr" ${(s.enabledLanguages?.ar !== false) ? 'checked' : ''} style="width:18px;height:18px;accent-color:var(--primary);"> 🇦🇪 العربية
          </label>
          <button class="btn btn-primary" id="langSaveBtn" style="font-size:0.85rem;">${__('admin.languages.saveLanguages')}</button>
        </div>
      </div>
      <div class="checkout-form" style="margin-top:20px;border:2px solid var(--primary);">
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:12px;">
          <div>
            <h3 style="display:flex;align-items:center;gap:6px;">${__('admin.slider.title')}</h3>
            <p style="font-size:0.8rem;color:var(--gray-500);margin-top:2px;">${__('admin.slider.desc')}</p>
          </div>
          <div style="display:flex;align-items:center;gap:12px;">
            <div style="display:inline-flex;border-radius:20px;overflow:hidden;border:2px solid var(--gray-300);direction:ltr;">
              <button type="button" class="slider-mode-btn ${(s.slideshowEnabled !== false) ? 'active' : ''}" data-mode="slideshow" onclick="document.getElementById('slideshowToggle').checked=true;document.querySelectorAll('.slider-mode-btn').forEach(b=>b.classList.toggle('active',b.dataset.mode==='slideshow'))">🔄 ${__('admin.slider.slideshowMode')}</button>
              <button type="button" class="slider-mode-btn ${(s.slideshowEnabled === false) ? 'active' : ''}" data-mode="static" onclick="document.getElementById('slideshowToggle').checked=false;document.querySelectorAll('.slider-mode-btn').forEach(b=>b.classList.toggle('active',b.dataset.mode==='static'))" style="border-right:1px solid var(--gray-300);">📌 ${__('admin.slider.staticMode')}</button>
            </div>
            <input type="checkbox" id="slideshowToggle" ${(s.slideshowEnabled !== false) ? 'checked' : ''} style="display:none;">
            <button class="btn btn-primary" onclick="ADMIN.saveSlider()" style="font-size:0.85rem;">${__('admin.slider.saveAll')}</button>
          </div>
        </div>
        <div id="sliderItems"></div>
        <button class="btn btn-secondary btn-sm" onclick="ADMIN.addSliderItem()" id="addSliderBtn" style="margin-top:8px;">${__('admin.slider.add')}</button>
      </div>
      <div id="mobileSettingsWrap" style="margin-top:20px;"></div>`;
    document.getElementById('settingsForm').addEventListener('submit', e => {
      e.preventDefault();
      DB.saveSettings({ ...DB.getSettings(), siteName: document.getElementById('sSiteName').value, description: document.getElementById('sDescription').value, phone: document.getElementById('sPhone').value, email: document.getElementById('sEmail').value, address: document.getElementById('sAddress').value, shippingCost: parseInt(document.getElementById('sShipping').value) || 0, freeShippingMin: parseInt(document.getElementById('sFreeShipping').value) || 0 });
      UI.toast(__('admin.settings.saved'), 'success');
    });
    document.getElementById('socialForm').addEventListener('submit', e => {
      e.preventDefault();
      DB.saveSettings({ ...DB.getSettings(), socialMedia: { instagram: document.getElementById('sInstagram').value, telegram: document.getElementById('sTelegram').value, whatsapp: document.getElementById('sWhatsapp').value, bale: `https://ble.ir/${document.getElementById('sBaleBot').value}` } });
      UI.toast(__('admin.settings.saved'), 'success');
    });
    document.getElementById('themeForm').addEventListener('submit', e => {
      e.preventDefault();
      const primary = document.getElementById('sPrimaryColor').value;
      const secondary = document.getElementById('sSecondaryColor').value;
      DB.saveSettings({ ...DB.getSettings(), theme: { primaryColor: primary, secondaryColor: secondary } });
      document.documentElement.style.setProperty('--primary', primary);
      document.documentElement.style.setProperty('--secondary', secondary);
      UI.toast(__('admin.settings.themeSaved'), 'success');
    });
    document.getElementById('langPassSaveBtn').addEventListener('click', () => {
      const pass = document.getElementById('langPassInput').value;
      if (pass.length < 4) { UI.toast(__('admin.languages.passwordTooShort'), 'error'); return; }
      DB.setLangPassword(pass);
      document.getElementById('langPassInput').value = '';
      UI.toast(__('admin.languages.passwordSaved'), 'success');
    });
    document.getElementById('langUnlockBtn').addEventListener('click', () => {
      const input = document.getElementById('langUnlockInput').value;
      const status = document.getElementById('langUnlockStatus');
      if (DB.verifyLangPassword(input)) {
        document.getElementById('langToggleArea').style.opacity = '1';
        document.getElementById('langToggleArea').style.pointerEvents = 'auto';
        document.getElementById('langUnlockInput').value = '';
        status.textContent = '✅ ' + __('admin.languages.unlocked');
        status.style.color = 'green';
      } else {
        status.textContent = '❌ ' + __('admin.languages.wrongPassword');
        status.style.color = 'red';
      }
    });
    document.getElementById('langSaveBtn').addEventListener('click', () => {
      const langs = {
        fa: document.getElementById('langFa').checked,
        en: document.getElementById('langEn').checked,
        ar: document.getElementById('langAr').checked
      };
      DB.saveSettings({ ...DB.getSettings(), enabledLanguages: langs });
      UI.toast(__('admin.languages.saved'), 'success');
    });
    if (!DB.getSettings().langPassword) {
      document.getElementById('langToggleArea').style.opacity = '1';
      document.getElementById('langToggleArea').style.pointerEvents = 'auto';
    }
    this.renderSliderItems();
    this.renderMobileSettings();
  },

  renderSliderItems() {
    const s = DB.getSettings();
    let slides = s.heroSlider || [];
    if (!slides.length) {
      slides = [
        { id: 1, title: __('hero.default1.title'), subtitle: __('hero.default1.sub'), btnText: __('hero.default1.btn'), btnLink: 'products.html?sort=discount', image: 'https://picsum.photos/seed/bizslide1/1600/600', pinned: false },
        { id: 2, title: __('hero.default2.title'), subtitle: __('hero.default2.sub'), btnText: __('hero.default2.btn'), btnLink: 'products.html?brand=بیز', image: 'https://picsum.photos/seed/bizslide2/1600/600', pinned: false },
        { id: 3, title: __('hero.default3.title'), subtitle: __('hero.default3.sub'), btnText: __('hero.default3.btn'), btnLink: 'products.html', image: 'https://picsum.photos/seed/bizslide3/1600/600', pinned: false },
        { id: 4, title: __('hero.default4.title'), subtitle: __('hero.default4.sub'), btnText: __('hero.default4.btn'), btnLink: 'products.html?category=الکترونیک', image: 'https://picsum.photos/seed/bizslide4/1600/600', pinned: false }
      ];
    }
    const container = document.getElementById('sliderItems');
    if (!container) return;
    container.innerHTML = slides.map((slide, i) => `
      <div class="slider-item" style="background:var(--white);border:1px solid var(--gray-200);border-radius:12px;padding:16px;margin-bottom:12px;box-shadow:var(--shadow-sm);${slide.pinned ? 'border-right:4px solid var(--warning);' : ''}">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;flex-wrap:wrap;gap:8px;">
          <div style="display:flex;align-items:center;gap:12px;">
            <span style="font-weight:700;color:var(--primary);font-size:0.9rem;">${__('admin.slider.slide', { n: i + 1 })}</span>
            <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:0.8rem;color:var(--gray-600);user-select:none;">
              <input type="checkbox" class="sli-pinned" ${slide.pinned ? 'checked' : ''} style="width:16px;height:16px;cursor:pointer;">
              ${__('admin.slider.pinned')}
            </label>
          </div>
          <button class="btn btn-danger btn-sm" onclick="ADMIN.removeSliderItem(this)" style="font-size:0.8rem;padding:4px 12px;">${__('admin.slider.delete')}</button>
        </div>
        <div style="display:flex;gap:16px;flex-wrap:wrap;">
          <div style="flex:2;min-width:250px;">
            <div class="form-group" style="margin-bottom:10px;">
              <label style="font-size:0.8rem;font-weight:600;color:var(--gray-600);display:block;margin-bottom:4px;">${__('admin.slider.imageLabel')}</label>
              <input type="text" class="sli-img" value="${slide.image || ''}" placeholder="https://picsum.photos/seed/..." style="width:100%;padding:8px 12px;border:1.5px solid var(--gray-300);border-radius:6px;font-family:inherit;font-size:0.85rem;direction:ltr;">
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
              <div class="form-group" style="margin-bottom:8px;">
                <label style="font-size:0.8rem;font-weight:600;color:var(--gray-600);display:block;margin-bottom:4px;">${__('admin.slider.titleField')}</label>
                <input type="text" class="sli-title" value="${slide.title || ''}" placeholder="${__('admin.slider.titleField')}" style="width:100%;padding:8px 12px;border:1.5px solid var(--gray-300);border-radius:6px;font-family:inherit;font-size:0.85rem;">
              </div>
              <div class="form-group" style="margin-bottom:8px;">
                <label style="font-size:0.8rem;font-weight:600;color:var(--gray-600);display:block;margin-bottom:4px;">${__('admin.slider.subtitle')}</label>
                <input type="text" class="sli-sub" value="${slide.subtitle || ''}" placeholder="${__('admin.slider.subtitle')}" style="width:100%;padding:8px 12px;border:1.5px solid var(--gray-300);border-radius:6px;font-family:inherit;font-size:0.85rem;">
              </div>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
              <div class="form-group" style="margin-bottom:0;">
                <label style="font-size:0.8rem;font-weight:600;color:var(--gray-600);display:block;margin-bottom:4px;">${__('admin.slider.btnText')}</label>
                <input type="text" class="sli-btn" value="${slide.btnText || ''}" placeholder="${__('admin.slider.btnText')}" style="width:100%;padding:8px 12px;border:1.5px solid var(--gray-300);border-radius:6px;font-family:inherit;font-size:0.85rem;">
              </div>
              <div class="form-group" style="margin-bottom:0;">
                <label style="font-size:0.8rem;font-weight:600;color:var(--gray-600);display:block;margin-bottom:4px;">${__('admin.slider.btnLink')}</label>
                <input type="text" class="sli-link" value="${slide.btnLink || ''}" placeholder="products.html?sort=discount" style="width:100%;padding:8px 12px;border:1.5px solid var(--gray-300);border-radius:6px;font-family:inherit;font-size:0.85rem;">
              </div>
            </div>
          </div>
          <div style="flex:1;min-width:160px;display:flex;flex-direction:column;gap:8px;">
            <div style="background:var(--gray-100);border-radius:8px;padding:8px;text-align:center;">
              <div style="font-size:0.7rem;color:var(--gray-500);margin-bottom:4px;">${__('admin.slider.preview')}</div>
              ${slide.image
                ? `<img src="${slide.image}" style="width:100%;height:auto;aspect-ratio:1600/600;object-fit:cover;border-radius:6px;border:1px solid var(--gray-300);" alt="preview" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%221600%22 height=%22600%22><rect fill=%22%23f0f0f0%22 width=%221600%22 height=%22600%22/><text x=%22800%22 y=%22300%22 text-anchor=%22middle%22 fill=%22%23999%22 font-size=%2230%22>${__('admin.slider.invalidImage')}</text></svg>'">`
                : `<div style="width:100%;aspect-ratio:1600/600;background:var(--gray-200);border-radius:6px;display:flex;align-items:center;justify-content:center;color:var(--gray-400);font-size:0.8rem;">${__('admin.slider.noImage')}</div>`}
              <div style="font-size:0.65rem;color:var(--gray-400);margin-top:4px;">${__('admin.slider.dimensions')}</div>
              ${slide.pinned ? '<div style="font-size:0.7rem;color:#B7950B;margin-top:4px;">'+__('admin.slider.pinnedMode')+'</div>' : ''}
            </div>
          </div>
        </div>
      </div>
    `).join('');
  },

  addSliderItem() {
    const s = DB.getSettings();
    const slides = s.heroSlider || [];
    if (slides.length >= 6) { UI.toast(__('admin.slider.maxReached'), 'warning'); return; }
    slides.push({ id: Date.now(), title: '', subtitle: '', btnText: '', btnLink: '', image: '', pinned: false });
    DB.saveSettings({ heroSlider: slides });
    this.renderSliderItems();
  },

  removeSliderItem(btn) {
    const item = btn.closest('.slider-item');
    const container = document.getElementById('sliderItems');
    const idx = Array.from(container.children).indexOf(item);
    if (idx === -1) return;
    const s = DB.getSettings();
    const slides = s.heroSlider || [];
    slides.splice(idx, 1);
    DB.saveSettings({ heroSlider: slides });
    this.renderSliderItems();
    UI.toast(__('admin.slider.deleted'), 'success');
  },

  saveSlider() {
    const container = document.getElementById('sliderItems');
    if (!container) return;
    const items = container.querySelectorAll('.slider-item');
    const slides = Array.from(items).map(item => ({
      id: Date.now() + Math.random(),
      title: item.querySelector('.sli-title')?.value || '',
      subtitle: item.querySelector('.sli-sub')?.value || '',
      btnText: item.querySelector('.sli-btn')?.value || '',
      btnLink: item.querySelector('.sli-link')?.value || '',
      image: item.querySelector('.sli-img')?.value || '',
      pinned: item.querySelector('.sli-pinned')?.checked || false
    })).filter(s => s.image);
    const slideshowEnabled = document.getElementById('slideshowToggle')?.checked ?? true;
    DB.saveSettings({ slideshowEnabled, heroSlider: slides });
    this.renderSliderItems();
    UI.toast(__('admin.slider.saved'), 'success');
  },

  renderMobileSettings() {
    const s = DB.getSettings();
    const m = s.mobile || {};
    const container = document.getElementById('mobileSettingsWrap');
    if (!container) return;
    container.innerHTML = `
      <div class="checkout-form" style="margin-top:20px;border:2px solid var(--secondary);">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:16px;">
          <span style="font-size:1.3rem;">📱</span>
          <h3 style="margin:0;">${__('admin.mobile.title')}</h3>
        </div>
        <form id="mobileForm">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;">
            <div>
              <div class="form-group">
                <label style="display:flex;align-items:center;gap:8px;cursor:pointer;">
                  <input type="checkbox" id="mHideTopbar" ${m.hideTopbar ? 'checked' : ''} style="width:18px;height:18px;cursor:pointer;">
                  ${__('admin.mobile.hideTopbar')}
                </label>
              </div>
              <div class="form-group">
                <label style="display:flex;align-items:center;gap:8px;cursor:pointer;">
                  <input type="checkbox" id="mHideSocial" ${m.hideSocial ? 'checked' : ''} style="width:18px;height:18px;cursor:pointer;">
                  ${__('admin.mobile.hideSocial')}
                </label>
              </div>
            </div>
            <div>
              <div class="form-group">
                <label>${__('admin.mobile.productCols')}</label>
                <select id="mProductCols" style="width:100%;padding:12px 16px;border:2px solid var(--gray-200);border-radius:var(--radius-sm);font-family:var(--font);font-size:0.9rem;">
                  <option value="2" ${(m.productCols || 2) == 2 ? 'selected' : ''}>${__('admin.mobile.cols2')}</option>
                  <option value="1" ${m.productCols == 1 ? 'selected' : ''}>${__('admin.mobile.cols1')}</option>
                </select>
              </div>
              <div class="form-group">
                <label>${__('admin.mobile.sliderHeight')}</label>
                <input type="number" id="mSliderHeight" value="${m.sliderHeight || 280}" style="width:100%;padding:12px 16px;border:2px solid var(--gray-200);border-radius:var(--radius-sm);font-family:var(--font);font-size:0.9rem;">
                <span style="font-size:0.75rem;color:var(--gray-500);">${__('admin.mobile.defaultHeight')}</span>
              </div>
            </div>
          </div>
          <button type="submit" class="btn btn-primary" style="width:100%;margin-top:8px;">${__('admin.mobile.save')}</button>
        </form>
      </div>`;

    document.getElementById('mobileForm').addEventListener('submit', e => {
      e.preventDefault();
      const mobile = {
        hideTopbar: document.getElementById('mHideTopbar').checked,
        hideSocial: document.getElementById('mHideSocial').checked,
        productCols: parseInt(document.getElementById('mProductCols').value) || 2,
        sliderHeight: parseInt(document.getElementById('mSliderHeight').value) || 280
      };
      DB.saveSettings({ mobile });
      UI.toast(__('admin.mobile.saved'), 'success');
    });
  }
};

async function initAdminPanel() {
  await ADMIN.init();
  const sidebar = document.getElementById('sidebar');
  const hamburger = document.getElementById('hamburger');
  if (hamburger && sidebar) {
    hamburger.style.display = '';
    const overlay = document.getElementById('sidebarOverlay');
    if (!overlay) return;
    hamburger.addEventListener('click', () => {
      sidebar.classList.toggle('active');
      overlay.classList.toggle('active');
    });
    overlay.addEventListener('click', () => {
      sidebar.classList.remove('active');
      overlay.classList.remove('active');
    });
  }
}
