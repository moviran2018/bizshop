const DB = {
  _products: [],
  _settings: null,
  _orders: [],
  _categories: [],

  async init() {
    const lang = I18n ? I18n.lang : 'fa';
    await this._loadAll(lang);
    window.dispatchEvent(new CustomEvent('dbready'));
  },

  async _loadAll(lang) {
    // Try localStorage first, then fall back to JSON files
    try {
      const stored = localStorage.getItem(`bizshop_products_${lang}`);
      if (stored) {
        this._products = JSON.parse(stored);
      } else {
        const res = await fetch(`/data/${lang}/products.json`);
        this._products = await res.json();
      }
    } catch (e) {
      this._products = [];
    }

    try {
      const stored = localStorage.getItem(`bizshop_categories_${lang}`);
      if (stored) {
        this._categories = JSON.parse(stored);
      } else {
        const res = await fetch(`/data/${lang}/categories.json`);
        this._categories = await res.json();
      }
    } catch (e) {
      this._categories = [];
    }

    try {
      const stored = localStorage.getItem(`bizshop_settings_${lang}`);
      if (stored) {
        this._settings = JSON.parse(stored);
      } else {
        const res = await fetch(`/data/${lang}/settings.json`);
        this._settings = await res.json();
      }
    } catch (e) {
      this._settings = {};
    }

    try {
      const stored = localStorage.getItem(`bizshop_orders_${lang}`);
      if (stored) {
        this._orders = JSON.parse(stored);
      } else {
        const res = await fetch(`/data/${lang}/orders.json`);
        this._orders = await res.json();
      }
    } catch (e) {
      this._orders = [];
    }

    // Load shared images if any product uses them
    const hasShared = this._products.some(p => p.shareImage);
    if (hasShared) {
      try {
        const res = await fetch('/data/shared/images.json');
        this._sharedImages = await res.json();
        this._products.forEach(p => {
          if (p.shareImage && this._sharedImages[p.id]) {
            p.images = this._sharedImages[p.id];
          }
        });
      } catch (e) {}
    }

    this._normalize();
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

  addProduct(product) {
    product.id = Date.now();
    product.sku = product.sku || `SKU-${product.id}`;
    product.status = product.status || 'active';
    product.createdAt = new Date().toLocaleDateString('fa-IR');
    const discount = product.discount || 0;
    const price = product.price || 0;
    product.oldPrice = (discount > 0 && price > 0) ? Math.round(price / (1 - discount / 100)) : 0;
    this._products.push(product);
    this._syncProducts();
    return product;
  },

  updateProduct(id, data) {
    const idx = this._products.findIndex(p => p.id === id);
    if (idx >= 0) {
      this._products[idx] = { ...this._products[idx], ...data };
      const p = this._products[idx];
      const discount = p.discount || 0;
      const price = p.price || 0;
      p.oldPrice = (discount > 0 && price > 0) ? Math.round(price / (1 - discount / 100)) : 0;
      this._syncProducts();
    }
    return this._products[idx];
  },

  deleteProduct(id, permanent = false) {
    if (permanent) this._products = this._products.filter(p => p.id !== id);
    else { const p = this.getProduct(id); if (p) p.status = 'deleted'; }
    this._syncProducts();
  },

  duplicateProduct(id) {
    const p = this.getProduct(id);
    if (!p) return null;
    const copy = { ...p, id: Date.now(), name: p.name + ' (' + __('common.copy') + ')', sku: `SKU-${Date.now()}`, status: 'inactive' };
    this._products.push(copy);
    this._syncProducts();
    return copy;
  },

  _syncProducts() {
    const lang = I18n ? I18n.lang : 'fa';
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

  addCategory(data) {
    const id = this._categories.length ? Math.max(...this._categories.map(c => c.id)) + 1 : 1;
    this._categories.push({ id, name: data.name, icon: data.icon || '📁', slug: data.name.replace(/ /g, '-'), count: 0, sort: data.sort || this._categories.length });
    this._syncCategories();
    return id;
  },

  updateCategory(id, data) {
    const idx = this._categories.findIndex(c => c.id === id);
    if (idx >= 0) { this._categories[idx] = { ...this._categories[idx], ...data }; this._syncCategories(); }
  },

  deleteCategory(id) {
    const cat = this.getCategory(id);
    if (!cat) return;
    const hasProducts = this._products.some(p => p.category === cat.name && p.status !== 'deleted');
    if (hasProducts) { UI.toast(__('category.hasProducts'), 'error'); return; }
    this._categories = this._categories.filter(c => c.id !== id);
    this._syncCategories();
  },

  _syncCategories() {
    const lang = I18n ? I18n.lang : 'fa';
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
  saveSettings(s) {
    this._settings = { ...this._settings, ...s };
    const lang = I18n ? I18n.lang : 'fa';
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
  addOrder(order) {
    const now = new Date();
    const lang = I18n ? I18n.lang : 'fa';
    const loc = lang === 'en' ? 'en-US' : lang === 'ar' ? 'ar-SA' : 'fa-IR';
    this._orders.unshift({ id: Date.now(), date: now.toLocaleDateString(loc), ...order, status: 'pending' });
    const langKey = I18n ? I18n.lang : 'fa';
    localStorage.setItem(`bizshop_orders_${langKey}`, JSON.stringify(this._orders));
    return this._orders;
  },
  getOrders() { return this._orders; },
  updateOrderStatus(orderId, status) {
    const order = this._orders.find(o => o.id === orderId);
    if (order) order.status = status;
    const lang = I18n ? I18n.lang : 'fa';
    localStorage.setItem(`bizshop_orders_${lang}`, JSON.stringify(this._orders));
    return this._orders;
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
