/* ═══════════════════════════════════════════
   components.js — Ortaq JS komponentlər
   Header, Footer, Toast, Modal açıb-bağlama
   ═══════════════════════════════════════════ */

/* ══════════════════════════════
   HEADER — dinamik render
   ══════════════════════════════ */
function renderHeader() {
  const user = auth.getUser();

  const avatarHTML = user?.photoURL
    ? `<img src="${user.photoURL}" alt="${user.name}"
         style="width:26px;height:26px;border-radius:50%;object-fit:cover"/>`
    : `<span>${user ? user.name.charAt(0).toUpperCase() : ''}</span>`;

  const headerHTML = `
    <div class="header-logo-wrap">
      <a class="logo" href="/index.html">
        <div class="logo-icon">
          <svg viewBox="0 0 24 24"><path d="M12 2C9.24 2 7 4.24 7 7v1H5c-1.1 0-2 .9-2 2v11c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2h-2V7c0-2.76-2.24-5-5-5zm0 2c1.66 0 3 1.34 3 3v1H9V7c0-1.66 1.34-3 3-3zm0 10c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2z"/></svg>
        </div>
        <span class="logo-name">MO<span>DA</span></span>
      </a>
    </div>

    <div class="header-search">
      <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
      </svg>
      <input type="text" id="searchInput" placeholder="Məhsul, marka və ya kateqoriya axtar..." autocomplete="off" />
    </div>

    <div class="header-right">
      <button class="btn-cart" id="cartBtn" title="Səbət">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4zM3 6h18M16 10a4 4 0 01-8 0"/>
        </svg>
        <span class="cart-badge" id="cartBadge" style="display:none">0</span>
      </button>

      ${user
        ? `<button class="btn-user" id="userBtn">
             <div class="avatar">${avatarHTML}</div>
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
    initSearchPopup();
  }

  updateCartBadge();
}

function initHeaderEvents() {
  const signinBtn = document.getElementById('signinBtn');
  const cartBtn   = document.getElementById('cartBtn');
  const userBtn   = document.getElementById('userBtn');

  if (signinBtn) signinBtn.addEventListener('click', () => modal.open('authModal'));
  if (cartBtn)   cartBtn.addEventListener('click', () => modal.open('cartModal'));

  if (userBtn) userBtn.addEventListener('click', () => {
    window.location.href = 'profile.html';
  });
}

/* ══════════════════════════════
   SEARCH — Axtarış sistemi
   ══════════════════════════════ */
function initSearchPopup() {
  const input = document.getElementById('searchInput');
  if (!input) return;

  if (!document.getElementById('searchPopupOverlay')) {
    const overlay = document.createElement('div');
    overlay.id = 'searchPopupOverlay';
    overlay.className = 'search-popup-overlay';
    overlay.style.cssText = 'pointer-events: none; z-index: 50;';
    document.body.appendChild(overlay);

    const popup = document.createElement('div');
    popup.id = 'searchPopup';
    popup.className = 'search-popup';
    popup.innerHTML = `
      <div class="search-popup-header">
        <h3 id="searchPopupTitle">Axtarış nəticələri</h3>
        <button class="search-popup-close" id="searchPopupClose">✕</button>
      </div>
      <div class="search-popup-body" id="searchPopupBody"></div>
    `;
    document.body.appendChild(popup);

    document.getElementById('searchPopupClose').addEventListener('click', closeSearchPopup);
    overlay.addEventListener('click', closeSearchPopup);
  }

  let debounceTimer;
  input.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      const q = input.value.trim();
      if (q.length < 1) { closeSearchPopup(); return; }
      performSearch(q);
    }, 200);
  });

  input.addEventListener('keydown', e => {
    if (e.key === 'Escape') { closeSearchPopup(); input.blur(); }
  });
}

