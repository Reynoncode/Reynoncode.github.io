/* ═══════════════════════════════════════════
   cart.js — Firestore Səbət
   Real-vaxt sinxronizasiya — fərqli cihazlarda eyni hesab = eyni səbət
   ═══════════════════════════════════════════ */

const cart = {
  _items:       [],
  _unsubscribe: null,

  /* ── Firestore dinləyicisini qur / söndür ── */
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

      // Səbət modalı açıqdırsa yenilə
      const overlay = document.getElementById('cartModal');
      if (overlay && overlay.classList.contains('open')) renderCartModal();
    });
  },

  /* ── Səbəti al ── */
  getItems() { return this._items; },

  /* ── Məhsul əlavə et ── */
  async add(product, size = null) {
    const user = fbAuth.currentUser;
    if (!user) {
      if (typeof modal !== 'undefined') modal.open('authModal');
      if (typeof toast !== 'undefined') toast.show('Səbətə əlavə etmək üçün daxil olun', 'default');
      return;
    }

    const docId   = size ? `${product.id}_${size}` : String(product.id);
    const itemRef = fbDb.collection('users').doc(user.uid).collection('cart').doc(docId);
    const existing = this._items.find(i => i.cartId === docId);

    if (existing) {
      await itemRef.update({
        quantity:  existing.quantity + 1,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    } else {
      await itemRef.set({
        id:        product.id,
        name:      product.name,
        price:     product.price,
        img:       product.img || product.image || '',
        brand:     product.brand || '',
        size:      size || null,
        quantity:  1,
        addedAt:   firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    }

    if (typeof toast !== 'undefined') toast.show(`${product.name} səbətə əlavə edildi 🛒`, 'success');
  },

  /* ── Məhsulu sil ── */
  async remove(cartId) {
    const user = fbAuth.currentUser;
    if (!user) return;
    await fbDb.collection('users').doc(user.uid).collection('cart').doc(cartId).delete();
  },

  /* ── Sayı yenilə ── */
  async updateQty(cartId, qty) {
    if (qty < 1) { await this.remove(cartId); return; }
    const user = fbAuth.currentUser;
    if (!user) return;
    await fbDb.collection('users').doc(user.uid).collection('cart').doc(cartId).update({
      quantity:  qty,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
  },

  /* ── Ümumi say ── */
  getCount() {
    return this._items.reduce((sum, i) => sum + (i.quantity || 1), 0);
  },

  /* ── Cəmi qiymət ── */
  getTotal() {
    return this._items.reduce((sum, i) => sum + i.price * (i.quantity || 1), 0);
  },

  /* ── Səbəti boşalt ── */
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
   CART MODAL — Səbət popup
   ══════════════════════════════ */
function initCartModal() {
  const overlay = document.getElementById('cartModal');
  if (!overlay) return;

  overlay.addEventListener('click', e => {
    if (e.target === overlay) modal.close('cartModal');
  });

  // Modalın açılması izlənir
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
        <span style="font-size:1rem;color:var(--muted);font-family:var(--font-body)">
          (${cart.getCount()} məhsul)
        </span>
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
                ${item.size ? `<div style="font-size:0.8rem;color:var(--muted)">Ölçü: ${item.size}</div>` : ''}
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
            ? `<div style="background:#f0faf4;color:#2d7a47;border-radius:var(--radius-md);padding:10px 14px;font-size:0.85rem;margin-bottom:16px">
                ✓ Pulsuz çatdırılma hüququnuz var!
               </div>`
            : `<div style="background:#fdf8f0;color:var(--accent-dark);border-radius:var(--radius-md);padding:10px 14px;font-size:0.85rem;margin-bottom:16px">
                Pulsuz çatdırılma üçün daha ${(50 - total).toFixed(2)} ₼ əlavə edin
               </div>`
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

function handleCheckout() {
  if (!auth.isLoggedIn()) {
    modal.close('cartModal');
    modal.open('authModal');
    toast.show('Sifariş üçün daxil olun', 'default');
    return;
  }
  // TODO: ödəniş səhifəsinə yönləndir
  toast.show('Ödəniş sistemi tezliklə əlavə ediləcək 🚧', 'default');
}

document.addEventListener('DOMContentLoaded', initCartModal);
