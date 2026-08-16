const CHATBOT = {
  history: [],
  lastContext: null,

  init() {
    this.buildKnowledge();
    const toggle = document.getElementById('chatbotToggle');
    const chatWindow = document.getElementById('chatbotWindow');
    const close = document.getElementById('closeChat');
    const sendBtn = document.getElementById('sendMessage');
    const chatInput = document.getElementById('chatInput');
    if (toggle) toggle.addEventListener('click', () => {
      chatWindow.classList.toggle('active');
      if (chatWindow.classList.contains('active')) document.getElementById('chatMessages').scrollTop = document.getElementById('chatMessages').scrollHeight;
    });
    if (close) close.addEventListener('click', () => chatWindow.classList.remove('active'));
    if (sendBtn) sendBtn.addEventListener('click', () => this.sendMessage());
    if (chatInput) chatInput.addEventListener('keydown', e => { if (e.key === 'Enter') this.sendMessage(); });
    this.setupQuickReplies();
  },

  buildKnowledge() {
    this.products = DB.getProducts();
    this.settings = DB.getSettings();

    this.productIndex = {};
    this.products.forEach(p => {
      const words = new Set();
      const texts = [p.name, p.brand, p.category, p.description, ...p.tags, ...p.features];
      texts.forEach(t => {
        this._tokenize(t).forEach(w => { if (w.length > 1) words.add(w); });
      });
      words.forEach(w => {
        if (!this.productIndex[w]) this.productIndex[w] = [];
        this.productIndex[w].push(p.id);
      });
    });

    this.intents = [
      { id: 'greeting', keywords: ['سلام', 'درود', 'علیک', 'خوش اومدی', 'hi', 'hello', 'hey', 'سلا', 'خوشومد'], reply: () => {
        const count = this.products ? this.products.length : 0;
        return 'سلام! به بیزشاپ خوش اومدی. چطور میتونم کمکت کنم؟\n(📦 ' + count + ' محصول در فروشگاه موجوده)';
      } },
      { id: 'goodbye', keywords: ['خداحافظ', 'بای', 'خدا حافظ', 'میبینمت', 'فعلا', 'bye', 'goodbye', 'روز خوبی'], reply: 'خداحافظ! روز خوبی داشته باشی. هر وقت سوالی داشتی من اینجام.' },
      { id: 'thanks', keywords: ['ممنون', 'مرسی', 'تشکر', 'دمت گرم', 'سپاس', 'ممنونم', 'متشکرم', 'مرس'], reply: 'خواهش میکنم! همیشه خوشحال میشم کمک کنم.' },
      { id: 'hours', keywords: ['ساعت کاری', 'کی باز', 'ساعت', 'وقت کار', 'تعطیل', 'شیفت', 'ساعت‌کاری'], reply: () => `ساعت کاری ما ${this.settings.workingHours || '۹ صبح تا ۹ شب'} است.` },
      { id: 'shipping', keywords: ['ارسال', 'تحویل', 'پست', 'بسته', 'حمل', 'نقل', 'باربری', 'پیک', 'دلیوری'], reply: () => {
        const cost = this.settings.shippingCost ? this.settings.shippingCost.toLocaleString() : '۱۵۰,۰۰۰';
        const free = this.settings.freeShippingMin ? this.settings.freeShippingMin.toLocaleString() : '۳,۰۰۰,۰۰۰';
        return `ارسال به سراسر کشور ${cost} تومنه.\nاگه خریدت بالای ${free} تومان باشه، ارسال رایگانه.\nمعمولاً ۲۴ تا ۴۸ ساعت بعد سفارتو میرسی.`;
      }},
      { id: 'payment', keywords: ['پرداخت', 'درگاه', 'پول', 'کارت', 'آنلاین', 'کش', 'نقدی', 'محل', 'پرداخ'], reply: 'پرداخت آنلاین از درگاه‌های معتبر بانکی و پرداخت در محل (نقدی) هر دو امکان‌پذیره.' },
      { id: 'return', keywords: ['ضمانت', 'بازگشت', 'مرجوع', 'پس دادن', 'تعویض', 'برگشت', 'عوض'], reply: 'تا ۷ روز ضمانت بازگشت کالا داریم.\nاگه از محصول راضی نبودی، میتونی مرجوع کنی.\nکالا باید در بسته‌بندی اصلی باشه.' },
      { id: 'contact', keywords: ['تماس', 'تلفن', 'شماره', 'آدرس', 'کجاست', 'موقعیت', 'نشانی', 'ارتباط'], reply: () => `تلفن: ${this.settings.phone || '۰۹۱۲۳۴۵۶۷۸۹'}\nایمیل: ${this.settings.email || 'info@bizshop.ir'}\nآدرس: ${this.settings.address || 'تهران، خیابان ولیعصر، مجتمع تجاری بیز'}\nساعت پاسخگویی: ${this.settings.workingHours || '۹ صبح تا ۹ شب'}` },
      { id: 'brand', keywords: ['بیز', 'برند', 'biz', 'ایرانی', 'کیفیت'], reply: 'بیز یه برند ایرانی با کیفیت عالیه.\nمحصولات بیز با گارانتی اصالت و بهترین قیمت تو فروشگاه موجودن.\nبیشتر محصولات پرطرفدار ما از برند بیز هستن.' },
      { id: 'cart', keywords: ['سبد خرید', 'cart', 'سبد', 'خریدم', 'سفارش'], reply: 'برای دیدن سبد خریدت، روی آیکون سبد خرید بالای صفحه کلیک کن.\nاگه میخوای محصولی رو اضافه کنی، کنار هر محصول دکمه "افزودن به سبد" هست.' },
      { id: 'discount', keywords: ['تخفیف', 'حراج', 'off', 'صد', 'تخفیفات', 'جشنواره', 'شگفت', 'ویژه', 'پیشنهاد'], reply: () => {
        const discounted = this.products.filter(p => p.discount > 0);
        if (discounted.length === 0) return 'متاسفانه فعلاً تخفیفی نداریم.';
        let msg = 'محصولات دارای تخفیف:\n';
        discounted.forEach(p => { msg += `🔹 ${p.name} — ${p.discount}% تخفیف — ${p.price.toLocaleString()} تومان\n`; });
        return msg;
      }},
      { id: 'bestseller', keywords: ['پرفروش', 'محبوب', 'bestseller', 'پرطرفدار', 'بهترین'], reply: () => {
        const popular = this.products.filter(p => p.bestseller);
        if (popular.length === 0) return 'محصولات پرفروش:\n' + this.products.sort((a,b) => b.reviews - a.reviews).slice(0,3).map(p => `🔹 ${p.name} — ${p.price.toLocaleString()} تومان — ${p.reviews} نظر`).join('\n');
        return 'پرفروش‌ترین‌ها:\n' + popular.map(p => `🔹 ${p.name} — ${p.price.toLocaleString()} تومان (${p.discount}% تخفیف)`).join('\n');
      }},
      { id: 'available', keywords: ['موجود', 'دارین', 'دارید', 'انبار', 'تموم', 'stock'], reply: () => {
        const low = this.products.filter(p => p.stock < 10);
        let msg = 'همه محصولات (به جز موارد اعلام شده) موجودند.\n';
        if (low.length > 0) msg += '\n⚠️ موجودی محدود:\n' + low.map(p => `🔸 ${p.name} — فقط ${p.stock} عدد باقی مونده`).join('\n');
        return msg;
      }},
      { id: 'cheapest', keywords: ['ارزون', 'اقتصادی', 'قیمت مناسب', 'کمترین قیمت', 'بیشترین تخفیف'], reply: () => {
        const sorted = [...this.products].sort((a,b) => (a.price / (100 - (a.discount||0))) - (b.price / (100 - (b.discount||0))));
        return 'اقتصادی‌ترین محصولات:\n' + sorted.slice(0,5).map(p => `🔹 ${p.name} — ${p.price.toLocaleString()} تومان ${p.discount ? '(' + p.discount + '% تخفیف)' : ''}`).join('\n');
      }},
      { id: 'expensive', keywords: ['گرون', 'لوکس', 'خاص', 'حرفه', 'فوق'], reply: () => {
        const sorted = [...this.products].sort((a,b) => b.price - a.price);
        return 'محصولات ویژه:\n' + sorted.slice(0,5).map(p => `🔹 ${p.name} — ${p.price.toLocaleString()} تومان ${p.discount ? '(' + p.discount + '% تخفیف)' : ''}`).join('\n');
      }},
      { id: 'help', keywords: ['راهنما', 'help', 'کمک', 'چطور', 'نمیتونم', 'بلد نیستم', 'آموزش', 'راهنم'], reply: 'چطور میتونم کمک کنم؟\n\nمی‌تونم این کارها رو برات انجام بدم:\n🔸 معرفی محصولات\n🔸 قیمت و تخفیف‌ها\n🔸 قوانین ارسال\n🔸 نحوه پرداخت\n🔸 ضمانت و بازگشت\n🔸 اطلاعات تماس\n\nفقط اسم محصول یا سوالت رو بپرس.' },
    ];
  },

  _normalize(str) {
    return str.replace(/[يﻱﻲﻳﻴ]/g, 'ی').replace(/[كﻙﻚﻜﻛ]/g, 'ک').replace(/[ۀەﻩﻪﻫﻬ]/g, 'ه').replace(/[ؤﻮﻭٔ]/g, 'و').replace(/[إأٲٳٵ]/g, 'ا').trim().toLowerCase();
  },

  _tokenize(text) {
    if (!text) return [];
    return this._normalize(text).replace(/[،\.\+\-\(\)\[\]\{\}\/\\:؛"\'،؟!?٬٪×،‌]/g, ' ').split(/\s+/).filter(w => w.length > 0);
  },

  findProducts(query) {
    const words = this._tokenize(query.toLowerCase()).filter(w => w.length > 1);
    const results = [];

    this.products.forEach(p => {
      const nameTokens = this._tokenize(p.name.toLowerCase());
      const tagTokens = p.tags.map(t => t.toLowerCase());
      const catTokens = this._tokenize(p.category.toLowerCase());
      const brandTokens = this._tokenize(p.brand.toLowerCase());

      let matchType = 'none';
      let allWords = [...nameTokens, ...tagTokens, ...catTokens, ...brandTokens].filter(a => a.length > 1);

      words.forEach(w => {
        const exacts = allWords.filter(a => a === w);
        if (exacts.length > 0) matchType = 'name';

        const partials = allWords.filter(a => a.length >= 3 && w.length >= 3 && (a.includes(w) || w.includes(a)));
        if (partials.length > 0 && matchType === 'none') matchType = 'partial';
      });

      if (matchType === 'name') results.push({ product: p, type: 'name' });
      else if (matchType === 'partial') results.push({ product: p, type: 'partial' });
    });

    const ordered = results.sort((a, b) => {
      if (a.type === 'name' && b.type !== 'name') return -1;
      if (a.type !== 'name' && b.type === 'name') return 1;
      return 0;
    });

    return ordered.map(r => r.product).slice(0, 5);
  },

  detectIntent(msg) {
    const normalized = this._normalize(msg);
    const words = this._tokenize(msg);
    let best = null;
    let bestScore = 0;

    this.intents.forEach(intent => {
      let score = 0;
      intent.keywords.forEach(kw => {
        const kwLower = this._normalize(kw);
        if (normalized.includes(kwLower)) score += 2;
        words.forEach(w => {
          if (w.includes(kwLower) || kwLower.includes(w)) score += 0.5;
        });
      });
      if (score > bestScore) { bestScore = score; best = intent; }
    });

    return bestScore >= 1.5 ? best : null;
  },

  getResponse(msg) {
    if (!this.products || this.products.length === 0) {
      return '⚠️ اطلاعات محصولات هنوز بارگذاری نشده. لطفاً چند ثانیه صبر کن و دوباره بپرس.';
    }

    const products = this.findProducts(msg);
    if (products.length > 0) {
      this.lastContext = { intent: 'product', products: products.map(p => p.id) };
      let heading = products.length === 1
        ? `محصول "${products[0].name}" رو پیدا کردم:`
        : `${products.length} محصول پیدا کردم:`;
      const cards = products.map(p => {
        const img = p.images && p.images[0] ? p.images[0] : '';
        return `<div class="msg-product-item" onclick="window.location.href='${window.location.origin}/product?id=${p.id}'">
          <div class="msg-prod-img" style="width:50px;height:50px;background:#f0f0f0;border-radius:8px;overflow:hidden;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:1.5rem">${img ? '<img src="' + img + '" alt="' + p.name + '" style="width:100%;height:100%;object-fit:cover" onerror="this.style.display=\'none\';this.parentNode.textContent=\'' + (p.name[0] || '?') + '\'">' : p.name[0] || '?'}</div>
          <div class="msg-prod-info">
            <h5>${p.name}</h5>
            <span>${p.price.toLocaleString()} تومان ${p.discount ? '(' + p.discount + '% تخفیف)' : ''}</span>
            <div style="font-size:0.75rem;color:#999;margin-top:2px">⭐ ${p.rating} (${p.reviews} نظر) ${p.stock <= 5 ? '⚠️ فقط ' + p.stock + ' عدد' : ''}</div>
          </div>
        </div>`;
      }).join('');
      return heading + `<div class="msg-products">${cards}</div>`;
    }

    const intent = this.detectIntent(msg);
    if (intent) {
      const reply = typeof intent.reply === 'function' ? intent.reply() : intent.reply;
      this.lastContext = { intent: intent.id };
      return reply;
    }

    if (this.lastContext && this.lastContext.intent === 'product' && this.lastContext.products) {
      const prevProducts = this.lastContext.products.map(id => this.products.find(p => p.id === id)).filter(Boolean);
      const matchedPrice = msg.match(/[\d,]+/);
      if (matchedPrice) {
        const priceNum = parseInt(matchedPrice[0].replace(/,/g, ''));
        const range = prevProducts.filter(p => Math.abs(p.price - priceNum) < Math.max(p.price * 0.3, 50000));
        if (range.length > 0) {
          return 'این محصولات نزدیک به قیمت مد نظرت هستن:\n' + range.map(p => `🔹 ${p.name} — ${p.price.toLocaleString()} تومان — ${window.location.origin}/product?id=${p.id}`).join('\n');
        }
      }
      if (this._tokenize(msg).some(w => ['مشخصات', 'ویژگی', 'توضیح', 'درباره', 'اطلاعات'].includes(w))) {
        return prevProducts.map(p => `${p.name}:\n📝 ${p.description}\n✨ ${p.features.join(' | ')}\n🔗 ${window.location.origin}/product?id=${p.id}`).join('\n\n');
      }
    }

    const fallbacks = [
      'متوجه سوالت نشدم. چند تا راهنمایی:\n🔸 اسم محصول رو بگو (مثلاً "هدفون" یا "شارژر")\n🔸 بپرس "چه محصولاتی داری"\n🔸 درباره "قیمت" یا "تخفیف" بپرس',
      'نتونستم جوابتو پیدا کنم. میتونم کمکت کنم با:\n🔸 معرفی محصولات\n🔸 قیمت و تخفیف\n🔸 ارسال و پرداخت\n🔸 اطلاعات تماس\nاسم محصول یا سوالت رو بگو.',
      'دقیقاً چه چیزی میخوای؟\nمثلاً بپرس:\n"هدفون بلوتوث چنده؟"\n"ارسال رایگان چقدره؟"\n"پرفروش‌ترین محصولات کدومن؟"'
    ];
    return fallbacks[Math.floor(Math.random() * fallbacks.length)];
  },

  setupQuickReplies() {
    const container = document.getElementById('quickReplies');
    if (!container) return;
    const replies = (__('chatbot.quickReplies') || '').split(',');
    container.innerHTML = replies.map(r => `<button class="quick-reply-btn" onclick="CHATBOT.sendQuickReply('${r.trim()}')">${r.trim()}</button>`).join('');
  },

  sendQuickReply(text) {
    const input = document.getElementById('chatInput');
    if (input) { input.value = text; this.sendMessage(); }
  },

  async sendMessage() {
    const input = document.getElementById('chatInput');
    const messages = document.getElementById('chatMessages');
    if (!input || !messages) return;
    const text = input.value.trim();
    if (!text) return;

    messages.innerHTML += `<div class="chat-message user">${this.escapeHtml(text)}</div>`;
    input.value = '';

    const loadingId = 'loading-' + Date.now();
    messages.innerHTML += `<div class="chat-message bot" id="${loadingId}">🤔 در حال فکر کردن...</div>`;
    messages.scrollTop = messages.scrollHeight;

    this.history.push({ role: 'user', text });

    try {
      const resp = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, history: this.history }),
        signal: AbortSignal.timeout(6000)
      });
      const data = await resp.json();
      document.getElementById(loadingId)?.remove();

      if (data.reply && !data.reply.startsWith('⚠️') && !data.reply.startsWith('⛔')) {
        this.history.push({ role: 'bot', text: data.reply });
        messages.innerHTML += `<div class="chat-message bot">${this.escapeHtml(data.reply)}</div>`;
      } else {
        document.getElementById(loadingId)?.remove();
        this._offlineReply(text, messages);
      }
    } catch {
      document.getElementById(loadingId)?.remove();
      this._offlineReply(text, messages);
    }

    messages.scrollTop = messages.scrollHeight;
  },

  _offlineReply(text, messages) {
    const reply = this.getResponse(text);
    this.history.push({ role: 'bot', text: reply });
    messages.innerHTML += `<div class="chat-message bot">${reply}</div>`;
  },

  formatReply(text) {
    return text.replace(/\n/g, '<br>');
  },

  escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
};

function initChatbot() {
  CHATBOT.init();
}