function performSearch(query) {
  const q = query.toLowerCase();

  const catMatches   = [];
  const brandMatches = [];
  const nameMatches  = [];

  PRODUCTS.forEach(p => {
    const inCat   = p.category && p.category.toLowerCase().includes(q);
    const inBrand = p.brand.toLowerCase().includes(q);
    const inName  = p.name.toLowerCase().includes(q);

    if (inCat)        catMatches.push(p);
    else if (inBrand) brandMatches.push(p);
    else if (inName)  nameMatches.push(p);
  });

  const results = { catMatches, brandMatches, nameMatches };
  renderSearchPopup(query, results);
}

function renderSearchPopup(query, results) {
  const { catMatches, brandMatches, nameMatches } = results;
  const total = catMatches.length + brandMatches.length + nameMatches.length;

  const title = document.getElementById('searchPopupTitle');
  if (title) title.textContent = total > 0
    ? `${total} nəticə tapıldı`
    : 'Nəticə tapılmadı';

  const body = document.getElementById('searchPopupBody');
  if (!body) return;

  if (total === 0) {
    body.innerHTML = `
      <div class="search-popup-empty">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="color:var(--border)">
          <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
        </svg>
        <span>"<strong>${query}</strong>" üzrə nəticə yoxdur</span>
      </div>
    `;
  } else {
    let html = '';

    if (catMatches.length > 0) {
      html += `<div class="search-result-group-label">Kateqoriya üzrə</div>`;
      html += catMatches.map(p => searchResultCard(p)).join('');
    }
    if (brandMatches.length > 0) {
      html += `<div class="search-result-group-label">Marka üzrə</div>`;
      html += brandMatches.map(p => searchResultCard(p)).join('');
    }
    if (nameMatches.length > 0) {
      html += `<div class="search-result-group-label">Məhsul adı üzrə</div>`;
      html += nameMatches.map(p => searchResultCard(p)).join('');
    }

    body.innerHTML = html;

    body.querySelectorAll('.search-result-cart').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const id = parseInt(btn.dataset.id);
        const product = PRODUCTS.find(p => p.id === id);
        if (product) cart.add(product);
      });
    });
  }

  openSearchPopup();
}

function searchResultCard(p) {
  const isSale = p.oldPrice !== null;
  return `
    <div class="search-result-item">
      <img class="search-result-img" src="${p.img}" alt="${p.name}" loading="lazy"/>
      <div class="search-result-info">
        <div class="search-result-brand">${p.brand}</div>
        <div class="search-result-name">${p.name}</div>
        <div class="search-result-price ${isSale ? 'sale' : ''}">${p.price} ₼</div>
      </div>
      <button class="search-result-cart" data-id="${p.id}" title="Səbətə əlavə et">
        <svg viewBox="0 0 24 24">
          <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4zM3 6h18M16 10a4 4 0 01-8 0"/>
        </svg>
      </button>
    </div>
  `;
}

function openSearchPopup() {
  const overlay = document.getElementById('searchPopupOverlay');
  const popup   = document.getElementById('searchPopup');
  if (overlay) { overlay.classList.add('open'); overlay.style.pointerEvents = 'auto'; }
  if (popup)   popup.classList.add('open');
}

function closeSearchPopup() {
  const overlay = document.getElementById('searchPopupOverlay');
  const popup   = document.getElementById('searchPopup');
  if (overlay) { overlay.classList.remove('open'); overlay.style.pointerEvents = 'none'; }
  if (popup)   popup.classList.remove('open');
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

document.addEventListener('keydown', e => { if (e.key === 'Escape') modal.closeAll(); });
document.addEventListener('click', e => {
  if (e.target.classList.contains('overlay'))     modal.closeAll();
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
    t.innerHTML = `${type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ'} ${message}`;
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
  badge.textContent   = count;
  badge.style.display = count > 0 ? 'flex' : 'none';
}

/* ══════════════════════════════
   SAYFA YÜKLƏNƏNDƏ
   ══════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  renderHeader();
  renderFooter();

  fbAuth.onAuthStateChanged(user => {
    cart.init(user ? user.uid : null);
    renderHeader();
  });
});
