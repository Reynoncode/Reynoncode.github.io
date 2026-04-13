/* ═══════════════════════════════════════════
   components.js — Ortaq JS komponentlər
   Header, Footer, Toast, Modal açıb-bağlama
   ⚠️  lang.js bu fayldan ƏVVƏL yüklənməlidir
   ═══════════════════════════════════════════ */

/* ══════════════════════════════
   HEADER — dinamik render
   ══════════════════════════════ */
async function renderHeader() {
  const u = fbAuth.currentUser;
  let photoURL = null;
  let displayName = '';

  if (u) {
    try {
      const snap = await fbDb.collection('users').doc(u.uid).get();
      const data = snap.exists ? snap.data() : {};
      photoURL = data.photoURL || u.photoURL || null;
      const first = data.firstName || '';
      const last  = data.lastName  || '';
      displayName = (first + ' ' + last).trim() || u.displayName || u.email.split('@')[0];
    } catch(e) {
      displayName = u.displayName || u.email.split('@')[0];
    }
  }

  const user = u ? { name: displayName, photoURL } : null;

  const avatarHTML = photoURL
    ? `<img src="${photoURL}" alt="${displayName}" style="width:26px;height:26px;border-radius:50%;object-fit:cover"/>`
    : `<span>${displayName ? displayName.charAt(0).toUpperCase() : ''}</span>`;

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
      <input type="text" id="searchInput"
        placeholder="${t('header.search')}"
        autocomplete="off" />
    </div>

    <div class="header-right">
      <button class="btn-wishlist" id="wishlistBtn"
        onclick="openWishlistModal()"
        title="${t('header.wishlist')}">
        <svg width="20" height="20" viewBox="0 0 24 24"
          fill="none" stroke="currentColor" stroke-width="1.8">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06
                   a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84
                   a5.5 5.5 0 0 0 0-7.78z"/>
        </svg>
        <span class="wishlist-header-badge" id="wishlistHeaderBadge" style="display:none">0</span>
      </button>

      <button class="btn-cart" id="cartBtn" title="${t('header.cart')}">
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
             <span>${t('header.signin')}</span>
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
  if (typeof updateWishlistBadge === 'function') updateWishlistBadge();
}

