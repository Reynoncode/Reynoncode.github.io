/* ═══════════════════════════════════════════
   cart.js — Alış-veriş səbəti
   Məhsul əlavə et, sil, say yenilə, cəmi hesabla
   ═══════════════════════════════════════════ */

const cart = {

  /* ── Səbəti al ── */
  getItems() {
    const data = localStorage.getItem('moda_cart');
    return data ? JSON.parse(data) : [];
  },

  /* ── Səbəti saxla ── */
  _save(items) {
    localStorage.setItem('moda_cart', JSON.stringify(items));
    updateCartBadge();
  },

  /* ── Məhsul əlavə et ── */
  add(product, size = null) {
    const items = this.getItems();
    const key   = `${product.id}_${size}`;
    const existing = items.find(i => i.key === key);

    if (existing) {
      existing.qty += 1;
    } else {
      items.push({ key, ...product, size, qty: 1 });
    }

    this._save(items);
    toast.show(`${product.name} səbətə əlavə edildi 🛒`, 'success');
  },

  /* ── Məhsulu sil ── */
  remove(key) {
    const items = this.getItems().filter(i => i.key !== key);
    this._save(items);
  },

  /* ── Sayı yenilə ── */
  updateQty(key, qty) {
    if (qty < 1) { this.remove(key); return; }
    const items = this.getItems();
    const item  = items.find(i => i.key === key);
    if (item) { item.qty = qty; this._save(items); }
  },

  /* ── Sayı al ── */
  getCount() {
    return this.getItems().reduce((sum, i) => sum + i.qty, 0);
  },

  /* ── Cəmi qiymət ── */
  getTotal() {
    return this.getItems().reduce((sum, i) => sum + i.price * i.qty, 0);
  },

  /* ── Səbəti boşalt ── */
  clear() {
    this._save([]);
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

  // Səbət açıldıqda yenilə
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
        Səbətim <span style="font-size:1rem;color:var(--muted);font-family:var(--font-body)">(${cart.getCount()} məhsul)</span>
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
              <img src="${item.img}" alt="${item.name}"
                style="width:70px;height:90px;object-fit:cover;border-radius:var(--radius-md);flex-shrink:0"/>
              <div style="flex:1">
                <div style="font-size:0.72rem;color:var(--accent);font-weight:600;text-transform:uppercase">${item.brand}</div>
                <div style="font-weight:500;margin:2px 0 6px">${item.name}</div>
                ${item.size ? `<div style="font-size:0.8rem;color:var(--muted)">Ölçü: ${item.size}</div>` : ''}
                <div style="display:flex;align-items:center;gap:10px;margin-top:8px">
                  <button onclick="cart.updateQty('${item.key}', ${item.qty-1}); renderCartModal()"
                    style="width:26px;height:26px;border:1px solid var(--border);border-radius:6px;background:none;font-size:1rem;display:flex;align-items:center;justify-content:center">−</button>
                  <span style="font-weight:600;min-width:20px;text-align:center">${item.qty}</span>
                  <button onclick="cart.updateQty('${item.key}', ${item.qty+1}); renderCartModal()"
                    style="width:26px;height:26px;border:1px solid var(--border);border-radius:6px;background:none;font-size:1rem;display:flex;align-items:center;justify-content:center">+</button>
                </div>
              </div>
              <div style="text-align:right">
                <div style="font-weight:700;font-size:1rem">${item.price * item.qty} ₼</div>
                <button onclick="cart.remove('${item.key}'); renderCartModal()"
                  style="background:none;border:none;color:var(--muted);font-size:0.78rem;margin-top:6px;cursor:pointer;text-decoration:underline">Sil</button>
              </div>
            </div>
          `).join('')}
        </div>

        <div style="border-top:2px solid var(--border);padding-top:20px">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
            <span style="font-size:1rem">Cəmi:</span>
            <span style="font-size:1.3rem;font-weight:700">${total} ₼</span>
          </div>
          ${total >= 50
            ? `<div style="background:#f0faf4;color:#2d7a47;border-radius:var(--radius-md);padding:10px 14px;font-size:0.85rem;margin-bottom:16px">
                ✓ Pulsuz çatdırılma hüququnuz var!
               </div>`
            : `<div style="background:#fdf8f0;color:var(--accent-dark);border-radius:var(--radius-md);padding:10px 14px;font-size:0.85rem;margin-bottom:16px">
                Pulsuz çatdırılma üçün daha ${50 - total} ₼ əlavə edin
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
