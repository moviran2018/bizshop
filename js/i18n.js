const I18n = {
  lang: 'fa',
  _strings: {},
  _loaded: false,
  _callbacks: [],

  async init() {
    this.lang = localStorage.getItem('bizshop_lang') || 'fa';
    await this._load(this.lang);
    this._apply();
  },

  async _load(code) {
    try {
      const res = await fetch(`/lang/${code}.json`);
      this._strings = await res.json();
      this._loaded = true;
    } catch (e) {
      if (code !== 'fa') {
        try {
          const res = await fetch('/lang/fa.json');
          this._strings = await res.json();
          this.lang = 'fa';
        } catch (e2) { this._strings = {}; }
      } else { this._strings = {}; }
    }
  },

  async switch(code) {
    if (code === this.lang && this._loaded) return;
    if (typeof DB !== 'undefined' && DB.isLangEnabled && !DB.isLangEnabled(code)) {
      return;
    }
    this.lang = code;
    localStorage.setItem('bizshop_lang', code);
    await this._load(code);
    this._apply();
    this._callbacks.forEach(cb => cb(code));
    document.dispatchEvent(new CustomEvent('langchange', { detail: { lang: code } }));
    // Removed location.reload() call from langchange handler in main.js
    // The langchange handler now only updates button states
    if (typeof DB !== 'undefined' && DB.switchLanguage) {
      await DB.switchLanguage(code);
    }
    location.reload();
  },

  onSwitch(cb) { this._callbacks.push(cb); },

  _apply() {
    document.documentElement.lang = this.lang === 'en' ? 'en' : this.lang === 'ar' ? 'ar' : 'fa';
    document.documentElement.dir = this._strings.dir || (this.lang === 'en' ? 'ltr' : 'rtl');
    document.documentElement.style.setProperty('--dir', document.documentElement.dir);
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.dataset.i18n;
      if (key && el.childElementCount === 0) el.textContent = this.__(key);
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.dataset.i18nPlaceholder;
      if (key) el.placeholder = this.__(key);
    });
    document.querySelectorAll('[data-i18n-content]').forEach(el => {
      const key = el.dataset.i18nContent;
      if (key) el.setAttribute('content', this.__(key));
    });
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
      const key = el.dataset.i18nTitle;
      if (key) el.title = this.__(key);
    });
    document.querySelectorAll('[data-i18n-html]').forEach(el => {
      const key = el.dataset.i18nHtml;
      if (key) el.innerHTML = this.__(key);
    });
    document.querySelectorAll('[data-i18n-aria]').forEach(el => {
      const key = el.dataset.i18nAria;
      if (key) el.setAttribute('aria-label', this.__(key));
    });
  },

  __(key, vars = {}) {
    let t = this._strings[key] || key;
    for (const [k, v] of Object.entries(vars)) t = t.replace(`{${k}}`, v);
    return t;
  },

  __n(key, count, vars = {}) {
    return this.__(key, { n: count, ...vars });
  },

  formatPrice(amount, currency) {
    const s = this._strings;
    const free = s.priceFree || 'رایگان';
    if (!amount || amount === 0) return free;
    const CURRENCIES = {
      toman: { fa: 'تومان', en: 'Toman', ar: 'تومان', pos: 'after' },
      rial: { fa: 'ریال', en: 'Rial', ar: 'ريال', pos: 'after' },
      usd: { fa: 'دلار', en: '$', ar: 'دولار', pos: 'before' },
      eur: { fa: 'یورو', en: '€', ar: 'يورو', pos: 'before' },
      aed: { fa: 'درهم', en: 'AED', ar: 'درهم', pos: 'after' },
      sar: { fa: 'ریال سعودی', en: 'SAR', ar: 'ريال سعودي', pos: 'after' },
      kwd: { fa: 'دینار', en: 'KWD', ar: 'دينار', pos: 'after' },
      omr: { fa: 'ریال عمان', en: 'OMR', ar: 'ريال عمان', pos: 'after' },
      qar: { fa: 'ریال قطر', en: 'QAR', ar: 'ريال قطر', pos: 'after' },
      bhd: { fa: 'دینار بحرین', en: 'BHD', ar: 'دينار بحرين', pos: 'after' }
    };
    let unit, pos;
    if (currency && CURRENCIES[currency]) {
      unit = CURRENCIES[currency][this.lang] || CURRENCIES[currency].en;
      pos = CURRENCIES[currency].pos;
    } else {
      unit = s.priceUnit || 'تومان';
      pos = 'after';
    }
    const formatted = amount.toLocaleString(this.lang === 'en' ? 'en-US' : this.lang === 'ar' ? 'ar-SA' : 'fa-IR');
    return pos === 'before' ? `${unit}${formatted}` : `${formatted} ${unit}`;
  },

  getDir() { return this._strings.dir || (this.lang === 'en' ? 'ltr' : 'rtl'); },
  isRTL() { return this.getDir() === 'rtl'; },
  isArabic() { return this.lang === 'ar'; },
  isEnglish() { return this.lang === 'en'; }
};

const __ = I18n.__.bind(I18n);
const __n = I18n.__n.bind(I18n);
