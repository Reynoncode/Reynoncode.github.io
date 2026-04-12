/* ═══════════════════════════════════════════
   wishlist.js — İstək siyahısı popup
   cart.js-dən SONRA, product-detail.js-dən SONRA yükləyin
   ═══════════════════════════════════════════ */

/* ══════════════════════════════
   CSS — bir dəfə inject
   ══════════════════════════════ */
function injectWishlistStyles() {
  if (document.getElementById('wishlistModalStyles')) return;
  const style = document.createElement('style');
  style.id = 'wishlistModalStyles';
  style.textContent = `
    /* ── Overlay ── */
    #wishlistModal {
      position: fixed;
      inset: 0;
      z-index: 998;
      background: rgba(0,0,0,0.5);
      backdrop-filter: blur(4px);
      display: none;
      align-items: center;
      justify-content: center;
    }
    #wishlistModal.open {
      display: flex;
    }

    /* ── Panel ── */
    .wishlist-panel {
      width: 100%;
      max-width: 500px;
      max-height: 88vh;
      height: auto;
      background: var(--bg, #faf7f4);
      border-radius: 20px;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      box-shadow: 0 24px 80px rgba(0,0,0,0.18);
      transform: translateY(28px) scale(0.97);
      opacity: 0;
      transition: transform 0.35s cubic-bezier(.22,.68,0,1.2), opacity 0.25s ease;
      position: relative;
    }
    #wishlistModal.open .wishlist-panel {
      transform: translateY(0) scale(1);
      opacity: 1;
    }

    /* ── Header ── */
    .wishlist-panel-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 20px 24px 16px;
      border-bottom: 1.5px solid var(--border, #e8e2da);
      background: var(--bg, #faf7f4);
      flex-shrink: 0;
    }
    .wishlist-panel-title {
      font-family: var(--font-display, 'Playfair Display', serif);
      font-size: 1.3rem;
      font-weight: 700;
      color: var(--text, #1a1a1a);
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .wishlist-panel-count {
      font-family: var(--font-body, sans-serif);
      font-size: 0.78rem;
      color: var(--muted, #7a7a7a);
      font-weight: 400;
      background: var(--border, #e8e2da);
      padding: 3px 9px;
      border-radius: 20px;
    }
    .wishlist-panel-close {
      width: 34px; height: 34px;
      border: 1.5px solid var(--border, #e8e2da);
      border-radius: 50%;
      background: none;
      cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      font-size: 0.85rem;
      color: var(--muted, #7a7a7a);
      transition: all 0.18s;
      flex-shrink: 0;
    }
    .wishlist-panel-close:hover {
      background: var(--text, #1a1a1a);
      color: #fff;
      border-color: var(--text, #1a1a1a);
    }

    /* ── Body ── */
    .wishlist-panel-body {
      flex: 1;
      overflow-y: auto;
      min-height: 0;
      scrollbar-width: thin;
      scrollbar-color: var(--border, #e8e2da) transparent;
    }
    .wishlist-panel-body::-webkit-scrollbar { width: 4px; }
    .wishlist-panel-body::-webkit-scrollbar-thumb {
      background: var(--border, #e8e2da);
      border-radius: 4px;
    }

    /* ── Empty state ── */
    .wishlist-empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 60px 24px;
      text-align: center;
      color: var(--muted, #7a7a7a);
      gap: 12px;
    }
    .wishlist-empty-icon { font-size: 3rem; opacity: 0.5; }
    .wishlist-empty p { font-size: 0.95rem; margin: 0; }

    /* ── Məhsul kartları ── */
    .wishlist-item-list {
      padding: 12px 16px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .wishlist-item-card {
      display: flex;
      gap: 14px;
      background: var(--bg-card, #fff);
      border: 1.5px solid var(--border, #e8e2da);
      border-radius: 14px;
      padding: 12px;
      cursor: pointer;
      transition: box-shadow 0.18s, border-color 0.18s;
      position: relative;
    }
    .wishlist-item-card:hover {
      box-shadow: 0 4px 18px rgba(0,0,0,0.07);
      border-color: #c9a86c;
    }
    .wishlist-item-img {
      width: 72px;
      height: 92px;
      object-fit: cover;
      border-radius: 10px;
      flex-shrink: 0;
      background: #f0ece6;
      display: block;
    }
    .wishlist-item-body {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 3px;
      min-width: 0;
    }
    .wishlist-item-brand {
      font-size: 0.68rem;
      color: var(--accent, #c9a86c);
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
    }
    .wishlist-item-name {
      font-size: 0.88rem;
      font-weight: 600;
      color: var(--text, #1a1a1a);
      line-height: 1.3;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .wishlist-item-price {
      font-size: 1rem;
      font-weight: 700;
      color: var(--text, #1a1a1a);
      margin-top: 2px;
    }
    .wishlist-item-actions {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-top: auto;
      padding-top: 6px;
    }
    .wishlist-item-remove {
      background: none;
      border: 1.5px solid var(--border, #e8e2da);
      border-radius: 7px;
      font-size: 0.75rem;
      color: var(--muted, #7a7a7a);
      cursor: pointer;
      padding: 4px 10px;
      font-family: inherit;
      transition: all 0.18s;
      white-space: nowrap;
    }
    .wishlist-item-remove:hover {
      border-color: #e63946;
      color: #e63946;
      background: #fff5f5;
    }
    .wishlist-item-detail-btn {
      display: flex;
      align-items: center;
      gap: 5px;
      background: var(--text, #1a1a1a);
      color: #fff;
      border: none;
      border-radius: 7px;
      font-size: 0.75rem;
      font-weight: 600;
      cursor: pointer;
      padding: 5px 11px;
      font-family: inherit;
      transition: all 0.18s;
      white-space: nowrap;
    }
    .wishlist-item-detail-btn:hover { background: #333; }

    /* ── Önərilənlər ── */
    .wishlist-suggest-section {
      padding: 14px 16px 8px;
      border-top: 1.5px solid var(--border, #e8e2da);
      margin-top: 4px;
    }
    .wishlist-suggest-title {
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--muted, #7a7a7a);
      margin-bottom: 12px;
    }
    .wishlist-suggest-row {
      display: flex;
      gap: 10px;
      overflow-x: auto;
      padding-bottom: 12px;
      scrollbar-width: none;
      -ms-overflow-style: none;
      cursor: grab;
      user-select: none;
      -webkit-overflow-scrolling: touch;
    }
    .wishlist-suggest-row:active { cursor: grabbing; }
    .wishlist-suggest-row::-webkit-scrollbar { display: none; }
    .wishlist-suggest-card {
      flex-shrink: 0;
      width: 128px;
      background: var(--bg-card, #fff);
      border: 1.5px solid var(--border, #e8e2da);
      border-radius: 12px;
      overflow: hidden;
      cursor: pointer;
      transition: all 0.2s;
      position: relative;
    }
    .wishlist-suggest-card:hover {
      border-color: var(--accent, #c9a86c);
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(0,0,0,0.09);
    }
    .wishlist-suggest-img-wrap {
      width: 100%;
      height: 128px;
      overflow: hidden;
      background: #f0ece6;
    }
    .wishlist-suggest-img-wrap img {
      width: 100%; height: 100%;
      object-fit: cover;
      display: block;
      transition: transform 0.3s;
    }
    .wishlist-suggest-card:hover .wishlist-suggest-img-wrap img { transform: scale(1.05); }
    .wishlist-suggest-info { padding: 8px 8px 6px; }
    .wishlist-suggest-brand {
      font-size: 0.63rem;
      color: var(--accent, #c9a86c);
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .wishlist-suggest-name {
      font-size: 0.74rem;
      font-weight: 600;
      color: var(--text, #1a1a1a);
      line-height: 1.25;
      margin: 2px 0 3px;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .wishlist-suggest-price {
      font-size: 0.78rem;
      font-weight: 700;
      color: var(--text, #1a1a1a);
    }
    .wishlist-suggest-skeleton {
      flex-shrink: 0;
      width: 128px;
      height: 195px;
      border-radius: 12px;
      background: linear-gradient(90deg, var(--border,#e8e2da) 25%, #f5f2ee 50%, var(--border,#e8e2da) 75%);
      background-size: 200% 100%;
      animation: wishlistSkeletonAnim 1.4s infinite;
    }
    @keyframes wishlistSkeletonAnim {
      0%   { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }

    /* ── Footer ── */
    .wishlist-panel-footer {
      flex-shrink: 0;
      padding: 14px 20px 18px;
      border-top: 2px solid var(--border, #e8e2da);
      background: var(--bg, #faf7f4);
    }
    .wishlist-view-all-btn {
      width: 100%;
      height: 46px;
      background: var(--text, #1a1a1a);
      color: #fff;
      border: none;
      border-radius: 10px;
      font-size: 0.95rem;
      font-weight: 700;
      font-family: inherit;
      cursor: pointer;
      letter-spacing: 0.02em;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      text-decoration: none;
    }
    .wishlist-view-all-btn:hover {
      background: #333;
      transform: translateY(-1px);
      box-shadow: 0 6px 20px rgba(0,0,0,0.18);
    }
    .wishlist-view-all-btn:active { transform: translateY(0); }

    /* ── Header düyməsi ── */
    .btn-wishlist {
      position: relative;
      width: 40px; height: 40px;
      border-radius: 10px;
      border: 1.5px solid var(--border, #e8e2da);
      background: var(--bg-card, #fff);
      display: flex; align-items: center; justify-content: center;
      cursor: pointer;
      color: var(--text, #1a1a1a);
      transition: all 0.18s;
      flex-shrink: 0;
    }
    .btn-wishlist:hover {
      border-color: #e63946;
      color: #e63946;
      background: #fff5f5;
    }
    .btn-wishlist svg { transition: fill 0.18s; }
    .btn-wishlist:hover svg {
      fill: #e63946;
      stroke: #e63946;
    }
    .wishlist-header-badge {
      position: absolute;
      top: -6px; right: -6px;
      background: #e63946;
      color: #fff;
      font-size: 0.62rem;
      font-weight: 700;
      width: 16px; height: 16px;
      border-radius: 50%;
      display: none;
      align-items: center;
      justify-content: center;
      line-height: 1;
    }

    @media (max-width: 540px) {
      .wishlist-panel {
        max-width: 100%;
        max-height: 100dvh;
        border-radius: 0;
      }
      #wishlistModal { align-items: flex-end; }
    }
  `;
  document.head.appendChild(style);
}

