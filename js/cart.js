/* ═══════════════════════════════════════════
   cart.js — Firestore Səbət
   Real-vaxt sinxronizasiya — fərqli cihazlarda eyni hesab = eyni səbət
   ═══════════════════════════════════════════ */

const cart = {
  _items:       [],
  _unsubscribe: null,

  init(userId) {
    if (this._unsubscribe) { this._unsubscribe(); this._unsubscribe = null; }

    if (!userId) {
      this._items = [];
      if (typeof updateCartBadge === 'function') updateCartBadge();
      return;
    }

    const cartRef = fbDb.collection('users').doc(userId).collection('cart');

    this._unsubscribe = cartRef.onSnapshot(snap => {
      this._items = snap.docs.map(d => ({ cartId: d.id, ...d.data() }));
      if (typeof updateCartBadge === 'function') updateCartBadge();

      const overlay = document.getElementById('cartModal');
      if (overlay && overlay.classList.contains('open')) renderCartModal();
    });
  },

  getItems()  { return this._items; },

  async add(product, size = null) {
    const user = fbAuth.currentUser;
    if (!user) {
      if (typeof modal !== 'undefined') modal.open('authModal');
      if (typeof toast !== 'undefined') toast.show('Səbətə əlavə etmək üçün daxil olun', 'default');
      return;
    }

    const docId    = size ? `${product.id}_${size}` : String(product.id);
    const itemRef  = fbDb.collection('users').doc(user.uid).collection('cart').doc(docId);
    const existing = this._items.find(i => i.cartId === docId);

    if (existing) {
      await itemRef.update({ quantity: existing.quantity + 1, updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
    } else {
      await itemRef.set({
        id:       product.id,
        name:     product.name,
        price:    product.price,
        img:      product.img || product.image || '',
        brand:    product.brand || '',
        size:     size || null,
        // Rəng məlumatını da saxla
        color:    product.selectedColor?.name || product.color || null,
        colorHex: product.selectedColor?.hex  || product.colorHex || null,
        quantity: 1,
        vendorId: product.vendorId || product.userId || product.sellerId || null,
        addedAt:  firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    }

    if (typeof toast !== 'undefined') toast.show(`${product.name} səbətə əlavə edildi 🛒`, 'success');
  },

  async remove(cartId) {
    const user = fbAuth.currentUser;
    if (!user) return;
    await fbDb.collection('users').doc(user.uid).collection('cart').doc(cartId).delete();
  },

  async updateQty(cartId, qty) {
    if (qty < 1) { await this.remove(cartId); return; }
    const user = fbAuth.currentUser;
    if (!user) return;
    await fbDb.collection('users').doc(user.uid).collection('cart').doc(cartId).update({
      quantity: qty, updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
  },

  getCount() { return this._items.reduce((sum, i) => sum + (i.quantity || 1), 0); },
  getTotal() { return this._items.reduce((sum, i) => sum + i.price * (i.quantity || 1), 0); },

  async clear() {
    const user = fbAuth.currentUser;
    if (!user) return;
    const promises = this._items.map(item =>
      fbDb.collection('users').doc(user.uid).collection('cart').doc(item.cartId).delete()
    );
    await Promise.all(promises);
  }
};

/* ══════════════════════════════
   CART MODAL
   ══════════════════════════════ */
function initCartModal() {
  const overlay = document.getElementById('cartModal');
  if (!overlay) return;

  overlay.addEventListener('click', e => {
    if (e.target === overlay) modal.close('cartModal');
  });

  const observer = new MutationObserver(() => {
    if (overlay.classList.contains('open')) renderCartModal();
  });
  observer.observe(overlay, { attributes: true, attributeFilter: ['class'] });
}

/* ══════════════════════════════════════════════════════
   CART MODAL — YENİLƏNMİŞ VERSİYA
   renderCartModal() və köməkçi funksiyalar
   Bu kodu cart.js-dəki köhnə renderCartModal() ilə əvəz et
   ══════════════════════════════════════════════════════ */

/* ── Önərilən məhsulları tap ── */
async function getSuggestedProducts(cartItems) {
  if (cartItems.length === 0) {
    // Səbət boşdursa ən son 5 elanı göstər
    try {
      const snap = await fbDb.collection('listings')
        .orderBy('createdAt', 'desc')
        .limit(5)
        .get();
      return snap.docs.map(d => ({ id: d.id, ...d.data(), _fromFirebase: true }));
    } catch { return []; }
  }

  // Səbətdəki məhsulların vendor ID-lərini topla
  const vendorIds = [...new Set(
    cartItems
      .map(i => i.vendorId || i.userId || null)
      .filter(Boolean)
  )];

  // Səbətdəki məhsul ID-ləri (bunları göstərmə)
  const cartProductIds = new Set(cartItems.map(i => String(i.id)));

  let suggested = [];

  // 1. Eyni mağazanın digər elanları
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
          .filter(p => !cartProductIds.has(String(p.id)));
        suggested.push(...items);
      }
    } catch(e) { console.warn('Vendor məhsulları yüklənmədi', e); }
  }

  // 2. Hələ 5-ə çatmadısa fərqli mağazaların son elanları ilə doldur
  if (suggested.length < 5) {
    try {
      const need = 5 - suggested.length;
      const suggestedIds = new Set(suggested.map(p => String(p.id)));
      const snap = await fbDb.collection('listings')
        .orderBy('createdAt', 'desc')
        .limit(30)
        .get();
      const others = snap.docs
        .map(d => ({ id: d.id, ...d.data(), _fromFirebase: true }))
        .filter(p =>
          !cartProductIds.has(String(p.id)) &&
          !suggestedIds.has(String(p.id)) &&
          !vendorIds.includes(p.userId)
        );
      // Shuffle
      for (let i = others.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [others[i], others[j]] = [others[j], others[i]];
      }
      suggested.push(...others.slice(0, need));
    } catch(e) { console.warn('Əlavə məhsullar yüklənmədi', e); }
  }

  return suggested.slice(0, 5);
}

/* ── Önərilən məhsul mini-kart HTML ── */
function suggestedProductCard(p) {
  const img   = (p.imgs && p.imgs[0]) || p.img || '';
  const brand = p.brand || p.storeName || '';
  const name  = p.name  || '';
  const price = p.price || 0;

  return `
    <div class="cart-suggest-card" onclick="openProductFromCart('${p.id}')">
      <div class="cart-suggest-img-wrap">
        <img src="${img}" alt="${name}" loading="lazy" />
      </div>
      <div class="cart-suggest-info">
        <div class="cart-suggest-brand">${brand}</div>
        <div class="cart-suggest-name">${name}</div>
        <div class="cart-suggest-price">${price} ₼</div>
      </div>
      <button class="cart-suggest-add"
        onclick="event.stopPropagation(); quickAddFromSuggested('${p.id}')"
        title="Səbətə əlavə et">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" width="15" height="15">
          <line x1="12" y1="5" x2="12" y2="19"/>
          <line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
      </button>
    </div>
  `;
}

/* ── Önərilən məhsulu məhsul detayına yönləndir ── */
function openProductFromCart(productId) {
  modal.close('cartModal');
  // product-detail.js-in openProductDetail funksiyasına yönləndir
  if (typeof PRODUCTS !== 'undefined') {
    const p = PRODUCTS.find(p => String(p.id) === String(productId));
    if (p && typeof openProductDetail === 'function') {
      openProductDetail(p);
      return;
    }
  }
  // Tapılmadısa store səhifəsinə apar
  const dummy = { id: productId };
  if (typeof openProductDetail === 'function') openProductDetail(dummy);
}

/* ── Önəriləndən birbaşa səbətə əlavə et ── */
function quickAddFromSuggested(productId) {
  // PRODUCTS massivindən tap
  if (typeof PRODUCTS !== 'undefined') {
    const p = PRODUCTS.find(p => String(p.id) === String(productId));
    if (p) { cart.add(p); return; }
  }
  // Tapılmadısa Firebase-dən al
  fbDb.collection('listings').doc(productId).get().then(doc => {
    if (doc.exists) {
      cart.add({ id: doc.id, ...doc.data() });
    }
  }).catch(() => toast.show('Məhsul tapılmadı', 'error'));
}

/* ══════════════════════════════
   ANA RENDER FUNKSİYASI
   ══════════════════════════════ */
async function renderCartModal() {
  const items   = cart.getItems();
  const total   = cart.getTotal();
  const overlay = document.getElementById('cartModal');
  if (!overlay) return;

  // CSS injeksiyası (bir dəfə)
  if (!document.getElementById('cartModalStyles')) {
    const style = document.createElement('style');
    style.id = 'cartModalStyles';
    style.textContent = `
      /* ── Overlay & Panel ── */
      #cartModal {
        display: flex;
        align-items: stretch;
        justify-content: flex-end;
      }
      #cartModal.open .cart-panel {
        transform: translateX(0);
        opacity: 1;
      }
      .cart-panel {
        width: 100%;
        max-width: 480px;
        height: 100dvh;
        background: var(--bg, #faf7f4);
        display: flex;
        flex-direction: column;
        transform: translateX(100%);
        opacity: 0;
        transition: transform 0.35s cubic-bezier(.22,.68,0,1.2), opacity 0.25s ease;
        box-shadow: -8px 0 48px rgba(0,0,0,0.13);
        overflow: hidden;
        position: relative;
      }

      /* ── Header ── */
      .cart-panel-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 20px 24px 16px;
        border-bottom: 1.5px solid var(--border, #e8e2da);
        background: var(--bg, #faf7f4);
        flex-shrink: 0;
      }
      .cart-panel-title {
        font-family: var(--font-display, 'Playfair Display', serif);
        font-size: 1.35rem;
        font-weight: 700;
        color: var(--text, #1a1a1a);
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .cart-panel-count {
        font-family: var(--font-body, sans-serif);
        font-size: 0.8rem;
        color: var(--muted, #7a7a7a);
        font-weight: 400;
        background: var(--border, #e8e2da);
        padding: 3px 9px;
        border-radius: 20px;
      }
      .cart-panel-close {
        width: 36px; height: 36px;
        border: 1.5px solid var(--border, #e8e2da);
        border-radius: 50%;
        background: none;
        cursor: pointer;
        display: flex; align-items: center; justify-content: center;
        font-size: 0.9rem;
        color: var(--muted, #7a7a7a);
        transition: all 0.18s;
      }
      .cart-panel-close:hover {
        background: var(--text, #1a1a1a);
        color: #fff;
        border-color: var(--text, #1a1a1a);
      }

      /* ── Scrollable body ── */
      .cart-panel-body {
        flex: 1;
        overflow-y: auto;
        padding: 0;
        scrollbar-width: thin;
        scrollbar-color: var(--border, #e8e2da) transparent;
      }
      .cart-panel-body::-webkit-scrollbar { width: 4px; }
      .cart-panel-body::-webkit-scrollbar-thumb {
        background: var(--border, #e8e2da);
        border-radius: 4px;
      }

      /* ── Empty state ── */
      .cart-empty {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 60px 24px;
        text-align: center;
        color: var(--muted, #7a7a7a);
        gap: 12px;
      }
      .cart-empty-icon {
        font-size: 3rem;
        opacity: 0.5;
      }
      .cart-empty p { font-size: 0.95rem; margin: 0; }

      /* ── Məhsul kart ── */
      .cart-item-list {
        padding: 12px 16px;
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      .cart-item-card {
        display: flex;
        gap: 14px;
        background: var(--bg-card, #fff);
        border: 1.5px solid var(--border, #e8e2da);
        border-radius: 14px;
        padding: 14px;
        transition: box-shadow 0.18s;
        position: relative;
      }
      .cart-item-card:hover {
        box-shadow: 0 4px 18px rgba(0,0,0,0.07);
      }
      .cart-item-img {
        width: 82px;
        height: 106px;
        object-fit: cover;
        border-radius: 10px;
        flex-shrink: 0;
        background: #f0ece6;
      }
      .cart-item-body {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 4px;
        min-width: 0;
      }
      .cart-item-brand {
        font-size: 0.7rem;
        color: var(--accent, #c9a86c);
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.06em;
      }
      .cart-item-name {
        font-size: 0.9rem;
        font-weight: 600;
        color: var(--text, #1a1a1a);
        line-height: 1.3;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .cart-item-variants {
        display: flex;
        flex-wrap: wrap;
        gap: 5px;
        margin-top: 2px;
      }
      .cart-item-tag {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        font-size: 0.73rem;
        color: var(--muted, #7a7a7a);
        background: var(--bg, #faf7f4);
        border: 1px solid var(--border, #e8e2da);
        border-radius: 20px;
        padding: 2px 8px;
        font-weight: 500;
      }
      .cart-item-color-dot {
        width: 10px; height: 10px;
        border-radius: 50%;
        border: 1px solid rgba(0,0,0,0.12);
        flex-shrink: 0;
      }

      /* ── Qty & fiyat sıra ── */
      .cart-item-bottom {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-top: auto;
        padding-top: 6px;
      }
      .cart-item-qty {
        display: flex;
        align-items: center;
        gap: 0;
        border: 1.5px solid var(--border, #e8e2da);
        border-radius: 8px;
        overflow: hidden;
      }
      .cart-qty-btn {
        width: 30px; height: 30px;
        border: none;
        background: none;
        font-size: 1rem;
        color: var(--text, #1a1a1a);
        cursor: pointer;
        display: flex; align-items: center; justify-content: center;
        transition: background 0.15s;
      }
      .cart-qty-btn:hover { background: var(--border, #e8e2da); }
      .cart-qty-num {
        font-size: 0.85rem;
        font-weight: 700;
        min-width: 28px;
        text-align: center;
        color: var(--text, #1a1a1a);
        border-left: 1px solid var(--border, #e8e2da);
        border-right: 1px solid var(--border, #e8e2da);
        line-height: 30px;
      }
      .cart-item-price-col {
        text-align: right;
      }
      .cart-item-price {
        font-size: 1rem;
        font-weight: 700;
        color: var(--text, #1a1a1a);
      }
      .cart-item-remove {
        background: none;
        border: none;
        font-size: 0.73rem;
        color: var(--muted, #7a7a7a);
        cursor: pointer;
        text-decoration: underline;
        margin-top: 3px;
        display: block;
        text-align: right;
        padding: 0;
      }
      .cart-item-remove:hover { color: #e63946; }

      /* ── Önərilənlər bölümü ── */
      .cart-suggest-section {
        padding: 16px 16px 8px;
        border-top: 1.5px solid var(--border, #e8e2da);
        margin-top: 4px;
      }
      .cart-suggest-title {
        font-size: 0.78rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: var(--muted, #7a7a7a);
        margin-bottom: 12px;
      }
      .cart-suggest-row {
        display: flex;
        gap: 10px;
        overflow-x: auto;
        padding-bottom: 12px;
        scrollbar-width: none;
        -ms-overflow-style: none;
      }
      .cart-suggest-row::-webkit-scrollbar { display: none; }
      .cart-suggest-card {
        flex-shrink: 0;
        width: 130px;
        background: var(--bg-card, #fff);
        border: 1.5px solid var(--border, #e8e2da);
        border-radius: 12px;
        overflow: hidden;
        cursor: pointer;
        transition: all 0.2s;
        position: relative;
      }
      .cart-suggest-card:hover {
        border-color: var(--accent, #c9a86c);
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(0,0,0,0.09);
      }
      .cart-suggest-img-wrap {
        width: 100%;
        height: 130px;
        overflow: hidden;
        background: #f0ece6;
      }
      .cart-suggest-img-wrap img {
        width: 100%; height: 100%;
        object-fit: cover;
        transition: transform 0.3s;
      }
      .cart-suggest-card:hover .cart-suggest-img-wrap img {
        transform: scale(1.05);
      }
      .cart-suggest-info {
        padding: 8px 8px 6px;
      }
      .cart-suggest-brand {
        font-size: 0.65rem;
        color: var(--accent, #c9a86c);
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }
      .cart-suggest-name {
        font-size: 0.75rem;
        font-weight: 600;
        color: var(--text, #1a1a1a);
        line-height: 1.25;
        margin: 2px 0 3px;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }
      .cart-suggest-price {
        font-size: 0.8rem;
        font-weight: 700;
        color: var(--text, #1a1a1a);
      }
      .cart-suggest-add {
        position: absolute;
        top: 8px; right: 8px;
        width: 26px; height: 26px;
        border-radius: 50%;
        background: var(--accent, #c9a86c);
        border: none;
        color: #fff;
        display: flex; align-items: center; justify-content: center;
        cursor: pointer;
        opacity: 0;
        transform: scale(0.8);
        transition: all 0.18s;
        box-shadow: 0 2px 8px rgba(0,0,0,0.18);
      }
      .cart-suggest-card:hover .cart-suggest-add {
        opacity: 1;
        transform: scale(1);
      }

      /* ── Footer ── */
      .cart-panel-footer {
        flex-shrink: 0;
        padding: 16px 20px 20px;
        border-top: 2px solid var(--border, #e8e2da);
        background: var(--bg, #faf7f4);
      }
      .cart-coupon-row {
        display: flex;
        gap: 8px;
        margin-bottom: 14px;
      }
      .cart-coupon-input {
        flex: 1;
        height: 38px;
        border: 1.5px solid var(--border, #e8e2da);
        border-radius: 8px;
        padding: 0 12px;
        font-size: 0.83rem;
        background: var(--bg-card, #fff);
        color: var(--text, #1a1a1a);
        font-family: inherit;
        outline: none;
        transition: border-color 0.18s;
      }
      .cart-coupon-input:focus { border-color: var(--accent, #c9a86c); }
      .cart-coupon-input::placeholder { color: var(--muted, #7a7a7a); }
      .cart-coupon-btn {
        height: 38px;
        padding: 0 14px;
        background: none;
        border: 1.5px solid var(--accent, #c9a86c);
        border-radius: 8px;
        color: var(--accent, #c9a86c);
        font-size: 0.8rem;
        font-weight: 600;
        cursor: pointer;
        font-family: inherit;
        transition: all 0.18s;
        white-space: nowrap;
      }
      .cart-coupon-btn:hover {
        background: var(--accent, #c9a86c);
        color: #fff;
      }
      .cart-price-rows {
        display: flex;
        flex-direction: column;
        gap: 6px;
        margin-bottom: 14px;
      }
      .cart-price-row {
        display: flex;
        justify-content: space-between;
        font-size: 0.85rem;
        color: var(--muted, #7a7a7a);
      }
      .cart-price-row.total {
        font-size: 1.05rem;
        font-weight: 700;
        color: var(--text, #1a1a1a);
        padding-top: 8px;
        border-top: 1px solid var(--border, #e8e2da);
        margin-top: 4px;
      }
      .cart-free-ship {
        border-radius: 8px;
        padding: 9px 12px;
        font-size: 0.8rem;
        margin-bottom: 14px;
        display: flex;
        align-items: center;
        gap: 7px;
      }
      .cart-free-ship.yes {
        background: #f0faf4;
        color: #2d7a47;
      }
      .cart-free-ship.no {
        background: #fdf8f0;
        color: var(--accent-dark, #a07820);
      }
      .cart-checkout-btn {
        width: 100%;
        height: 46px;
        background: var(--accent, #c9a86c);
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
      }
      .cart-checkout-btn:hover {
        background: var(--accent-dark, #a07820);
        transform: translateY(-1px);
        box-shadow: 0 6px 20px rgba(201,168,108,0.35);
      }
      .cart-checkout-btn:active { transform: translateY(0); }

      /* ── Skeleton loader ── */
      .cart-suggest-skeleton {
        flex-shrink: 0;
        width: 130px;
        height: 200px;
        border-radius: 12px;
        background: linear-gradient(90deg, var(--border,#e8e2da) 25%, #f5f2ee 50%, var(--border,#e8e2da) 75%);
        background-size: 200% 100%;
        animation: cartSkeleton 1.4s infinite;
      }
      @keyframes cartSkeleton {
        0%   { background-position: 200% 0; }
        100% { background-position: -200% 0; }
      }

      @media (max-width: 520px) {
        .cart-panel { max-width: 100%; }
      }
    `;
    document.head.appendChild(style);
  }

  // Əvvəlcə skeleton ilə göstər
  overlay.innerHTML = `
    <div class="cart-panel">
      <div class="cart-panel-header">
        <div class="cart-panel-title">
          🛒 Səbətim
          <span class="cart-panel-count">${cart.getCount()} məhsul</span>
        </div>
        <button class="cart-panel-close" id="cartPanelCloseBtn">✕</button>
      </div>

      <div class="cart-panel-body" id="cartPanelBody">
        ${items.length === 0 ? `
          <div class="cart-empty">
            <div class="cart-empty-icon">🛍️</div>
            <p>Səbətiniz boşdur</p>
          </div>
        ` : `
          <div class="cart-item-list">
            ${items.map(item => `
              <div class="cart-item-card">
                <img class="cart-item-img"
                  src="${item.img || ''}"
                  alt="${item.name}"
                  loading="lazy"
                  onerror="this.style.background='#e8e2da'"
                />
                <div class="cart-item-body">
                  <div class="cart-item-brand">${item.brand || ''}</div>
                  <div class="cart-item-name">${item.name}</div>
                  <div class="cart-item-variants">
                    ${item.size  ? `<span class="cart-item-tag">📐 ${item.size}</span>` : ''}
                    ${item.color ? `<span class="cart-item-tag">
                      ${item.colorHex
                        ? `<span class="cart-item-color-dot" style="background:${item.colorHex}"></span>`
                        : ''}
                      ${item.color}
                    </span>` : ''}
                  </div>
                  <div class="cart-item-bottom">
                    <div class="cart-item-qty">
                      <button class="cart-qty-btn"
                        onclick="cart.updateQty('${item.cartId}', ${item.quantity - 1})">−</button>
                      <span class="cart-qty-num">${item.quantity}</span>
                      <button class="cart-qty-btn"
                        onclick="cart.updateQty('${item.cartId}', ${item.quantity + 1})">+</button>
                    </div>
                    <div class="cart-item-price-col">
                      <div class="cart-item-price">${(item.price * item.quantity).toFixed(2)} ₼</div>
                      <button class="cart-item-remove"
                        onclick="cart.remove('${item.cartId}')">Sil</button>
                    </div>
                  </div>
                </div>
              </div>
            `).join('')}
          </div>

          <!-- Önərilənlər: əvvəlcə skeleton -->
          <div class="cart-suggest-section" id="cartSuggestSection">
            <div class="cart-suggest-title">Bəyənə biləcəkləriniz</div>
            <div class="cart-suggest-row" id="cartSuggestRow">
              ${[1,2,3,4,5].map(() => `<div class="cart-suggest-skeleton"></div>`).join('')}
            </div>
          </div>
        `}
      </div>

      <div class="cart-panel-footer">
        ${items.length > 0 ? `
          <div class="cart-coupon-row">
            <input class="cart-coupon-input" type="text" id="cartCouponInput"
              placeholder="Kupon kodu əlavə et..." />
            <button class="cart-coupon-btn" onclick="applyCoupon()">Tətbiq et</button>
          </div>
          <div class="cart-price-rows">
            <div class="cart-price-row">
              <span>Məhsullar (${cart.getCount()} ədəd)</span>
              <span>${total.toFixed(2)} ₼</span>
            </div>
            <div class="cart-price-row">
              <span>Çatdırılma</span>
              <span>${total >= 50 ? '<span style="color:#2d7a47">Pulsuz</span>' : '5.00 ₼'}</span>
            </div>
            <div class="cart-price-row total">
              <span>Cəmi</span>
              <span>${(total >= 50 ? total : total + 5).toFixed(2)} ₼</span>
            </div>
          </div>
          ${total >= 50
            ? `<div class="cart-free-ship yes">✓ Pulsuz çatdırılma hüququnuz var!</div>`
            : `<div class="cart-free-ship no">🚚 Pulsuz çatdırılma üçün daha <strong>${(50 - total).toFixed(2)} ₼</strong> əlavə edin</div>`
          }
        ` : ''}
        <button class="cart-checkout-btn" onclick="handleCheckout()">
          Səbəti Təsdiqlə
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="16" height="16">
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
        </button>
      </div>
    </div>
  `;

  // Bağlama düyməsi
  const closeBtn = document.getElementById('cartPanelCloseBtn');
  if (closeBtn) closeBtn.addEventListener('click', () => modal.close('cartModal'));

  // Overlay klik bağlama
  overlay.addEventListener('click', e => {
    if (e.target === overlay) modal.close('cartModal');
  });

  // Önərilənləri async yüklə
  if (items.length > 0) {
    getSuggestedProducts(items).then(suggested => {
      const row = document.getElementById('cartSuggestRow');
      if (!row) return;
      if (suggested.length === 0) {
        document.getElementById('cartSuggestSection')?.remove();
        return;
      }
      row.innerHTML = suggested.map(p => suggestedProductCard(p)).join('');
    }).catch(() => {
      document.getElementById('cartSuggestSection')?.remove();
    });
  }
}

/* ── Kupon (demo) ── */
function applyCoupon() {
  const input = document.getElementById('cartCouponInput');
  if (!input) return;
  const code = input.value.trim().toUpperCase();
  if (!code) { toast.show('Kupon kodu daxil edin', 'default'); return; }
  // Demo: istənilən kod 10% endirim göstərir
  toast.show(`"${code}" kuponu tətbiq edildi — tezliklə aktiv olacaq`, 'default');
}

/* ══════════════════════════════
   CHECKOUT — ünvan seçimi
   ══════════════════════════════ */
let _checkoutAddress = null;
let _checkoutMap     = null;
let _checkoutMarker  = null;

function handleCheckout() {
  if (!auth.isLoggedIn()) {
    modal.close('cartModal');
    modal.open('authModal');
    toast.show('Sifariş üçün daxil olun', 'default');
    return;
  }
  modal.close('cartModal');
  openAddressStep();
}

function openAddressStep() {
  const old = document.getElementById('checkoutOverlay');
  if (old) old.remove();

  const overlay = document.createElement('div');
  overlay.id = 'checkoutOverlay';
  overlay.className = 'overlay';
  overlay.style.cssText = 'display:flex;align-items:center;justify-content:center;z-index:1000';

  overlay.innerHTML = `
    <div class="modal modal-lg" style="max-width:560px;width:100%">
      <button class="modal-close" onclick="closeCheckout()">✕</button>
      <h2 style="font-family:var(--font-display);margin-bottom:6px">Çatdırılma ünvanı</h2>
      <p style="color:var(--muted);font-size:0.85rem;margin-bottom:20px">Xəritədə pinə klikləyin və ya sürüşdürün</p>

      <div id="checkoutMap" style="width:100%;height:320px;border-radius:12px;border:1px solid var(--border);margin-bottom:16px;background:#e8e0d8;overflow:hidden"></div>

      <div id="addressDisplay" style="background:var(--bg-2,#f7f4f0);border-radius:10px;padding:12px 16px;font-size:0.88rem;color:var(--muted);margin-bottom:20px;min-height:42px;display:flex;align-items:center;gap:8px">
        <span style="font-size:1.1rem">📍</span>
        <span id="addressText">Xəritəyə klikləyin — ünvan avtomatik doldurulacaq</span>
      </div>

      <button id="addrNextBtn" class="btn btn-primary btn-full" onclick="openPaymentStep()" disabled
        style="opacity:0.45;cursor:not-allowed">
        Ödənişə keç →
      </button>
    </div>
  `;

  document.body.appendChild(overlay);
  setTimeout(() => overlay.classList.add('open'), 10);

  overlay.addEventListener('click', e => { if (e.target === overlay) closeCheckout(); });

  _loadLeaflet(() => _initMap());
}

function _loadLeaflet(cb) {
  if (window.L) { cb(); return; }

  const link = document.createElement('link');
  link.rel  = 'stylesheet';
  link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
  document.head.appendChild(link);

  const script = document.createElement('script');
  script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
  script.onload = cb;
  document.head.appendChild(script);
}

function _initMap() {
  const mapEl = document.getElementById('checkoutMap');
  if (!mapEl || !window.L) return;

  _checkoutMap = L.map('checkoutMap').setView([40.4093, 49.8671], 13);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap'
  }).addTo(_checkoutMap);

  _checkoutMap.on('click', async (e) => {
    const { lat, lng } = e.latlng;

    if (_checkoutMarker) {
      _checkoutMarker.setLatLng([lat, lng]);
    } else {
      _checkoutMarker = L.marker([lat, lng], { draggable: true }).addTo(_checkoutMap);
      _checkoutMarker.on('dragend', async () => {
        const pos = _checkoutMarker.getLatLng();
        await _reverseGeocode(pos.lat, pos.lng);
      });
    }

    await _reverseGeocode(lat, lng);
  });
}

async function _reverseGeocode(lat, lng) {
  const textEl = document.getElementById('addressText');
  if (textEl) textEl.textContent = 'Ünvan axtarılır...';

  try {
    const res  = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=az`);
    const data = await res.json();

    const addr = data.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    _checkoutAddress = { lat, lng, label: addr };

    if (textEl) textEl.textContent = addr;

    const btn = document.getElementById('addrNextBtn');
    if (btn) { btn.disabled = false; btn.style.opacity = '1'; btn.style.cursor = 'pointer'; }
  } catch {
    _checkoutAddress = { lat, lng, label: `${lat.toFixed(5)}, ${lng.toFixed(5)}` };
    if (textEl) textEl.textContent = _checkoutAddress.label;
    const btn = document.getElementById('addrNextBtn');
    if (btn) { btn.disabled = false; btn.style.opacity = '1'; btn.style.cursor = 'pointer'; }
  }
}

/* ══════════════════════════════
   CHECKOUT — ödəniş seçimi
   ══════════════════════════════ */
const DEMO_WALLET_BALANCE = 10000;

function openPaymentStep() {
  const overlay = document.getElementById('checkoutOverlay');
  if (!overlay) return;

  const total = cart.getTotal();

  overlay.querySelector('.modal').innerHTML = `
    <button class="modal-close" onclick="closeCheckout()">✕</button>
    <button onclick="openAddressStep()" style="background:none;border:none;color:var(--muted);font-size:0.82rem;cursor:pointer;margin-bottom:16px;display:flex;align-items:center;gap:4px">
      ← Ünvana qayıt
    </button>
    <h2 style="font-family:var(--font-display);margin-bottom:6px">Ödəniş</h2>
    <p style="color:var(--muted);font-size:0.85rem;margin-bottom:20px">Ödəniş üsulunu seçin</p>

    <div style="background:var(--bg-2,#f7f4f0);border-radius:10px;padding:10px 14px;font-size:0.82rem;color:var(--muted);margin-bottom:20px;display:flex;gap:8px;align-items:flex-start">
      <span>📍</span>
      <span>${_checkoutAddress ? _checkoutAddress.label : '—'}</span>
    </div>

    <div style="display:flex;flex-direction:column;gap:12px;margin-bottom:24px">

      <label id="walletOption" style="display:flex;align-items:center;gap:14px;padding:16px;border:2px solid var(--border);border-radius:12px;cursor:pointer;transition:border-color 0.2s">
        <input type="radio" name="payMethod" value="wallet" style="display:none" onchange="selectPayMethod('wallet')"/>
        <div style="width:42px;height:42px;border-radius:10px;background:linear-gradient(135deg,#f0c040,#e0a020);display:flex;align-items:center;justify-content:center;font-size:1.3rem;flex-shrink:0">💰</div>
        <div style="flex:1">
          <div style="font-weight:600;margin-bottom:2px">Pul qabı</div>
          <div style="font-size:0.8rem;color:var(--muted)">Balans: <strong style="color:#2d7a47">${DEMO_WALLET_BALANCE.toFixed(2)} ₼</strong></div>
        </div>
        <div id="walletCheck" style="width:20px;height:20px;border-radius:50%;border:2px solid var(--border);flex-shrink:0"></div>
      </label>

      <label id="cardOption" style="display:flex;align-items:center;gap:14px;padding:16px;border:2px solid var(--border);border-radius:12px;cursor:not-allowed;opacity:0.6;position:relative">
        <input type="radio" name="payMethod" value="card" disabled style="display:none"/>
        <div style="width:42px;height:42px;border-radius:10px;background:linear-gradient(135deg,#3a6fd8,#1a4fb8);display:flex;align-items:center;justify-content:center;font-size:1.3rem;flex-shrink:0">💳</div>
        <div style="flex:1">
          <div style="font-weight:600;margin-bottom:2px">Bank kartı</div>
          <div style="font-size:0.8rem;color:var(--muted)">Tezliklə əlavə ediləcək</div>
        </div>
        <div style="background:#fdf8f0;color:#b07820;font-size:0.7rem;font-weight:600;padding:3px 8px;border-radius:20px;border:1px solid #e8c870;flex-shrink:0">Tezliklə</div>
      </label>
    </div>

    <div style="background:var(--bg-2,#f7f4f0);border-radius:10px;padding:14px 16px;font-size:0.78rem;color:var(--muted);line-height:1.6;margin-bottom:16px">
      <strong style="color:var(--text);display:block;margin-bottom:6px">Satış şərtləri</strong>
      Sifarişiniz təsdiqləndikdən sonra satıcı 24 saat ərzində göndərişi hazırlamalıdır.
      Məhsul çatdırıldıqdan sonra <strong>3 iş günü</strong> ərzində iade tələb edə bilərsiniz.
      İade üçün məhsul istifadə olunmamış və orijinal qablaşdırmada olmalıdır.
      Ödənilmiş məbləğ 5–7 iş günü ərzində geri qaytarılır.
      Rəqəmsal məhsullar, istifadə edilmiş geyimlər və xüsusi sifarişlər iade edilmir.
    </div>

    <label style="display:flex;align-items:flex-start;gap:10px;font-size:0.83rem;color:var(--muted);cursor:pointer;margin-bottom:20px">
      <input type="checkbox" id="termsCheck" onchange="updatePlaceBtn()" style="margin-top:2px;accent-color:var(--accent)"/>
      Şərtləri oxudum və qəbul edirəm
    </label>

    <div style="border-top:1px solid var(--border);padding-top:16px">
      <div style="display:flex;justify-content:space-between;font-size:1rem;margin-bottom:16px">
        <span>Cəmi:</span>
        <strong>${total.toFixed(2)} ₼</strong>
      </div>
      <button id="placeOrderBtn" class="btn btn-primary btn-full" onclick="placeOrder()" disabled
        style="opacity:0.4;cursor:not-allowed">
        Sifarişi Təsdiqlə →
      </button>
    </div>
  `;

  setTimeout(() => { selectPayMethod('wallet'); }, 50);
}

let _selectedPayMethod = null;

function selectPayMethod(method) {
  _selectedPayMethod = method;

  const walletOpt = document.getElementById('walletOption');
  const walletChk = document.getElementById('walletCheck');

  if (walletOpt) walletOpt.style.borderColor = method === 'wallet' ? 'var(--accent)' : 'var(--border)';
  if (walletChk) {
    walletChk.style.background  = method === 'wallet' ? 'var(--accent)' : 'transparent';
    walletChk.style.borderColor = method === 'wallet' ? 'var(--accent)' : 'var(--border)';
    walletChk.innerHTML         = method === 'wallet' ? '<svg viewBox="0 0 10 10" width="10" height="10"><polyline points="1.5,5 4,7.5 8.5,2.5" fill="none" stroke="#fff" stroke-width="1.5" stroke-linecap="round"/></svg>' : '';
  }
  updatePlaceBtn();
}

function updatePlaceBtn() {
  const terms = document.getElementById('termsCheck');
  const btn   = document.getElementById('placeOrderBtn');
  if (!btn) return;
  const ok = _selectedPayMethod && terms && terms.checked;
  btn.disabled      = !ok;
  btn.style.opacity = ok ? '1' : '0.4';
  btn.style.cursor  = ok ? 'pointer' : 'not-allowed';
}

/* ══════════════════════════════
   SİFARİŞ VER — Firestore
   ══════════════════════════════ */
async function placeOrder() {
  const user = fbAuth.currentUser;
  if (!user || !_checkoutAddress || !_selectedPayMethod) return;

  const btn = document.getElementById('placeOrderBtn');
  if (btn) { btn.disabled = true; btn.textContent = 'Emal olunur...'; }

  try {
    const items = cart.getItems();
    const total = cart.getTotal();

    // Müştəri məlumatlarını Firestore-dan al
    let buyerName  = user.displayName || '';
    let buyerPhone = '';
    try {
      const uSnap = await fbDb.collection('users').doc(user.uid).get();
      if (uSnap.exists) {
        const ud = uSnap.data();
        buyerName  = ((ud.firstName || '') + ' ' + (ud.lastName || '')).trim() || user.displayName || '';
        buyerPhone = ud.phone || ud.phoneNumber || '';
      }
    } catch(e) { /* skip */ }

    const vendorGroups = {};
    items.forEach(item => {
      const vid = item.vendorId || item.userId || 'unknown';
      if (!vendorGroups[vid]) vendorGroups[vid] = [];
      vendorGroups[vid].push(item);
    });

    const orderPromises = Object.entries(vendorGroups).map(async ([vendorId, vendorItems]) => {
      const counterRef = fbDb.collection('orderCounters').doc(vendorId);
      const orderNumber = await fbDb.runTransaction(async (tx) => {
        const snap = await tx.get(counterRef);
        const next = snap.exists ? (snap.data().count || 0) + 1 : 1;
        tx.set(counterRef, { count: next }, { merge: true });
        return next;
      });

      const orderNum    = String(orderNumber).padStart(6, '0');
      const vendorTotal = vendorItems.reduce((s, i) => s + i.price * (i.quantity || 1), 0);

      await fbDb.collection('orders').add({
        orderNumber:   orderNum,
        buyerId:       user.uid,
        buyerEmail:    user.email || '',
        buyerName:     buyerName,
        buyerPhone:    buyerPhone,
        vendorId:      vendorId,
        items:         vendorItems.map(i => ({
          id:            i.id,
          name:          i.name,
          price:         i.price,
          quantity:      i.quantity,
          img:           i.img   || '',
          brand:         i.brand || '',
          size:          i.size  || null,
          selectedSize:  i.size  ? { label: i.size } : null,
          selectedColor: i.color ? { name: i.color, hex: i.colorHex || '' } : null,
        })),
        total:         vendorTotal,
        address:       _checkoutAddress,
        paymentMethod: _selectedPayMethod,
        status:        'pending',
        createdAt:     firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt:     firebase.firestore.FieldValue.serverTimestamp()
      });
    });

    await Promise.all(orderPromises);
    await cart.clear();

    closeCheckout();
    showOrderSuccess();

  } catch (err) {
    toast.show('Xəta baş verdi: ' + err.message, 'error');
    if (btn) { btn.disabled = false; btn.textContent = 'Sifarişi Təsdiqlə →'; }
  }
}

function showOrderSuccess() {
  const old = document.getElementById('orderSuccessOverlay');
  if (old) old.remove();

  const overlay = document.createElement('div');
  overlay.id = 'orderSuccessOverlay';
  overlay.className = 'overlay';
  overlay.style.cssText = 'display:flex;align-items:center;justify-content:center;z-index:1000';

  overlay.innerHTML = `
    <div class="modal" style="max-width:420px;text-align:center;padding:40px 32px">
      <div style="font-size:3rem;margin-bottom:16px">🎉</div>
      <h2 style="font-family:var(--font-display);margin-bottom:10px">Sifariş qəbul edildi!</h2>
      <p style="color:var(--muted);font-size:0.9rem;line-height:1.6;margin-bottom:28px">
        Sifarişiniz satıcıya göndərildi.<br>
        Status yeniləmələrini profil səhifənizdən izləyə bilərsiniz.
      </p>
      <button class="btn btn-primary btn-full" onclick="document.getElementById('orderSuccessOverlay').remove();window.location.href='profile.html'">
        Sifarişlərə bax
      </button>
      <button onclick="document.getElementById('orderSuccessOverlay').remove()"
        style="background:none;border:none;color:var(--muted);font-size:0.85rem;margin-top:12px;cursor:pointer;text-decoration:underline;display:block;width:100%">
        Alış-verişə davam et
      </button>
    </div>
  `;

  document.body.appendChild(overlay);
  setTimeout(() => overlay.classList.add('open'), 10);
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
}

function closeCheckout() {
  const overlay = document.getElementById('checkoutOverlay');
  if (overlay) {
    overlay.classList.remove('open');
    setTimeout(() => overlay.remove(), 300);
  }
  if (_checkoutMap) { _checkoutMap.remove(); _checkoutMap = null; }
  _checkoutMarker  = null;
  _checkoutAddress = null;
  _selectedPayMethod = null;
}

document.addEventListener('DOMContentLoaded', initCartModal);
