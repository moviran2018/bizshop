document.addEventListener('DOMContentLoaded', async () => {
  await I18n.init();
  await DB.init();
  initScrollAnimations();
  initHeaderScroll();
  initMobileMenu();
  initMenuTabs();
  initGallery();
  initReservationForm();
  initTestimonialSlider();
  initNewsletter();
  initChatbot();
});

const CAT_EMOJIS = { starters: '🦐', sushi: '🍣', hot: '🍱', dessert: '🍰', drink: '🍶' };
const CAT_CLASSES = { starters:'food', sushi:'ambient', hot:'food', dessert:'food', drink:'ambient' };

/* ─── Scroll Animations ─── */
function initScrollAnimations() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('active');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -60px 0px' });
  document.querySelectorAll('.reveal, .reveal-left, .reveal-right').forEach(el => observer.observe(el));
}

/* ─── Header Scroll Effect ─── */
function initHeaderScroll() {
  const header = document.querySelector('header');
  if (!header) return;
  window.addEventListener('scroll', () => {
    header.classList.toggle('scrolled', window.scrollY > 80);
  });
}

/* ─── Mobile Menu ─── */
function initMobileMenu() {
  const toggle = document.getElementById('mobileToggle');
  const nav = document.getElementById('mainNav');
  if (!toggle || !nav) return;
  toggle.addEventListener('click', () => nav.classList.toggle('open'));
  nav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => nav.classList.remove('open')));
}

/* ─── Menu Tabs ─── */
function initMenuTabs() {
  const tabs = document.querySelectorAll('.menu-tab');
  const grid = document.querySelector('.menu-grid');
  if (!tabs.length || !grid) return;
  const all = DB.getMenu();

  function render(cat) {
    const items = cat === 'all' ? all : all.filter(i => i.category === cat);
    grid.innerHTML = items.length
      ? items.map((item, idx) => `
        <div class="menu-item reveal" style="transition-delay:${idx * 0.05}s">
          <div class="menu-item-img img-${CAT_CLASSES[item.category] || 'food'} img-placeholder">
            ${CAT_EMOJIS[item.category] || '🍽'}
          </div>
          <div class="menu-item-body">
            <div class="menu-item-category">${I18n.__('menu.cat.' + item.category)}</div>
            <h3 class="menu-item-name">${item.name}</h3>
            <p class="menu-item-desc">${item.desc}</p>
            <div class="menu-item-footer">
              <span class="menu-item-price">${item.price}</span>
              ${item.badge ? '<span class="menu-item-badge">' + item.badge + '</span>' : ''}
            </div>
          </div>
        </div>`).join('')
      : '<p style="grid-column:1/-1;text-align:center;color:var(--text-muted);padding:40px;">' + I18n.__('common.loading') + '</p>';
    setTimeout(() => initScrollAnimations(), 100);
  }

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      render(tab.dataset.cat);
    });
  });
  const activeTab = [...tabs].find(t => t.classList.contains('active')) || tabs[0];
  activeTab.classList.add('active');
  render(activeTab.dataset.cat);
}

/* ─── Gallery ─── */
const GALLERY_EMOJIS = ['🍣','🍷','🌿','🍱','🌙','🥂','👨‍🍳','✨','🍶','🍰','🏮','🍵'];

function initGallery() {
  const grid = document.getElementById('galleryGrid');
  if (!grid) return;
  grid.innerHTML = GALLERY_EMOJIS.slice(0,8).map((emoji, i) => `
    <div class="gallery-item img-interior" style="background:linear-gradient(135deg,hsl(${i * 45},15%,12%),hsl(${i * 45},15%,8%))" onclick="openGallery(${i})">
      <span>${emoji}</span>
      <div class="gallery-overlay"><span>${I18n.__('gallery' + (i+1))}</span></div>
    </div>`).join('');
}

function openGallery(idx) {
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.95);z-index:9999;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:20px;cursor:pointer;animation:fadeIn .3s';
  overlay.innerHTML = `
    <div style="font-size:6rem">${GALLERY_EMOJIS[idx]}</div>
    <p style="color:var(--gold);font-family:var(--font-ui);font-size:0.7rem;letter-spacing:2px;text-transform:uppercase;">${I18n.__('gallery' + (idx+1))}</p>
  `;
  overlay.onclick = () => overlay.remove();
  document.head.insertAdjacentHTML('beforeend', '<style>@keyframes fadeIn{from{opacity:0}to{opacity:1}}</style>');
  document.body.appendChild(overlay);
}

/* ─── Reservation ─── */
function initReservationForm() {
  const formEl = document.getElementById('reservationFormEl');
  const form = document.getElementById('reservationForm');
  const success = document.getElementById('reservationSuccess');
  const codeEl = document.getElementById('trackingCode');
  const dateInput = document.getElementById('resvDate');
  if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];
  if (!formEl) return;
  formEl.addEventListener('submit', e => {
    e.preventDefault();
    const g = id => (document.getElementById(id)?.value || '').trim();
    const data = { name: g('resvName'), phone: g('resvPhone'), email: g('resvEmail'), date: g('resvDate'), time: g('resvTime'), guests: g('resvGuests'), requests: g('resvRequests') };
    if (!data.name || !data.phone || !data.date || !data.time) return;
    const result = DB.addReservation(data);
    form.style.display = 'none';
    success.style.display = 'block';
    codeEl.textContent = result.trackingCode;
  });
  document.getElementById('newReservation')?.addEventListener('click', () => {
    formEl.reset();
    form.style.display = 'block';
    success.style.display = 'none';
    if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];
  });
}