/* ══════════════════════════════
   MODAL YARADILMASı
   ══════════════════════════════ */
function ensureWishlistOverlay() {
  if (document.getElementById('wishlistModal')) return;
  const overlay = document.createElement('div');
  overlay.id = 'wishlistModal';
  document.body.appendChild(overlay);
}

/* ══════════════════════════════
   AÇ / BAĞLA
   ══════════════════════════════ */
function openWishlistModal() {
  ensureWishlistOverlay();
  injectWishlistStyles();
  const overlay = document.getElementById('wishlistModal');
  overlay.classList.add('open');
  renderWishlistModal();
}

function closeWishlistModal() {
  const overlay = document.getElementById('wishlistModal');
  if (overlay) overlay.classList.remove('open');
}

/* ══════════════════════════════
   RENDER
   ══════════════════════════════ */
async function renderWishlistModal() {
  const overlay = document.getElementById('wishlistModal');
  if (!overlay) return;

  const user = fbAuth.currentUser;
  let items = [];

  if (user) {
    try {
      const snap = await fbDb.collection('wishlists').doc(user.uid).get();
      items = snap.exists ? (snap.data().items || []) : [];
    } catch(e) { console.warn('Wishlist yüklənmədi:', e); }
  }

  overlay.innerHTML = `
    <div class="wishlist-panel">

      <div class="wishlist-panel-header">
        <div class="wishlist-panel-title">
          ❤️ İstək siyahısı
          <span class="wishlist-panel-count">${items.length} məhsul</span>
        </div>
        <button class="wishlist-panel-close" id="wishlistPanelCloseBtn">✕</button>
      </div>

      <div class="wishlist-panel-body">
        ${items.length === 0 ? `
          <div class="wishlist-empty">
            <div class="wishlist-empty-icon">🤍</div>
            <p>İstək siyahınız boşdur</p>
          </div>
        ` : `
          <div class="wishlist-item-list">
            ${items.map(item => `
              <div class="wishlist-item-card" onclick="openProductFromWishlist('${item.id}')">
                <img class="wishlist-item-img"
                  src="${item.image || item.img || ''}"
                  alt="${item.name || ''}"
                  loading="lazy"
                  onerror="this.style.background='#e8e2da';this.style.opacity='0'"
                />
                <div class="wishlist-item-body">
                  <div class="wishlist-item-brand">${item.brand || ''}</div>
                  <div class="wishlist-item-name">${item.name || '—'}</div>
                  <div class="wishlist-item-price">${(item.price || 0).toFixed(2)} ₼</div>
                  <div class="wishlist-item-actions">
                    <button class="wishlist-item-remove"
                      onclick="event.stopPropagation(); removeFromWishlistPopup('${item.id}')"
                      title="Siyahıdan çıxar">
                      Sil
                    </button>
                    <button class="wishlist-item-detail-btn"
                      onclick="event.stopPropagation(); openProductFromWishlist('${item.id}')">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                        <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4zM3 6h18M16 10a4 4 0 01-8 0"/>
                      </svg>
                      Səbətə əlavə et
                    </button>
                  </div>
                </div>
              </div>
            `).join('')}
          </div>

          <div class="wishlist-suggest-section" id="wishlistSuggestSection">
            <div class="wishlist-suggest-title">Bəyənə biləcəkləriniz</div>
            <div class="wishlist-suggest-row" id="wishlistSuggestRow">
              ${[1,2,3,4,5].map(() => `<div class="wishlist-suggest-skeleton"></div>`).join('')}
            </div>
          </div>
        `}
      </div>

      ${items.length > 0 ? `
        <div class="wishlist-panel-footer">
          <a href="profile.html"
            class="wishlist-view-all-btn"
            onclick="closeWishlistModal()">
            Bütün siyahıya bax
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="16" height="16">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </a>
        </div>
      ` : ''}

    </div>
  `;

  /* Bağla düyməsi */
  document.getElementById('wishlistPanelCloseBtn')
    ?.addEventListener('click', closeWishlistModal);

  /* Overlay klikdə bağla */
  overlay.onclick = e => { if (e.target === overlay) closeWishlistModal(); };

  /* Drag scroll init */
  initWishlistSuggestScroll();

  /* Önərilənləri async yüklə */
  if (items.length > 0) {
    getWishlistSuggestedProducts(items)
      .then(suggested => {
        const row = document.getElementById('wishlistSuggestRow');
        if (!row) return;
        if (!suggested.length) {
          document.getElementById('wishlistSuggestSection')?.remove();
          return;
        }
        row.innerHTML = suggested.map(p => wishlistSuggestedCard(p)).join('');
        initWishlistSuggestScroll();
      })
      .catch(() => {
        document.getElementById('wishlistSuggestSection')?.remove();
      });
  }
}

