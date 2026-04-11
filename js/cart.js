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

function renderCartModal() {
  const items   = cart.getItems();
  const total   = cart.getTotal();
  const overlay = document.getElementById('cartModal');
  if (!overlay) return;

  overlay.innerHTML = `
    <div class="modal modal-lg">
      <button class="modal-close">✕</button>
      <h2 style="font-family:var(--font-display);margin-bottom:24px">
        Səbətim
        <span style="font-size:1rem;color:var(--muted);font-family:var(--font-body)">(${cart.getCount()} məhsul)</span>
      </h2>

      ${items.length === 0 ? `
        <div style="text-align:center;padding:40px 0;color:var(--muted)">
          <p style="font-size:2rem;margin-bottom:12px">🛒</p>
          <p>Səbətiniz boşdur</p>
        </div>
      ` : `
        <div style="display:flex;flex-direction:column;gap:16px;margin-bottom:24px;max-height:50vh;overflow-y:auto">
          ${items.map(item => `
            <div style="display:flex;gap:14px;align-items:center;padding-bottom:16px;border-bottom:1px solid var(--border)">
              <img src="${item.img || ''}" alt="${item.name}"
                style="width:70px;height:90px;object-fit:cover;border-radius:var(--radius-md);flex-shrink:0;background:#f0ece6"/>
              <div style="flex:1">
                <div style="font-size:0.72rem;color:var(--accent);font-weight:600;text-transform:uppercase">${item.brand || ''}</div>
                <div style="font-weight:500;margin:2px 0 6px">${item.name}</div>
                ${item.size  ? `<div style="font-size:0.8rem;color:var(--muted)">Ölçü: ${item.size}</div>` : ''}
                ${item.color ? `<div style="font-size:0.8rem;color:var(--muted);display:flex;align-items:center;gap:5px">
                  Rəng: ${item.colorHex ? `<span style="display:inline-block;width:12px;height:12px;border-radius:50%;background:${item.colorHex};border:1px solid #ddd;"></span>` : ''} ${item.color}
                </div>` : ''}
                <div style="display:flex;align-items:center;gap:10px;margin-top:8px">
                  <button onclick="cart.updateQty('${item.cartId}', ${item.quantity - 1})"
                    style="width:26px;height:26px;border:1px solid var(--border);border-radius:6px;background:none;font-size:1rem;display:flex;align-items:center;justify-content:center;cursor:pointer">−</button>
                  <span style="font-weight:600;min-width:20px;text-align:center">${item.quantity}</span>
                  <button onclick="cart.updateQty('${item.cartId}', ${item.quantity + 1})"
                    style="width:26px;height:26px;border:1px solid var(--border);border-radius:6px;background:none;font-size:1rem;display:flex;align-items:center;justify-content:center;cursor:pointer">+</button>
                </div>
              </div>
              <div style="text-align:right">
                <div style="font-weight:700;font-size:1rem">${(item.price * item.quantity).toFixed(2)} ₼</div>
                <button onclick="cart.remove('${item.cartId}')"
                  style="background:none;border:none;color:var(--muted);font-size:0.78rem;margin-top:6px;cursor:pointer;text-decoration:underline">Sil</button>
              </div>
            </div>
          `).join('')}
        </div>

        <div style="border-top:2px solid var(--border);padding-top:20px">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
            <span style="font-size:1rem">Cəmi:</span>
            <span style="font-size:1.3rem;font-weight:700">${total.toFixed(2)} ₼</span>
          </div>
          ${total >= 50
            ? `<div style="background:#f0faf4;color:#2d7a47;border-radius:var(--radius-md);padding:10px 14px;font-size:0.85rem;margin-bottom:16px">✓ Pulsuz çatdırılma hüququnuz var!</div>`
            : `<div style="background:#fdf8f0;color:var(--accent-dark);border-radius:var(--radius-md);padding:10px 14px;font-size:0.85rem;margin-bottom:16px">Pulsuz çatdırılma üçün daha ${(50 - total).toFixed(2)} ₼ əlavə edin</div>`
          }
          <button class="btn btn-primary btn-full" onclick="handleCheckout()">
            Sifarişi Tamamla →
          </button>
        </div>
      `}
    </div>
  `;

  overlay.querySelector('.modal-close').addEventListener('click', () => modal.close('cartModal'));
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