/* ─── Testimonial Slider ─── */
function initTestimonialSlider() {
  const container = document.getElementById('testimonialContainer');
  const dotsContainer = document.getElementById('testimonialDots');
  if (!container) return;
  const testimonials = [
    { stars: '★★★★★', text: '"کیفیت غذا و سرویس دهی فراتر از انتظار بود. ترکیب طعم‌های ژاپنی با این ظرافت واقعاً منحصربه‌فرد است."', author: 'سارا محمدی', role: 'مهمان ویژه' },
    { stars: '★★★★★', text: '"فضای رستوران، دکوراسیون و مهم‌تر از همه طعم غذاها فوق‌العاده بود."', author: 'امیر رضایی', role: 'مهمان' },
    { stars: '★★★★★', text: '"تجربه ناهار در نوبو تهران یکی از بهترین لحظات من بود. سوشی‌هایشان باورنکردنی است."', author: 'نینا احمدی', role: 'منتقد آشپزی' }
  ];
  let idx = 0, interval;
  function show(i) {
    i = i % testimonials.length;
    const t = testimonials[i];
    container.innerHTML = `<div class="testimonial-card reveal active"><div class="stars">${t.stars}</div><blockquote>${t.text}</blockquote><div class="author">${t.author}</div><div class="role">${t.role}</div></div>`;
    if (dotsContainer) {
      dotsContainer.querySelectorAll('.testimonial-dot').forEach((d, di) => d.classList.toggle('active', di === i));
    }
  }
  if (dotsContainer) {
    testimonials.forEach((_, i) => {
      const dot = document.createElement('button');
      dot.className = 'testimonial-dot' + (i === 0 ? ' active' : '');
      dot.onclick = () => { clearInterval(interval); idx = i; show(idx); startAuto(); };
      dotsContainer.appendChild(dot);
    });
  }
  show(0);
  function startAuto() { interval = setInterval(() => { idx++; show(idx); }, 5000); }
  startAuto();
}

/* ─── Newsletter ─── */
function initNewsletter() {
  const form = document.getElementById('newsletterForm');
  if (!form) return;
  form.addEventListener('submit', e => {
    e.preventDefault();
    const input = form.querySelector('input');
    if (input && input.value.trim()) {
      const btn = form.querySelector('button');
      const orig = btn.textContent;
      btn.textContent = '✓';
      setTimeout(() => { btn.textContent = orig; }, 2000);
      input.value = '';
    }
  });
}

/* ─── Chatbot ─── */
function initChatbot() {
  const toggle = document.getElementById('chatbotToggle');
  const win = document.getElementById('chatbotWindow');
  const close = document.getElementById('closeChat');
  const input = document.getElementById('chatInput');
  const send = document.getElementById('sendMessage');
  const messages = document.getElementById('chatMessages');
  if (!toggle || !win) return;

  function addMsg(text, isUser) {
    const div = document.createElement('div');
    div.className = 'chat-message ' + (isUser ? 'user' : 'bot');
    div.textContent = text;
    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
  }

  function getResponse(msg) {
    const m = msg.toLowerCase();
    if (/سلام|hi|hello|hey|علیک|درود/.test(m)) return 'سلام! 👋 به نوبو تهران خوش آمدید. برای مشاهده منو، رزرو میز یا هر سوالی، در خدمت شما هستم.';
    if (/منو|menu|غذا|food|dish/.test(m)) return '🍽 منوی ما شامل پیش‌غذا، سوشی، غذاهای اصلی، دسر و نوشیدنی است. برای جزئیات کامل به صفحه منو مراجعه کنید.';
    if (/رزرو|میز|reserve|book/.test(m)) return '🍽 با افتخار میز شما را رزرو می‌کنیم. به صفحه رزرو بروید یا با شماره ۰۲۱-۱۲۳۴۵۶۷۸ تماس بگیرید.';
    if (/آدرس|address|کجا|location/.test(m)) return '📍 تهران، الهیه، بلوار فرحزادی. همه‌روزه ۱۲:۰۰ تا ۲۳:۰۰.';
    if (/تلفن|phone|تماس|contact/.test(m)) return '📞 ۰۲۱-۱۲۳۴۵۶۷۸ | info@nobutehran.ir';
    if (/ساعت|hours|time/.test(m)) return '🕐 همه‌روزه ۱۲:۰۰ تا ۲۳:۰۰. آشپزخانه تا ۲۲:۰۰ فعال است.';
    if (/قیمت|price|قیمت|چنده/.test(m)) return '💰 قیمت‌ها از ۱۲۰,۰۰۰ تا ۱,۲۰۰,۰۰۰ تومان. منوی کامل با قیمت در صفحه منو.';
    if (/ویژه|پیشنهاد|special|offer|تخفیف/.test(m)) return '✨ پیشنهاد ویژه: دیش ساکی نوبو همراه با غذای اصلی با ۱۵٪ تخفیف.';
    if (/تشکر|ممنون|thanks/.test(m)) return 'خواهش می‌کنم! 🎉 روز خوشی داشته باشید.';
    return 'لطفاً دقیق‌تر بپرسید: منو، قیمت، رزرو، آدرس، تلفن، ساعت کاری. یا تماس ۰۲۱-۱۲۳۴۵۶۷۸.';
  }

  toggle.addEventListener('click', () => {
    win.classList.toggle('open');
    if (win.classList.contains('open') && messages.children.length <= 1) addMsg(I18n.__('chat.welcome'));
  });
  if (close) close.addEventListener('click', () => win.classList.remove('open'));

  function sendMsg() {
    const text = input.value.trim();
    if (!text) return;
    addMsg(text, true);
    input.value = '';
    setTimeout(() => addMsg(getResponse(text)), 500);
  }
  if (send) send.addEventListener('click', sendMsg);
  if (input) input.addEventListener('keydown', e => { if (e.key === 'Enter') sendMsg(); });
}