/* ══════════════════════════════
   MƏHSUL DETALına KEÇ
   (popup bağlanır → openProductDetail açılır)
   ══════════════════════════════ */
async function openProductFromWishlist(itemId) {
  closeWishlistModal();

  /* Əvvəlcə PRODUCTS array-dən axtar */
  if (typeof PRODUCTS !== 'undefined') {
    const p = PRODUCTS.find(p => String(p.id) === String(itemId));
    if (p && typeof openProductDetail === 'function') {
      openProductDetail(p);
      return;
    }
  }

  /* Firebase listings-dən yüklə (Firebase elanları üçün) */
  try {
    const doc = await fbDb.collection('listings').doc(itemId).get();
    if (doc.exists && typeof openProductDetail === 'function') {
      openProductDetail({ id: doc.id, ...doc.data(), _fromFirebase: true });
    }
  } catch(e) {
    console.warn('Məhsul tapılmadı:', e);
    if (typeof toast !== 'undefined') toast.show('Məhsul tapılmadı', 'error');
  }
}

/* ══════════════════════════════
   SİL
   ══════════════════════════════ */
async function removeFromWishlistPopup(itemId) {
  const user = fbAuth.currentUser;
  if (!user) return;
  try {
    const ref  = fbDb.collection('wishlists').doc(user.uid);
    const snap = await ref.get();
    if (!snap.exists) return;
    const newItems = (snap.data().items || []).filter(i => String(i.id) !== String(itemId));
    await ref.set({ items: newItems }, { merge: false });
    updateWishlistBadge(newItems.length);
    renderWishlistModal();
    if (typeof toast !== 'undefined') toast.show('Məhsul siyahıdan çıxarıldı', 'default');
  } catch(err) {
    console.warn('Silmə xətası:', err.message);
  }
}