function initHeaderEvents() {
  const signinBtn   = document.getElementById('signinBtn');
  const cartBtn     = document.getElementById('cartBtn');
  const userBtn     = document.getElementById('userBtn');
  const wishlistBtn = document.getElementById('wishlistBtn');

  if (signinBtn)    signinBtn.addEventListener('click',   () => modal.open('authModal'));
  if (cartBtn)      cartBtn.addEventListener('click',     () => modal.open('cartModal'));
  if (wishlistBtn)  wishlistBtn.addEventListener('click', () => {
    if (typeof openWishlistModal === 'function') openWishlistModal();
  });
  if (userBtn)      userBtn.addEventListener('click', () => {
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
        <h3 id="searchPopupTitle">${t('search.title')}</h3>
        <button class="search-popup-close" id="searchPopupClose">✕</button>
      </div>
      <div class="search-popup-body" id="searchPopupBody"></div>
    `;
    document.body.appendChild(popup);

    document.getElementById('searchPopupClose').addEventListener('click', closeSearchPopup);
    overlay.addEventListener('click', closeSearchPopup);
  }

  if (!document.getElementById('storeSearchStyles')) {
    const style = document.createElement('style');
    style.id = 'storeSearchStyles';
    style.textContent = `
      .search-store-row {
        display: flex; gap: 0.75rem; overflow-x: auto;
        padding: 0.25rem 0 0.85rem; scrollbar-width: none; -ms-overflow-style: none;
      }
      .search-store-row::-webkit-scrollbar { display: none; }
      .search-store-card {
        flex-shrink: 0; width: 148px;
        background: var(--bg, #f7f4f0); border: 1.5px solid var(--border, #e5e0d8);
        border-radius: 14px; padding: 1.1rem 0.85rem 0.9rem;
        text-align: center; cursor: pointer; transition: all 0.2s ease;
      }
      .search-store-card:hover { border-color: var(--accent, #c9a86c); transform: translateY(-3px); box-shadow: 0 8px 24px rgba(0,0,0,0.09); }
      .search-store-logo {
        width: 54px; height: 54px; border-radius: 50%;
        background: linear-gradient(135deg, #2c2c2c, #1a1a1a); color: #fff;
        display: flex; align-items: center; justify-content: center;
        font-family: 'Playfair Display', serif; font-size: 1.1rem; font-weight: 600;
        margin: 0 auto 0.65rem; box-shadow: 0 4px 12px rgba(0,0,0,0.18); overflow: hidden;
      }
      .search-store-logo img { width: 100%; height: 100%; object-fit: cover; }
      .search-store-name { font-size: 0.84rem; font-weight: 600; margin-bottom: 0.18rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: var(--text, #1a1a1a); }
      .search-store-count { font-size: 0.72rem; color: var(--muted, #7a7a7a); margin-bottom: 0.7rem; }
      .search-store-goto {
        width: 100%; padding: 0.38rem 0.5rem; background: var(--accent, #c9a86c); color: #fff;
        border: none; border-radius: 8px; font-size: 0.72rem; font-weight: 600;
        cursor: pointer; transition: opacity 0.18s; font-family: inherit; letter-spacing: 0.02em;
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

function performSearch(query) {
  const q = query.toLowerCase();
  const catMatches = [], brandMatches = [], nameMatches = [];
  const storeMap = {};

  PRODUCTS.forEach(p => {
    const inCat   = p.category && p.category.toLowerCase().includes(q);
    const inBrand = p.brand    && p.brand.toLowerCase().includes(q);
    const inName  = p.name     && p.name.toLowerCase().includes(q);

    if (inCat)        catMatches.push(p);
    else if (inBrand) brandMatches.push(p);
    else if (inName)  nameMatches.push(p);

    if (p._fromFirebase && p.userId) {
      const sName = (p.storeName || '').toLowerCase();
      const bName = (p.brand     || '').toLowerCase();
      if (sName.includes(q) || bName.includes(q)) {
        if (!storeMap[p.userId]) {
          storeMap[p.userId] = { uid: p.userId, name: p.storeName || p.brand || 'Mağaza', photoURL: p.storePhotoURL || '', count: 0 };
        }
        storeMap[p.userId].count++;
      }
    }
  });

  renderSearchPopup(query, { catMatches, brandMatches, nameMatches, stores: Object.values(storeMap) });
}

function renderSearchPopup(query, results) {
  const { catMatches, brandMatches, nameMatches, stores = [] } = results;
  const total = catMatches.length + brandMatches.length + nameMatches.length;

  const titleEl = document.getElementById('searchPopupTitle');
  if (titleEl) {
    const allCount = total + stores.length;
    titleEl.textContent = allCount > 0
      ? `${allCount} ${t('search.found')}`
      : t('search.none');
  }

  const body = document.getElementById('searchPopupBody');
  if (!body) return;

  if (total === 0 && stores.length === 0) {
    body.innerHTML = `
      <div class="search-popup-empty">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="color:var(--border)">
          <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
        </svg>
        <span>"<strong>${query}</strong>" ${t('search.none').toLowerCase()}</span>
      </div>`;
  } else {
    let html = '';
    if (stores.length > 0) {
      html += `<div class="search-result-group-label">${t('search.stores')}</div>`;
      html += `<div class="search-store-row">${stores.map(s => searchStoreCard(s)).join('')}</div>`;
    }
    if (catMatches.length > 0) {
      html += `<div class="search-result-group-label">${t('search.byCat')}</div>`;
      html += catMatches.map(p => searchResultCard(p)).join('');
    }
    if (brandMatches.length > 0) {
      html += `<div class="search-result-group-label">${t('search.byBrand')}</div>`;
      html += brandMatches.map(p => searchResultCard(p)).join('');
    }
    if (nameMatches.length > 0) {
      html += `<div class="search-result-group-label">${t('search.byName')}</div>`;
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
      <img class="search-result-img" src="${(p.imgs && p.imgs[0]) || p.img || ''}" alt="${p.name}" loading="lazy"/>
      <div class="search-result-info">
        <div class="search-result-brand">${p.brand || p.storeName || ''}</div>
        <div class="search-result-name">${p.name}</div>
        <div class="search-result-price ${isSale ? 'sale' : ''}">${p.price} ₼</div>
      </div>
      <button class="search-result-cart" data-id="${p.id}" title="${t('header.cart')}">
        <svg viewBox="0 0 24 24"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4zM3 6h18M16 10a4 4 0 01-8 0"/></svg>
      </button>
    </div>`;
}

function searchStoreCard(store) {
  const initials = store.name.split(' ').map(w => w[0] || '').join('').substring(0, 2).toUpperCase();
  const logoHTML = store.photoURL ? `<img src="${store.photoURL}" alt="${store.name}"/>` : initials;
  return `
    <div class="search-store-card" onclick="window.location.href='store.html?uid=${store.uid}'">
      <div class="search-store-logo">${logoHTML}</div>
      <div class="search-store-name">${store.name}</div>
      <div class="search-store-count">${store.count} ${t('search.products')}</div>
      <button class="search-store-goto"
        onclick="event.stopPropagation(); window.location.href='store.html?uid=${store.uid}'">
        ${t('search.goto')}
      </button>
    </div>`;
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
        <p>${t('footer.tagline')}</p>
      </div>
      <div class="footer-col">
        <h4>${t('footer.cats')}</h4>
        <ul>
          <li><a href="#">${t('footer.women')}</a></li>
          <li><a href="#">${t('footer.men')}</a></li>
          <li><a href="#">${t('footer.kids')}</a></li>
          <li><a href="#">${t('footer.acc')}</a></li>
        </ul>
      </div>
      <div class="footer-col">
        <h4>${t('footer.help')}</h4>
        <ul>
          <li><a href="#">${t('footer.delivery')}</a></li>
          <li><a href="#">${t('footer.returns')}</a></li>
          <li><a href="#">${t('footer.size')}</a></li>
          <li><a href="#">${t('footer.contact')}</a></li>
        </ul>
      </div>
      <div class="footer-col">
        <h4>${t('footer.about')}</h4>
        <ul>
          <li><a href="#">${t('footer.who')}</a></li>
          <li><a href="#">${t('footer.careers')}</a></li>
          <li><a href="#">${t('footer.privacy')}</a></li>
          <li><a href="#">${t('footer.terms')}</a></li>
        </ul>
      </div>
    </div>
    <div class="footer-bottom">
      <p>${t('footer.copy')}</p>
    </div>
  `;

  const footer = document.querySelector('footer');
  if (footer) footer.innerHTML = footerHTML;
}

/* ══════════════════════════════
   MODAL
   ══════════════════════════════ */
const modal = {
  open(id)    { const el = document.getElementById(id); if (el) el.classList.add('open'); },
  close(id)   { const el = document.getElementById(id); if (el) el.classList.remove('open'); },
  closeAll()  { document.querySelectorAll('.overlay').forEach(el => el.classList.remove('open')); }
};

document.addEventListener('keydown', e => { if (e.key === 'Escape') modal.closeAll(); });
document.addEventListener('click', e => {
  if (e.target.classList.contains('overlay'))     modal.closeAll();
  if (e.target.classList.contains('modal-close')) modal.closeAll();
});

/* ══════════════════════════════
   TOAST
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
    const toastEl = document.createElement('div');
    toastEl.className = `toast ${type}`;
    toastEl.innerHTML = `${type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ'} ${message}`;
    this.container.appendChild(toastEl);
    setTimeout(() => { toastEl.style.opacity = '0'; toastEl.style.transition = 'opacity 0.3s'; }, duration - 300);
    setTimeout(() => toastEl.remove(), duration);
  }
};

/* ══════════════════════════════
   SƏBƏT BADGE
   ══════════════════════════════ */
function updateCartBadge() {
  const badge = document.getElementById('cartBadge');
  if (!badge) return;
  const count = cart.getCount();
  badge.textContent   = count;
  badge.style.display = count > 0 ? 'flex' : 'none';
}

/* ══════════════════════════════
   MAĞAZA İZLƏ DÜYMƏSİ HTML
   ══════════════════════════════ */
function followBtnHTML(following) {
  if (following) {
    return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/><polyline points="17 11 19 13 23 9"/></svg>${t('store.following')}`;
  }
  return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="16" y1="11" x2="22" y2="11"/></svg>${t('store.follow')}`;
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
    if (typeof updateWishlistBadge === 'function') updateWishlistBadge();
  });
});
