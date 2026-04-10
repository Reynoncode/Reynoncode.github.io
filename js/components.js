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
        <span class="logo-name">AL<span>MODA</span></span>
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

  /* Mağaza axtarış kartı stilləri — bir dəfə inject et */
  if (!document.getElementById('storeSearchStyles')) {
    const style = document.createElement('style');
    style.id = 'storeSearchStyles';
    style.textContent = `
      /* ── Mağaza kartları cərgəsi ── */
      .search-store-row {
        display: flex;
        gap: 0.75rem;
        overflow-x: auto;
        padding: 0.25rem 0 0.85rem;
        scrollbar-width: none;
        -ms-overflow-style: none;
      }
      .search-store-row::-webkit-scrollbar { display: none; }

      .search-store-card {
        flex-shrink: 0;
        width: 148px;
        background: var(--bg, #f7f4f0);
        border: 1.5px solid var(--border, #e5e0d8);
        border-radius: 14px;
        padding: 1.1rem 0.85rem 0.9rem;
        text-align: center;
        cursor: pointer;
        transition: all 0.2s ease;
      }
      .search-store-card:hover {
        border-color: var(--accent, #c9a86c);
        transform: translateY(-3px);
        box-shadow: 0 8px 24px rgba(0,0,0,0.09);
      }

      .search-store-logo {
        width: 54px; height: 54px;
        border-radius: 50%;
        background: linear-gradient(135deg, #2c2c2c, #1a1a1a);
        color: #fff;
        display: flex; align-items: center; justify-content: center;
        font-family: 'Playfair Display', serif;
        font-size: 1.1rem; font-weight: 600;
        margin: 0 auto 0.65rem;
        box-shadow: 0 4px 12px rgba(0,0,0,0.18);
        overflow: hidden;
      }
      .search-store-logo img {
        width: 100%; height: 100%; object-fit: cover;
      }

      .search-store-name {
        font-size: 0.84rem; font-weight: 600;
        margin-bottom: 0.18rem;
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        color: var(--text, #1a1a1a);
      }
      .search-store-count {
        font-size: 0.72rem;
        color: var(--muted, #7a7a7a);
        margin-bottom: 0.7rem;
      }
      .search-store-goto {
        width: 100%;
        padding: 0.38rem 0.5rem;
        background: var(--accent, #c9a86c);
        color: #fff;
        border: none; border-radius: 8px;
        font-size: 0.72rem; font-weight: 600;
        cursor: pointer; transition: opacity 0.18s;
        font-family: inherit;
        letter-spacing: 0.02em;
      }
      .search-store-goto:hover { opacity: 0.85; }
    `;
    document.head.appendChild(style);
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

/* ── Axtarış məntiqi ── */
function performSearch(query) {
  const q = query.toLowerCase();

  const catMatches   = [];
  const brandMatches = [];
  const nameMatches  = [];
  const storeMap     = {};  /* uid → {uid, name, photoURL, count} */

  PRODUCTS.forEach(p => {
    const inCat   = p.category && p.category.toLowerCase().includes(q);
    const inBrand = p.brand    && p.brand.toLowerCase().includes(q);
    const inName  = p.name     && p.name.toLowerCase().includes(q);

    if (inCat)        catMatches.push(p);
    else if (inBrand) brandMatches.push(p);
    else if (inName)  nameMatches.push(p);

    /* Mağaza cəmi — yalnız Firebase elanlarından */
    if (p._fromFirebase && p.userId) {
      const sName = (p.storeName || '').toLowerCase();
      const bName = (p.brand     || '').toLowerCase();
      if (sName.includes(q) || bName.includes(q)) {
        if (!storeMap[p.userId]) {
          storeMap[p.userId] = {
            uid:      p.userId,
            name:     p.storeName || p.brand || 'Mağaza',
            photoURL: p.storePhotoURL || '',
            count:    0,
          };
        }
        storeMap[p.userId].count++;
      }
    }
  });

  const stores  = Object.values(storeMap);
  const results = { catMatches, brandMatches, nameMatches, stores };
  renderSearchPopup(query, results);
}

/* ── Nəticə popup render ── */
function renderSearchPopup(query, results) {
  const { catMatches, brandMatches, nameMatches, stores = [] } = results;
  const total = catMatches.length + brandMatches.length + nameMatches.length;

  const title = document.getElementById('searchPopupTitle');
  if (title) {
    const allCount = total + stores.length;
    title.textContent = allCount > 0
      ? `${allCount} nəticə tapıldı`
      : 'Nəticə tapılmadı';
  }

  const body = document.getElementById('searchPopupBody');
  if (!body) return;

  if (total === 0 && stores.length === 0) {
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

    /* 1. Mağazalar bölümü */
    if (stores.length > 0) {
      html += `<div class="search-result-group-label">Mağazalar</div>`;
      html += `<div class="search-store-row">${stores.map(s => searchStoreCard(s)).join('')}</div>`;
    }

    /* 2. Məhsullar */
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

/* ── Məhsul axtarış kart ── */
function searchResultCard(p) {
  const isSale = p.oldPrice !== null;
  return `
    <div class="search-result-item">
      <img class="search-result-img" src="${(p.imgs && p.imgs[0]) || p.img || ''}" alt="${p.name}" loading="lazy"/>
      <div class="search-result-info">
        <div class="search-result-brand">${p.brand || p.storeName || ''}</div>
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

/* ── Mağaza axtarış kart ── */
function searchStoreCard(store) {
  const initials = store.name
    .split(' ')
    .map(w => w[0] || '')
    .join('')
    .substring(0, 2)
    .toUpperCase();

  const logoHTML = store.photoURL
    ? `<img src="${store.photoURL}" alt="${store.name}"/>`
    : initials;

  return `
    <div class="search-store-card" onclick="window.location.href='store.html?uid=${store.uid}'">
      <div class="search-store-logo">${logoHTML}</div>
      <div class="search-store-name">${store.name}</div>
      <div class="search-store-count">${store.count} məhsul</div>
      <button class="search-store-goto"
        onclick="event.stopPropagation(); window.location.href='store.html?uid=${store.uid}'">
        Mağazaya keç →
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
        <span class="logo-name">AI<span style="color:var(--accent)">MODA</span></span>
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