/* ══════════════════════════════
   BADGE YENİLƏ
   ══════════════════════════════ */
async function updateWishlistBadge(count) {
  const badge = document.getElementById('wishlistHeaderBadge');
  if (!badge) return;
  if (count === undefined) {
    const user = fbAuth.currentUser;
    if (!user) { badge.style.display = 'none'; return; }
    try {
      const snap = await fbDb.collection('wishlists').doc(user.uid).get();
      count = snap.exists ? (snap.data().items || []).length : 0;
    } catch(e) { count = 0; }
  }
  badge.textContent   = count;
  badge.style.display = count > 0 ? 'flex' : 'none';
}

/* ══════════════════════════════
   ÖNƏRİLƏN MƏHSULLAR
   (cart.js-dəki getSuggestedProducts ilə eyni məntiq)
   ══════════════════════════════ */
async function getWishlistSuggestedProducts(wishlistItems) {
  const itemIds     = new Set(wishlistItems.map(i => String(i.id)));
  const vendorIds   = [...new Set(
    wishlistItems.map(i => i.userId || i.vendorId || null).filter(Boolean)
  )];
  let suggested = [];

  /* Eyni vendor məhsulları */
  if (vendorIds.length > 0) {
    try {
      for (const vid of vendorIds) {
        if (suggested.length >= 5) break;
        const snap = await fbDb.collection('listings')
          .where('userId', '==', vid)
          .orderBy('createdAt', 'desc')
          .limit(10)
          .get();
        const items = snap.docs
          .map(d => ({ id: d.id, ...d.data(), _fromFirebase: true }))
          .filter(p => !itemIds.has(String(p.id)));
        suggested.push(...items);
      }
    } catch(e) { console.warn('Vendor məhsulları:', e); }
  }

  /* Digər Firebase məhsulları */
  if (suggested.length < 5) {
    try {
      const suggestedIds = new Set(suggested.map(p => String(p.id)));
      const snap = await fbDb.collection('listings')
        .orderBy('createdAt', 'desc')
        .limit(30)
        .get();
      const others = snap.docs
        .map(d => ({ id: d.id, ...d.data(), _fromFirebase: true }))
        .filter(p =>
          !itemIds.has(String(p.id)) &&
          !suggestedIds.has(String(p.id)) &&
          !vendorIds.includes(p.userId)
        );
      /* Shuffle */
      for (let i = others.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [others[i], others[j]] = [others[j], others[i]];
      }
      suggested.push(...others.slice(0, 5 - suggested.length));
    } catch(e) { console.warn('Əlavə məhsullar:', e); }
  }

  /* Static PRODUCTS-dan tamamla */
  if (suggested.length < 5 && typeof PRODUCTS !== 'undefined') {
    const suggestedIds = new Set(suggested.map(p => String(p.id)));
    const more = PRODUCTS
      .filter(p => !itemIds.has(String(p.id)) && !suggestedIds.has(String(p.id)))
      .slice(0, 5 - suggested.length);
    suggested.push(...more);
  }

  return suggested.slice(0, 5);
}

