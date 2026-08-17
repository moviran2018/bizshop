const DB = {
  _products: [],
  _settings: null,
  _orders: [],
  _categories: [],
  _apiBase: '',
  _isOnline: true,
  _adminToken: localStorage.getItem('bizshop_admin_token') || '',

  get API() { return this._apiBase; },

  async init() {
    const lang = I18n ? I18n.lang : 'fa';
    await this._loadAll(lang);
    window.dispatchEvent(new CustomEvent('dbready'));
  },

  async _loadAll(lang) {
    // Try server API first
    const serverOk = await this._loadFromServer(lang);
    if (!serverOk) await this._loadFromStatic(lang);
    this._normalize();
  },

  async _loadFromServer(lang) {
    try {
      const res = await fetch(`/api/data?lang=${lang}`, { signal: AbortSignal.timeout(8000) });
      if (!res.ok) return false;
      const data = await res.json();
      if (!data.products || !data.products.length) return false;
      this._products = data.products;
      this._categories = data.categories || [];
      this._settings = data.settings || {};
      const ordersRes = await fetch(`/api/admin/orders?lang=${lang}`, { signal: AbortSignal.timeout(8000), headers: { Authorization: 'Bearer ' + this._adminToken } });
      if (ordersRes.ok) this._orders = await ordersRes.json();
      this._isOnline = true;
      return true;
    } catch (e) {
      this._isOnline = false;
      return false;
    }
  },

  async _loadFromStatic(lang) {
    try {
      const res = await fetch(`/data/${lang}/products.json`);
      this._products = await res.json();
    } catch (e) { this._products = []; }

    try {
      const res = await fetch(`/data/${lang}/categories.json`);
      this._categories = await res.json();
    } catch (e) { this._categories = []; }

    try {
      const res = await fetch(`/data/${lang}/settings.json`);
      this._settings = await res.json();
    } catch (e) { this._settings = {}; }

    try {
      const res = await fetch(`/data/${lang}/orders.json`);
      this._orders = await res.json();
    } catch (e) { this._orders = []; }
  },

  async switchLanguage(lang) {
    this._products = [];
    this._categories = [];
    this._settings = null;
    this._orders = [];
    await this._loadAll(lang);
  },

  _normalize() {
    this._products = this._products.map(p => {
      const discount = p.discount || 0;
      const price = p.price || 0;
      let oldPrice = 0;
      if (discount > 0 && price > 0) oldPrice = Math.round(price / (1 - discount / 100));
      return {
        ...p, sku: p.sku || `SKU-${p.id}`, status: p.status || 'active',
        currency: p.currency || 'toman', oldPrice, model3d: p.model3d || (p.id === 1 ? 'https://threejs.org/examples/models/gltf/DamagedHelmet/glTF/DamagedHelmet.gltf' : ''),
        images: (p.images && p.images.length) ? p.images : ['https://picsum.photos/seed/default/600/600'],
        features: p.features || [], tags: p.tags || [],
        createdAt: p.createdAt || '', bestseller: p.bestseller === true,
        relatedIds: Array.isArray(p.relatedIds) ? p.relatedIds : []
      };
    });
  },

  getProductName(p) { return p ? p.name : ''; },
  getProductDesc(p) { return p ? (p.description || '') : ''; },
  getProductFeatures(p) { return p ? (p.features || []) : []; },
  getProductBrand(p) { return p ? (p.brand || '') : ''; },

  // ─── Products ───
  getProducts(filters = {}) {
    let items = [...this._products];
    if (filters.status) items = items.filter(p => p.status === filters.status);
    else items = items.filter(p => p.status === 'active');
    if (filters.category) items = items.filter(p => p.category === filters.category);
    if (filters.brand) items = items.filter(p => p.brand === filters.brand);
    if (filters.search) {
      const q = filters.search.trim().toLowerCase();
      items = items.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.sku?.toLowerCase().includes(q) ||
        (p.tags || []).some(t => t.includes(q)) ||
        p.category?.includes(q)
      );
    }
    if (filters.minPrice) items = items.filter(p => p.price >= filters.minPrice);
    if (filters.maxPrice) items = items.filter(p => p.price <= filters.maxPrice);
    if (filters.stock === 'low') items = items.filter(p => p.stock < 10);
    if (filters.stock === 'out') items = items.filter(p => p.stock <= 0);
    if (filters.sort === 'price-asc') items.sort((a, b) => a.price - b.price);
    else if (filters.sort === 'price-desc') items.sort((a, b) => b.price - a.price);
    else if (filters.sort === 'discount') items.sort((a, b) => (b.discount || 0) - (a.discount || 0));
    else if (filters.sort === 'rating') items.sort((a, b) => b.rating - a.rating);
    else if (filters.sort === 'name') items.sort((a, b) => a.name.localeCompare(b.name));
    else items.sort((a, b) => b.id - a.id);
    return items;
  },

  getProduct(id) {
    return this._products.find(p => p.id === id) || null;
  },

  async addProduct(product) {
    product.id = Date.now();
    product.sku = product.sku || `SKU-${product.id}`;
    product.status = product.status || 'active';
    product.createdAt = new Date().toISOString();
    const discount = product.discount || 0;
    const price = product.price || 0;
    product.oldPrice = (discount > 0 && price > 0) ? Math.round(price / (1 - discount / 100)) : 0;
    this._products.unshift(product);
    await this._syncProducts();
    return product;
  },

  async updateProduct(id, data) {
    const idx = this._products.findIndex(p => p.id === id);
    if (idx >= 0) {
      this._products[idx] = { ...this._products[idx], ...data };
      const p = this._products[idx];
      const discount = p.discount || 0;
      const price = p.price || 0;
      p.oldPrice = (discount > 0 && price > 0) ? Math.round(price / (1 - discount / 100)) : 0;
      await this._syncProducts();
    }
    return this._products[idx];
  },

  async deleteProduct(id, permanent = false) {
    if (permanent) {
      this._products = this._products.filter(p => p.id !== id);
      await this._syncProducts();
    } else {
      const p = this.getProduct(id);
      if (p) { p.status = 'deleted'; await this._syncProducts(); }
    }
  },

  async duplicateProduct(id) {
    const p = this.getProduct(id);
    if (!p) return null;
    const copy = { ...p, id: Date.now(), name: p.name + ' (' + __('common.copy') + ')', sku: `SKU-${Date.now()}`, status: 'inactive' };
    this._products.unshift(copy);
    await this._syncProducts();
    return copy;
  },

  async _syncProducts() {
    const lang = I18n ? I18n.lang : 'fa';
    if (this._adminToken) {
      try {
        await fetch(`/api/admin/products?lang=${lang}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + this._adminToken },
          body: JSON.stringify(this._products),
          signal: AbortSignal.timeout(10000)
        });
      } catch (e) {}
    }
    localStorage.setItem(`bizshop_products_${lang}`, JSON.stringify(this._products));
    UI.toast(__('admin.settings.saved'), 'success');
  },

  // ─── Categories ───
  getCategories() {
    const cats = this._categories.map(c => ({ ...c, count: 0 }));
    this._products.forEach(p => {
      if (p.status !== 'deleted') {
        const found = cats.find(c => c.name === p.category);
        if (found) found.count++;
      }
    });
    return cats.sort((a, b) => a.sort - b.sort);
  },

  getCategory(id) {
    return this._categories.find(c => c.id === id) || null;
  },

  async addCategory(data) {
    const id = this._categories.length ? Math.max(...this._categories.map(c => c.id)) + 1 : 1;
    this._categories.push({ id, name: data.name, icon: data.icon || '📁', slug: data.name.replace(/ /g, '-'), count: 0, sort: data.sort || this._categories.length });
    await this._syncCategories();
    return id;
  },

  async updateCategory(id, data) {
    const idx = this._categories.findIndex(c => c.id === id);
    if (idx >= 0) { this._categories[idx] = { ...this._categories[idx], ...data }; await this._syncCategories(); }
  },

  async deleteCategory(id) {
    const cat = this.getCategory(id);
    if (!cat) return;
    const hasProducts = this._products.some(p => p.category === cat.name && p.status !== 'deleted');
    if (hasProducts) { UI.toast(__('category.hasProducts'), 'error'); return; }
    this._categories = this._categories.filter(c => c.id !== id);
    await this._syncCategories();
  },

  async _syncCategories() {
    const lang = I18n ? I18n.lang : 'fa';
    if (this._adminToken) {
      try {
        await fetch(`/api/admin/categories?lang=${lang}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + this._adminToken },
          body: JSON.stringify(this._categories),
          signal: AbortSignal.timeout(10000)
        });
      } catch (e) {}
    }
    localStorage.setItem(`bizshop_categories_${lang}`, JSON.stringify(this._categories));
  },

  // ─── Brands ───
  getBrands() {
    const b = {};
    this._products.filter(p => p.status !== 'deleted').forEach(p => {
      if (!b[p.brand]) b[p.brand] = { name: p.brand, count: 0 };
      b[p.brand].count++;
    });
    return Object.values(b).sort((a, b) => b.count - a.count);
  },

  // ─── Settings ───
  getSettings() {
    const s = this._settings || {};
    if (!s.enabledLanguages) s.enabledLanguages = { fa: true, en: true, ar: true };
    if (!s.langPassword) s.langPassword = '';
    return s;
  },
  async saveSettings(s) {
    this._settings = { ...this._settings, ...s };
    const lang = I18n ? I18n.lang : 'fa';
    if (this._adminToken) {
      try {
        await fetch(`/api/admin/settings?lang=${lang}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + this._adminToken },
          body: JSON.stringify(this._settings),
          signal: AbortSignal.timeout(10000)
        });
      } catch (e) {}
    }
    localStorage.setItem(`bizshop_settings_${lang}`, JSON.stringify(this._settings));
    UI.toast(__('admin.settings.themeSaved'), 'success');
  },
  isLangEnabled(lang) {
    const s = this.getSettings();
    const langs = s.enabledLanguages || { fa: true, en: true, ar: true };
    return langs[lang] !== false;
  },
  verifyLangPassword(input) {
    const s = this.getSettings();
    if (!s.langPassword) return true;
    return input === atob(s.langPassword);
  },
  setLangPassword(pass) {
    const s = this.getSettings();
    s.langPassword = pass ? btoa(pass) : '';
    this.saveSettings(s);
  },

  // ─── Cart ───
  getCart() { return JSON.parse(localStorage.getItem('bizshop_cart') || '[]'); },
  saveCart(cart) {
    localStorage.setItem('bizshop_cart', JSON.stringify(cart));
    this._updateCartBadge();
    window.dispatchEvent(new CustomEvent('cartchange', { detail: cart }));
  },
  addToCart(productId, qty = 1) {
    const cart = this.getCart();
    const idx = cart.findIndex(i => i.id === productId);
    if (idx >= 0) cart[idx].qty += qty;
    else cart.push({ id: productId, qty });
    this.saveCart(cart);
    return cart;
  },
  removeFromCart(productId) {
    let cart = this.getCart();
    cart = cart.filter(i => i.id !== productId);
    this.saveCart(cart);
    return cart;
  },
  updateCartQty(productId, qty) {
    const cart = this.getCart();
    const idx = cart.findIndex(i => i.id === productId);
    if (idx >= 0) { if (qty <= 0) return this.removeFromCart(productId); cart[idx].qty = qty; this.saveCart(cart); }
    return cart;
  },
  getCartTotal() {
    const cart = this.getCart();
    return cart.reduce((sum, i) => { const p = this.getProduct(i.id); return sum + (p ? p.price * i.qty : 0); }, 0);
  },
  getCartCount() { return this.getCart().reduce((sum, i) => sum + i.qty, 0); },
  _updateCartBadge() {
    const count = this.getCartCount();
    document.querySelectorAll('.cart-count').forEach(el => { el.textContent = count; el.style.display = count > 0 ? 'flex' : 'none'; });
  },

  // ─── Orders ───
  async addOrder(order) {
    const now = new Date();
    const lang = I18n ? I18n.lang : 'fa';
    const newOrder = { id: Date.now(), code: 'BZ' + Date.now().toString().slice(-6), date: now.toISOString(), ...order, status: 'pending' };
    this._orders.unshift(newOrder);
    // Sync to server
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...order, id: newOrder.id, code: newOrder.code, date: newOrder.date, lang }),
        signal: AbortSignal.timeout(10000)
      });
      if (res.ok) {
        const data = await res.json();
        if (data.order) Object.assign(newOrder, data.order);
      }
    } catch (e) {
      // Offline: keep in localStorage queue for later sync
      const queue = JSON.parse(localStorage.getItem('bizshop_order_queue') || '[]');
      queue.push(newOrder);
      localStorage.setItem('bizshop_order_queue', JSON.stringify(queue));
    }
    localStorage.setItem(`bizshop_orders_${lang}`, JSON.stringify(this._orders));
    return this._orders;
  },
  getOrders() { return this._orders; },
  async updateOrderStatus(orderId, status) {
    const order = this._orders.find(o => o.id === orderId);
    if (order) order.status = status;
    const lang = I18n ? I18n.lang : 'fa';
    if (this._adminToken) {
      try {
        await fetch(`/api/admin/orders/${orderId}/status?lang=${lang}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + this._adminToken },
          body: JSON.stringify({ status }),
          signal: AbortSignal.timeout(10000)
        });
      } catch (e) {}
    }
    localStorage.setItem(`bizshop_orders_${lang}`, JSON.stringify(this._orders));
    return this._orders;
  },
  async deleteOrder(orderId) {
    const lang = I18n ? I18n.lang : 'fa';
    this._orders = this._orders.filter(o => o.id !== orderId);
    if (this._adminToken) {
      try {
        await fetch(`/api/admin/orders/${orderId}?lang=${lang}`, {
          method: 'DELETE',
          headers: { 'Authorization': 'Bearer ' + this._adminToken },
          signal: AbortSignal.timeout(10000)
        });
      } catch (e) {}
    }
    localStorage.setItem(`bizshop_orders_${lang}`, JSON.stringify(this._orders));
    return this._orders;
  },

  // ─── Admin session ───
  async adminLogin(password) {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
        signal: AbortSignal.timeout(10000)
      });
      if (!res.ok) return { ok: false, error: (await res.json()).error };
      const data = await res.json();
      this._adminToken = data.token;
      localStorage.setItem('bizshop_admin_token', data.token);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: 'network' };
    }
  },
  async adminCheck() {
    if (!this._adminToken) return false;
    try {
      const res = await fetch('/api/auth/check', { headers: { 'Authorization': 'Bearer ' + this._adminToken }, signal: AbortSignal.timeout(8000) });
      return res.ok && (await res.json()).ok;
    } catch (e) { return false; }
  },
  adminLogout() {
    this._adminToken = '';
    localStorage.removeItem('bizshop_admin_token');
  },
  async adminGetStats() {
    const lang = I18n ? I18n.lang : 'fa';
    try {
      const res = await fetch(`/api/admin/stats?lang=${lang}`, { headers: { 'Authorization': 'Bearer ' + this._adminToken }, signal: AbortSignal.timeout(10000) });
      if (!res.ok) return null;
      return await res.json();
    } catch (e) { return null; }
  },
  async adminGetCustomers() {
    const lang = I18n ? I18n.lang : 'fa';
    try {
      const res = await fetch(`/api/admin/customers?lang=${lang}`, { headers: { 'Authorization': 'Bearer ' + this._adminToken }, signal: AbortSignal.timeout(10000) });
      if (!res.ok) return [];
      return await res.json();
    } catch (e) { return []; }
  },
  async adminExport() {
    const lang = I18n ? I18n.lang : 'fa';
    try {
      const res = await fetch(`/api/admin/export?lang=${lang}`, { headers: { 'Authorization': 'Bearer ' + this._adminToken }, signal: AbortSignal.timeout(10000) });
      if (!res.ok) return null;
      return await res.json();
    } catch (e) { return null; }
  },
  async adminImport(data) {
    const lang = I18n ? I18n.lang : 'fa';
    try {
      const res = await fetch(`/api/admin/import?lang=${lang}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + this._adminToken },
        body: JSON.stringify(data),
        signal: AbortSignal.timeout(10000)
      });
      return res.ok;
    } catch (e) { return false; }
  },

  // ─── Utilities ───
  formatPrice(price, currency) { return I18n ? I18n.formatPrice(price, currency) : (price?.toLocaleString('fa-IR') + ' تومان'); },
  formatDate(d) {
    const lang = I18n ? I18n.lang : 'fa';
    const loc = lang === 'en' ? 'en-US' : lang === 'ar' ? 'ar-SA' : 'fa-IR';
    return new Date(d).toLocaleDateString(loc);
  },
  generateSKU() { return `SKU-${Date.now().toString(36).toUpperCase()}`; },

  getFeaturedProducts() { return this._products.filter(p => p.discount >= 15 && p.status === 'active').slice(0, 8); },
  getNewProducts() { return [...this._products].filter(p => p.status === 'active').sort((a, b) => b.id - a.id).slice(0, 8); },
  getBestSellers() { return [...this._products].filter(p => p.status === 'active' && p.bestseller).slice(0, 8); },

  getStats() {
    const active = this._products.filter(p => p.status === 'active');
    return {
      totalProducts: active.length,
      totalOrders: this._orders.length,
      pendingOrders: this._orders.filter(o => o.status === 'pending').length,
      totalSales: this._orders.reduce((s, o) => s + (o.total || 0), 0),
      lowStock: active.filter(p => p.stock < 10).length,
      outOfStock: active.filter(p => p.stock <= 0).length,
      categories: this._categories.length
    };
  }
};
