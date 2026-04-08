/* ═══════════════════════════════════════════
   components.js — Ortaq JS komponentlər
   Header, Footer, Toast, Modal açıb-bağlama
   ═══════════════════════════════════════════ */

/* ══════════════════════════════
   HEADER — dinamik render
   ══════════════════════════════ */
function renderHeader() {
  const user = auth.getUser();

  const headerHTML = `
    <a class="logo" href="/index.html">
      <div class="logo-icon">
        <svg viewBox="0 0 24 24"><path d="M12 2C9.24 2 7 4.24 7 7v1H5c-1.1 0-2 .9-2 2v11c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2h-2V7c0-2.76-2.24-5-5-5zm0 2c1.66 0 3 1.34 3 3v1H9V7c0-1.66 1.34-3 3-3zm0 10c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2z"/></svg>
      </div>
      <span class="logo-name">MO<span>DA</span></span>
    </a>

    <div class="header-right">
      <button class="btn-cart" id="cartBtn" title="Səbət">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4zM3 6h18M16 10a4 4 0 01-8 0"/>
        </svg>
        <span class="cart-badge" id="cartBadge" style="display:none">0</span>
      </button>

      ${user
        ? `<button class="btn-user" id="userBtn">
             <div class="avatar">${user.name.charAt(0).toUpperCase()}</div>
             <span>${user.name.split(' ')[0]}</span>
           </button>`
        : `<button class="btn-signin" id="signinBtn">
             <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
               <circle cx="12" cy="8" r="4"/>
               <path d="M4 20c0-4 3.58-7 8-7s8 3 8 7"/>
             </svg>
             <span>Daxil ol</span>
           </button>`
      }
    </div>
  `;

  const header = document.querySelector('header');
  if (header) {
    header.innerHTML = headerHTML;
    initHeaderEvents();
  }

  updateCartBadge();
}

function initHeaderEvents() {
  const signinBtn = document.getElementById('signinBtn');
  const cartBtn   = document.getElementById('cartBtn');
  const userBtn   = document.getElementById('userBtn');

  if (signinBtn) signinBtn.addEventListener('click', () => modal.open('authModal'));
  if (cartBtn)   cartBtn.addEventListener('click', () => modal.open('cartModal'));
  if (userBtn)   userBtn.addEventListener('click', () => {
    if (confirm('Çıxmaq istəyirsiniz?')) {
      auth.logout();
      renderHeader();
      toast.show('Uğurla çıxış edildi', 'success');
    }
  });
}

/* ══════════════════════════════
   FOOTER — dinamik render
   ══════════════════════════════ */
function renderFooter() {
  const footerHTML = `
    <div class="footer-grid">
      <div class="footer-brand">
        <span class="logo-name">MO<span style="color:var(--accent)">DA</span></span>
        <p>Ən yeni geyim trendlərini kəşf edin.<br>Keyfiyyət, üslub və rahatlıq.</p>
      </div>
      <div class="footer-col">
        <h4>Kateqoriyalar</h4>
        <ul>
          <li><a href="#">Qadın</a></li>
          <li><a href="#">Kişi</a></li>
          <li><a href="#">Uşaq</a></li>
          <li><a href="#">Aksesuarlar</a></li>
        </ul>
      </div>
      <div class="footer-col">
        <h4>Kömək</h4>
        <ul>
          <li><a href="#">Çatdırılma</a></li>
          <li><a href="#">Qaytarma</a></li>
          <li><a href="#">Ölçü Cədvəli</a></li>
          <li><a href="#">Əlaqə</a></li>
        </ul>
      </div>
      <div class="footer-col">
        <h4>Haqqımızda</h4>
        <ul>
          <li><a href="#">Biz kimik</a></li>
          <li><a href="#">Karyera</a></li>
          <li><a href="#">Gizlilik</a></li>
          <li><a href="#">Şərtlər</a></li>
        </ul>
      </div>
    </div>
    <div class="footer-bottom">
      <p>© 2025 MODA. Bütün hüquqlar qorunur.</p>
    </div>
  `;

  const footer = document.querySelector('footer');
  if (footer) footer.innerHTML = footerHTML;
}

/* ══════════════════════════════
   MODAL — açıb-bağlama
   ══════════════════════════════ */
const modal = {
  open(id) {
    const el = document.getElementById(id);
    if (el) el.classList.add('open');
  },
  close(id) {
    const el = document.getElementById(id);
    if (el) el.classList.remove('open');
  },
  closeAll() {
    document.querySelectorAll('.overlay').forEach(el => el.classList.remove('open'));
  }
};

// ESC ilə bağla, kənara kliklə bağla
document.addEventListener('keydown', e => { if (e.key === 'Escape') modal.closeAll(); });
document.addEventListener('click', e => {
  if (e.target.classList.contains('overlay')) modal.closeAll();
  if (e.target.classList.contains('modal-close')) modal.closeAll();
});

/* ══════════════════════════════
   TOAST BİLDİRİŞ
   ══════════════════════════════ */
const toast = {
  container: null,

  init() {
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.className = 'toast-container';
      document.body.appendChild(this.container);
    }
  },

  show(message, type = 'default', duration = 3000) {
    this.init();
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.innerHTML = `
      ${type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ'} ${message}
    `;
    this.container.appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity 0.3s'; }, duration - 300);
    setTimeout(() => t.remove(), duration);
  }
};

/* ══════════════════════════════
   SƏBƏT BADGE YENİLƏ
   ══════════════════════════════ */
function updateCartBadge() {
  const badge = document.getElementById('cartBadge');
  if (!badge) return;
  const count = cart.getCount();
  badge.textContent = count;
  badge.style.display = count > 0 ? 'flex' : 'none';
}

/* ══════════════════════════════
   SAYFA YÜKLƏNƏNDƏ
   ══════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  renderHeader();
  renderFooter();
});