function wishlistSuggestedCard(p) {
  const img   = (p.imgs && p.imgs[0]) || p.img || p.image || '';
  const brand = p.brand || p.storeName || '';
  return `
    <div class="wishlist-suggest-card" onclick="openWishlistSuggestedProduct('${p.id}')">
      <div class="wishlist-suggest-img-wrap">
        <img src="${img}" alt="${p.name || ''}" loading="lazy"
          onerror="this.parentElement.style.background='#e8e2da'" />
      </div>
      <div class="wishlist-suggest-info">
        <div class="wishlist-suggest-brand">${brand}</div>
        <div class="wishlist-suggest-name">${p.name || ''}</div>
        <div class="wishlist-suggest-price">${p.price || 0} ₼</div>
      </div>
    </div>
  `;
}

function openWishlistSuggestedProduct(productId) {
  closeWishlistModal();
  if (typeof PRODUCTS !== 'undefined') {
    const p = PRODUCTS.find(p => String(p.id) === String(productId));
    if (p && typeof openProductDetail === 'function') { openProductDetail(p); return; }
  }
  fbDb.collection('listings').doc(productId).get()
    .then(doc => {
      if (doc.exists && typeof openProductDetail === 'function') {
        openProductDetail({ id: doc.id, ...doc.data(), _fromFirebase: true });
      }
    })
    .catch(() => {});
}

/* ══════════════════════════════
   DRAG SCROLL
   ══════════════════════════════ */
function initWishlistSuggestScroll() {
  const row = document.getElementById('wishlistSuggestRow');
  if (!row) return;
  let isDown = false, startX = 0, scrollLeft = 0;
  row.addEventListener('mousedown', e => {
    isDown = true; startX = e.pageX - row.offsetLeft; scrollLeft = row.scrollLeft;
  });
  row.addEventListener('mouseleave', () => isDown = false);
  row.addEventListener('mouseup',    () => isDown = false);
  row.addEventListener('mousemove',  e => {
    if (!isDown) return;
    e.preventDefault();
    row.scrollLeft = scrollLeft - (e.pageX - row.offsetLeft - startX);
  });
}

/* ══════════════════════════════
   BAŞLAT
   ══════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  ensureWishlistOverlay();
  injectWishlistStyles();

  if (typeof fbAuth !== 'undefined') {
    fbAuth.onAuthStateChanged(user => {
      if (user) updateWishlistBadge();
      else      updateWishlistBadge(0);
    });
  }
});
