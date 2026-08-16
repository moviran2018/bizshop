const DB = {
  _menu: [], _reservations: [], _settings: null,
  async init() { await this._loadAll(I18n.lang); },
  async _loadAll(lang) {
    try {
      const stored = localStorage.getItem('nobu_menu_' + lang);
      if (stored) this._menu = JSON.parse(stored);
      else { const r = await fetch('/restaurant/data/menu_' + lang + '.json'); this._menu = await r.json(); }
      const res = localStorage.getItem('nobu_reservations_' + lang);
      if (res) this._reservations = JSON.parse(res); else this._reservations = [];
      const s = localStorage.getItem('nobu_settings_' + lang);
      if (s) this._settings = JSON.parse(s); else this._settings = {};
    } catch (e) { this._menu = []; this._reservations = []; this._settings = {}; }
  },
  async switchLanguage(lang) { this._menu = []; this._settings = null; await this._loadAll(lang); },
  getMenu() { return this._menu; },
  getMenuByCategory(cat) { return this._menu.filter(i => i.category === cat); },
  getCategories() { return [...new Set(this._menu.map(i => i.category))]; },
  getReservations() { return this._reservations; },
  addReservation(data) {
    data.id = Date.now();
    data.trackingCode = 'NOBU-' + Math.random().toString(36).substring(2,8).toUpperCase();
    data.createdAt = new Date().toISOString();
    data.status = 'confirmed';
    this._reservations.push(data);
    this._sync();
    return data;
  },
  getSettings() { return this._settings || {}; },
  saveSettings(s) { this._settings = { ...this._settings, ...s }; this._sync(); },
  _sync() {
    const lang = I18n.lang;
    localStorage.setItem('nobu_menu_' + lang, JSON.stringify(this._menu));
    localStorage.setItem('nobu_reservations_' + lang, JSON.stringify(this._reservations));
    localStorage.setItem('nobu_settings_' + lang, JSON.stringify(this._settings || {}));
  },
  isLangEnabled(lang) {
    const s = this.getSettings();
    const langs = s.enabledLanguages || { fa: true, en: true, ar: true };
    return langs[lang] !== false;
  }
};
