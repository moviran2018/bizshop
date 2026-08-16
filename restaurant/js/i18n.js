const I18n = { lang: 'fa', _strings: {}, _loaded: false, _cb: [], async init() {
  this.lang = localStorage.getItem('restaurant_lang') || 'fa';
  await this._load(this.lang); this._apply();
}, async _load(code) {
  try { const r = await fetch('/restaurant/lang/' + code + '.json'); this._strings = await r.json(); this._loaded = true; }
  catch (e) { if (code !== 'fa') { try { const r = await fetch('/restaurant/lang/fa.json'); this._strings = await r.json(); this.lang = 'fa'; } catch (e2) { this._strings = {}; } } else this._strings = {}; }
}, __(key, vars = {}) {
  let t = this._strings[key] || key;
  for (const [k, v] of Object.entries(vars)) t = t.replace('{' + k + '}', v);
  return t;
}, _apply() {
  document.querySelectorAll('[data-i18n]').forEach(el => { const k = el.dataset.i18n; if (k) el.textContent = this.__(k); });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => { const k = el.dataset.i18nPlaceholder; if (k) el.placeholder = this.__(k); });
  document.querySelectorAll('[data-i18n-title]').forEach(el => { const k = el.dataset.i18nTitle; if (k) el.title = this.__(k); });
}, async switch(code) {
  if (code === this.lang && this._loaded) return;
  if (typeof DB !== 'undefined' && DB.isLangEnabled && !DB.isLangEnabled(code)) return;
  this.lang = code; localStorage.setItem('restaurant_lang', code);
  await this._load(code); this._apply();
  this._cb.forEach(cb => cb(code));
  document.dispatchEvent(new CustomEvent('langchange', { detail: { lang: code } }));
  DB && DB.switchLanguage && await DB.switchLanguage(code);
  location.reload();
}, onSwitch(cb) { this._cb.push(cb); } };
const __ = I18n.__.bind(I18n);
