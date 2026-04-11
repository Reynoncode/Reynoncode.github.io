/* ═══════════════════════════════════════════
   vendor.js — Satıcı Paneli
   ═══════════════════════════════════════════ */

const vendor = {

  async getStatus(uid) {
    try {
      const doc = await fbDb.collection('vendors').doc(uid).get();
      if (!doc.exists) return null;
      return doc.data();
    } catch (err) {
      console.warn('Vendor status yüklənmədi:', err.message);
      return null;
    }
  },

  async register(uid, formData) {
    try {
      await fbDb.collection('vendors').doc(uid).set({
        ...formData,
        status:    'pending',
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  async update(uid, formData) {
    try {
      await fbDb.collection('vendors').doc(uid).update({
        ...formData,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  async getListings(uid) {
    try {
      const snap = await fbDb.collection('listings')
        .where('userId', '==', uid)
        .orderBy('createdAt', 'desc')
        .limit(50)
        .get();
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (err) {
      console.warn('Elanlar yüklənmədi:', err.message);
      return [];
    }
  },

  async getVendorOrders(uid) {
    try {
      const snap = await fbDb.collection('orders')
        .where('vendorId', '==', uid)
        .orderBy('createdAt', 'desc')
        .limit(50)
        .get();
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (err) {
      console.warn('Vendor sifarişlər yüklənmədi:', err.message);
      return [];
    }
  }
};

/* ═══════════════════════════════════════════
   ANA ROUTER
   ═══════════════════════════════════════════ */
async function loadVendorTab(uid) {
  const container = document.getElementById('tab-vendor');
  if (!container) return;
  container.innerHTML = `<div class="section-card"><div class="spinner" style="margin:2rem auto;"></div></div>`;

  const data = await vendor.getStatus(uid);

  if (!data) {
    renderVendorRegisterForm(container);
  } else if (data.status === 'pending') {
    renderVendorPending(container, data);
  } else if (data.status === 'rejected') {
    renderVendorRejected(container, data);
  } else if (data.status === 'approved') {
    await renderVendorDashboard(container, data, uid);
  }
}

/* ═══════════════════════════════════════════
   1. QEYDİYYAT FORMASI
   ═══════════════════════════════════════════ */
function renderVendorRegisterForm(container) {
  container.innerHTML = `
    <div class="section-card vendor-hero">
      <div class="vendor-hero-inner">
        <div class="vendor-hero-icon">🏪</div>
        <h2 class="vendor-hero-title">Satıcı ol</h2>
        <p class="vendor-hero-sub">Mağazanı MODA platformasında aç, milyonlara sat.</p>
        <div class="vendor-features">
          <div class="vendor-feature"><span>✓</span> Pulsuz mağaza açılışı</div>
          <div class="vendor-feature"><span>✓</span> Güvənli ödəniş sistemi</div>
          <div class="vendor-feature"><span>✓</span> Geniş müştəri bazası</div>
        </div>
      </div>
    </div>
    <div class="section-card">
      <div class="section-title">Mağaza məlumatları</div>
      <div class="form-grid">
        <div class="form-group">
          <label>Mağaza adı <span style="color:var(--danger)">*</span></label>
          <input type="text" id="v_storeName" placeholder="Məs: Elegance Boutique" maxlength="60" />
        </div>
        <div class="form-group">
          <label>Kateqoriya <span style="color:var(--danger)">*</span></label>
          <select id="v_category">
            <option value="">— Seçin —</option>
            <option>Qadın geyimi</option><option>Kişi geyimi</option>
            <option>Uşaq geyimi</option><option>Ayaqqabı</option>
            <option>Aksesuar</option><option>Çanta</option>
            <option>İdman geyimi</option><option>Digər</option>
          </select>
        </div>
        <div class="form-group">
          <label>Əlaqə nömrəsi <span style="color:var(--danger)">*</span></label>
          <input type="tel" id="v_phone" placeholder="+994 XX XXX XX XX" />
        </div>
        <div class="form-group">
          <label>Şirkət / Sahibkar adı <span style="color:var(--danger)">*</span></label>
          <input type="text" id="v_company" placeholder="Fərdi sahibkar və ya şirkət adı" />
        </div>
        <div class="form-group">
          <label>VÖEN (əgər varsa)</label>
          <input type="text" id="v_voen" placeholder="1234567890" maxlength="10" />
        </div>
        <div class="form-group">
          <label>Şəhər / Rayon <span style="color:var(--danger)">*</span></label>
          <select id="v_city">
            <option value="">— Seçin —</option>
            <option>Bakı</option><option>Sumqayıt</option>
            <option>Gəncə</option><option>Lənkəran</option>
            <option>Mingəçevir</option><option>Digər</option>
          </select>
        </div>
        <div class="form-group full">
          <label>Mağaza haqqında qısa məlumat <span style="color:var(--danger)">*</span></label>
          <textarea id="v_description" placeholder="Mağazanız, satdığınız məhsullar haqqında..." rows="3" maxlength="500"></textarea>
        </div>
        <div class="form-group full">
          <label style="display:flex;align-items:flex-start;gap:0.5rem;cursor:pointer;">
            <input type="checkbox" id="v_agree" style="width:auto;margin-top:2px;" />
            <span><a href="#" style="color:var(--accent);text-decoration:underline;">Satıcı şərtlərini</a> oxudum və qəbul edirəm.</span>
          </label>
        </div>
      </div>
      <div id="vendorFormError" style="display:none;background:#fff0f0;color:var(--danger);border:1px solid #fcc;border-radius:8px;padding:10px 14px;font-size:0.85rem;margin-bottom:1rem;"></div>
      <div class="btn-row">
        <button class="btn btn-dark" onclick="submitVendorForm()" id="vendorSubmitBtn">
          Qeydiyyatı tamamla və göndər
        </button>
      </div>
    </div>`;
}

/* ═══════════════════════════════════════════
   2. GÖZLƏMƏ
   ═══════════════════════════════════════════ */
function renderVendorPending(container, data) {
  const date = data.createdAt?.toDate
    ? data.createdAt.toDate().toLocaleDateString('az-AZ', { day:'numeric', month:'long', year:'numeric' })
    : '';
  container.innerHTML = `
    <div class="section-card" style="text-align:center;padding:3rem 2rem;">
      <div style="font-size:3rem;margin-bottom:1rem;">⏳</div>
      <h2 style="font-family:'Playfair Display',serif;font-size:1.4rem;margin-bottom:0.75rem;">Müraciətiniz baxılır</h2>
      <p style="color:var(--muted);font-size:0.9rem;max-width:420px;margin:0 auto 1.5rem;line-height:1.6;">
        <strong>${data.storeName}</strong> mağazası üçün sorğunuz <strong>${date}</strong> tarixində qəbul edilib.
      </p>
      <div class="vendor-status-badge pending"><span>●</span> Baxılır</div>
      <p style="color:var(--muted);font-size:0.78rem;margin-top:1.5rem;">
        Suallarınız üçün: <a href="mailto:support@moda.az" style="color:var(--accent)">support@moda.az</a>
      </p>
    </div>
    <div class="section-card">
      <div class="section-title">Göndərdiyiniz məlumatlar</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem;">
        ${vendorInfoRow('Mağaza adı', data.storeName)}
        ${vendorInfoRow('Kateqoriya', data.category)}
        ${vendorInfoRow('Telefon', data.phone)}
        ${vendorInfoRow('Şirkət', data.company)}
        ${vendorInfoRow('VÖEN', data.voen || '—')}
        ${vendorInfoRow('Şəhər', data.city)}
      </div>
    </div>`;
}

/* ═══════════════════════════════════════════
   3. RƏDDEDİLMƏ
   ═══════════════════════════════════════════ */
function renderVendorRejected(container, data) {
  container.innerHTML = `
    <div class="section-card" style="text-align:center;padding:3rem 2rem;">
      <div style="font-size:3rem;margin-bottom:1rem;">❌</div>
      <h2 style="font-family:'Playfair Display',serif;font-size:1.4rem;margin-bottom:0.75rem;color:var(--danger);">Müraciət rədd edildi</h2>
      <p style="color:var(--muted);font-size:0.9rem;max-width:420px;margin:0 auto 1.5rem;line-height:1.6;">
        ${data.rejectReason || 'Müraciətiniz tələblərə uyğun olmadığı üçün rədd edildi.'}
      </p>
      <div class="vendor-status-badge rejected"><span>●</span> Rədd edildi</div>
      <div style="margin-top:1.5rem;">
        <button class="btn btn-dark" onclick="reapplyVendor()">Yenidən müraciət et</button>
      </div>
    </div>`;
}

/* ═══════════════════════════════════════════
   4. DASHBOARD
   ═══════════════════════════════════════════ */

/* Status konfiqurasiyası — bir yerdə saxla */
const VD_STATUS = {
  pending:   { lbl: 'Gözlənilir', color: '#b7950b', bg: '#fef9e7' },
  shipped:   { lbl: 'Yolda',      color: '#1a6fa8', bg: '#eaf4fb' },
  delivered: { lbl: 'Çatdırıldı', color: '#1e8449', bg: '#eafaf1' },
  cancelled: { lbl: 'Ləğv edildi',color: '#922b21', bg: '#fdf2f0' },
};

/* Global vendor order cache (filter üçün) */
let _vdOrders   = [];
let _vdListings = [];

async function renderVendorDashboard(container, data, uid) {
  collapseSidebarForVendor();

  container.innerHTML = `
    <div class="section-card vd-header-card">
      <div class="vd-store-header">
        <div class="vd-store-avatar">${(data.storeName||'M')[0].toUpperCase()}</div>
        <div class="vd-store-info">
          <div style="display:flex;align-items:center;gap:0.75rem;flex-wrap:wrap;">
            <h2 class="vd-store-name">${data.storeName}</h2>
            <div class="vendor-status-badge approved"><span>●</span> Aktiv</div>
          </div>
          <p class="vd-store-meta">${data.category} · ${data.city}</p>
        </div>
        <button class="btn btn-outline vd-settings-btn" onclick="showToast('Mağaza parametrləri tezliklə')">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
          </svg>
          Parametrlər
        </button>
      </div>
    </div>

    <!-- Stat kartlar -->
    <div class="vd-stats-grid">
      <div class="vd-stat-card">
        <div class="vd-stat-icon" style="background:#eafaf1;color:#1e8449;">💰</div>
        <div><div class="vd-stat-num" id="vd-revenue">—</div><div class="vd-stat-lbl">Ümumi gəlir</div></div>
      </div>
      <div class="vd-stat-card">
        <div class="vd-stat-icon" style="background:#eaf4fb;color:#1a6fa8;">📦</div>
        <div><div class="vd-stat-num" id="vd-orders">—</div><div class="vd-stat-lbl">Ümumi sifariş</div></div>
      </div>
      <div class="vd-stat-card">
        <div class="vd-stat-icon" style="background:#f5f0ff;color:#6c3fc5;">🏷️</div>
        <div><div class="vd-stat-num" id="vd-listings">—</div><div class="vd-stat-lbl">Aktiv elan</div></div>
      </div>
      <div class="vd-stat-card">
        <div class="vd-stat-icon" style="background:#fef9e7;color:#b7950b;">⏳</div>
        <div><div class="vd-stat-num" id="vd-pending">—</div><div class="vd-stat-lbl">Gözləyən sifariş</div></div>
      </div>
    </div>

    <!-- Sifarişlər cədvəli -->
    <div class="section-card">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.25rem;padding-bottom:0.75rem;border-bottom:1px solid var(--border);">
        <span style="font-family:'Playfair Display',serif;font-size:1.1rem;font-weight:600;">Son sifarişlər</span>
        <select id="vdOrderFilter" onchange="vdFilterOrders()" style="font-size:0.78rem;padding:5px 10px;border:1px solid var(--border);border-radius:8px;background:var(--bg);color:var(--accent);font-family:inherit;">
          <option value="">Hamısı</option>
          <option value="pending">Gözlənilir</option>
          <option value="shipped">Yolda</option>
          <option value="delivered">Çatdırıldı</option>
          <option value="cancelled">Ləğv edildi</option>
        </select>
      </div>
      <div class="vd-table-wrap">
        <table class="vd-table">
          <thead>
            <tr>
              <th>Məhsul</th>
              <th>Sifariş №</th>
              <th>Tarix</th>
              <th>Məbləğ</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody id="vd-orders-tbody">
            <tr><td colspan="6" style="text-align:center;padding:1.5rem;"><div class="spinner" style="margin:0 auto;"></div></td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Son elanlar -->
    <div class="section-card">
      <div class="section-title" style="display:flex;align-items:center;justify-content:space-between;">
        <span>Son elanlar</span>
        <button class="btn btn-dark" style="padding:0.4rem 0.9rem;font-size:0.78rem;"
          onclick="switchTab('listings', document.querySelector('[data-tab=listings]'))">
          Bütün elanlar →
        </button>
      </div>
      <div class="vd-table-wrap">
        <table class="vd-table">
          <thead><tr><th>Məhsul adı</th><th>Kateqoriya</th><th>Qiymət</th><th>Stok</th></tr></thead>
          <tbody id="vd-listings-tbody">
            <tr><td colspan="4" style="text-align:center;padding:1.5rem;"><div class="spinner" style="margin:0 auto;"></div></td></tr>
          </tbody>
        </table>
      </div>
    </div>`;

  /* Məlumatları paralel yüklə */
  const [listings, orders] = await Promise.all([
    vendor.getListings(uid),
    vendor.getVendorOrders(uid)
  ]);

  _vdOrders   = orders;
  _vdListings = listings;

  /* Statistika */
  const totalRevenue   = orders.filter(o => o.status === 'delivered').reduce((s, o) => s + (o.total || 0), 0);
  const activeListings = listings.filter(l => l.status !== 'inactive').length;
  const pendingOrders  = orders.filter(o => o.status === 'pending').length;

  document.getElementById('vd-revenue').textContent  = totalRevenue.toFixed(2) + ' ₼';
  document.getElementById('vd-orders').textContent   = orders.length;
  document.getElementById('vd-listings').textContent = activeListings;
  document.getElementById('vd-pending').textContent  = pendingOrders;

  /* Cədvəlləri render et */
  vdRenderOrderRows(orders);
  vdRenderListingRows(listings);
}

/* ── Sifariş sətirləri ── */
function vdRenderOrderRows(orders) {
  const tbody = document.getElementById('vd-orders-tbody');
  if (!tbody) return;

  if (orders.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:2rem;color:var(--muted);">Hələ sifariş yoxdur</td></tr>`;
    return;
  }

  tbody.innerHTML = orders.map(o => {
    const st   = VD_STATUS[o.status] || { lbl: o.status || '—', color: '#888', bg: '#f5f5f5' };
    const date = o.createdAt?.toDate
      ? o.createdAt.toDate().toLocaleDateString('az-AZ', { day: '2-digit', month: '2-digit', year: 'numeric' })
      : '—';

    // Məhsul adları qısa
    const itemNames = (o.items || []).map(i => i.name).join(', ');
    const shortName = itemNames.length > 35 ? itemNames.substring(0, 35) + '…' : (itemNames || 'Sifariş');

    // orderNumber — cart.js tərəfindən yazılmış sahə
    const orderNum = o.orderNumber ? `#${o.orderNumber}` : `#${o.id.slice(-5).toUpperCase()}`;

    return `<tr>
      <td>
        <div style="font-weight:500;">${shortName}</div>
        <div style="font-size:0.72rem;color:var(--muted);margin-top:2px;">${(o.items||[]).length} məhsul</div>
      </td>
      <td><span style="font-family:monospace;font-weight:600;">${orderNum}</span></td>
      <td style="color:var(--muted);">${date}</td>
      <td style="font-weight:600;">${(o.total || 0).toFixed(2)} ₼</td>
      <td>
        <span style="background:${st.bg};color:${st.color};padding:0.2rem 0.7rem;border-radius:20px;font-size:0.75rem;font-weight:600;white-space:nowrap;">
          ${st.lbl}
        </span>
      </td>
      <td>
        <button onclick="vdOpenStatusModal('${o.id}', '${o.status || 'pending'}')"
          style="background:none;border:1px solid var(--border);border-radius:8px;padding:4px 10px;font-size:0.75rem;cursor:pointer;color:var(--accent);white-space:nowrap;font-family:inherit;">
          Status dəyiş
        </button>
      </td>
    </tr>`;
  }).join('');
}

/* ── Elan sətirləri ── */
function vdRenderListingRows(listings) {
  const tbody = document.getElementById('vd-listings-tbody');
  if (!tbody) return;

  if (listings.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;padding:2rem;color:var(--muted);">Hələ elan yoxdur</td></tr>`;
    return;
  }

  tbody.innerHTML = listings.slice(0, 6).map(l => {
    const stock = l.stock || l.quantity || 0;
    return `<tr>
      <td style="font-weight:500;">${l.title || l.name || '—'}</td>
      <td style="color:var(--muted);">${l.category || '—'}</td>
      <td style="font-weight:600;">${(l.price || 0).toFixed(2)} ₼</td>
      <td>
        <span style="background:${stock > 0 ? '#eafaf1' : '#fdf2f0'};color:${stock > 0 ? '#1e8449' : '#922b21'};padding:0.2rem 0.7rem;border-radius:20px;font-size:0.75rem;font-weight:600;">
          ${stock > 0 ? stock + ' ədəd' : 'Stok yoxdur'}
        </span>
      </td>
    </tr>`;
  }).join('');
}

/* ── Filter ── */
function vdFilterOrders() {
  const filter = document.getElementById('vdOrderFilter')?.value || '';
  const filtered = filter ? _vdOrders.filter(o => o.status === filter) : _vdOrders;
  vdRenderOrderRows(filtered);
}

/* ── Status dəyişdirmə modalı ── */
const STATUS_FLOW = [
  { key: 'pending',   icon: '⏳', label: 'Gözlənilir',  desc: 'Sifariş qəbul edilib, hazırlanır' },
  { key: 'shipped',   icon: '🚚', label: 'Yolda',        desc: 'Sifariş göndərildi, çatdırılır' },
  { key: 'delivered', icon: '✅', label: 'Çatdırıldı',   desc: 'Sifariş alıcıya çatdırıldı' },
];

function vdOpenStatusModal(orderId, currentStatus) {
  const old = document.getElementById('vdStatusModal');
  if (old) old.remove();

  const currentIdx = STATUS_FLOW.findIndex(s => s.key === currentStatus);

  const overlay = document.createElement('div');
  overlay.id = 'vdStatusModal';
  overlay.style.cssText = `
    position:fixed;inset:0;z-index:2000;
    display:flex;align-items:center;justify-content:center;
    background:rgba(0,0,0,0.45);
  `;

  overlay.innerHTML = `
    <div style="background:#fff;border-radius:16px;padding:28px;max-width:420px;width:90%;box-shadow:0 20px 60px rgba(0,0,0,0.15);position:relative;">
      <button onclick="document.getElementById('vdStatusModal').remove()"
        style="position:absolute;top:14px;right:16px;background:none;border:none;font-size:1.2rem;cursor:pointer;color:var(--muted)">✕</button>

      <h3 style="font-family:'Playfair Display',serif;margin-bottom:6px;">Sifariş statusu</h3>
      <p style="color:var(--muted);font-size:0.82rem;margin-bottom:24px;">Sifarişin cari mərhələsini seçin</p>

      <!-- Progress bar -->
      <div style="display:flex;align-items:center;margin-bottom:28px;">
        ${STATUS_FLOW.map((s, i) => `
          <div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:6px;">
            <div style="
              width:36px;height:36px;border-radius:50%;
              background:${i <= currentIdx ? '#1a1a1a' : '#e8e5e0'};
              color:${i <= currentIdx ? '#fff' : '#aaa'};
              display:flex;align-items:center;justify-content:center;font-size:${i < currentIdx ? '1rem' : '1rem'};
              transition:all 0.3s;">
              ${i < currentIdx ? '✓' : s.icon}
            </div>
            <div style="font-size:0.7rem;font-weight:${i === currentIdx ? '600' : '400'};color:${i <= currentIdx ? '#1a1a1a' : '#aaa'};text-align:center;">${s.label}</div>
          </div>
          ${i < STATUS_FLOW.length - 1 ? `
            <div style="flex:0 0 32px;height:2px;background:${i < currentIdx ? '#1a1a1a' : '#e8e5e0'};margin-bottom:22px;"></div>
          ` : ''}
        `).join('')}
      </div>

      <!-- Seçim düymələri -->
      <div style="display:flex;flex-direction:column;gap:10px;">
        ${STATUS_FLOW.map(s => `
          <button onclick="vdUpdateOrderStatus('${orderId}', '${s.key}')"
            style="
              display:flex;align-items:center;gap:12px;padding:12px 16px;
              border:2px solid ${s.key === currentStatus ? '#1a1a1a' : '#e8e5e0'};
              border-radius:12px;
              background:${s.key === currentStatus ? 'rgba(26,26,26,0.04)' : 'transparent'};
              cursor:${s.key === currentStatus ? 'default' : 'pointer'};
              text-align:left;width:100%;font-family:inherit;transition:all 0.2s;">
            <span style="font-size:1.2rem;">${s.icon}</span>
            <div style="flex:1;">
              <div style="font-weight:600;font-size:0.88rem;">${s.label}</div>
              <div style="font-size:0.75rem;color:var(--muted);">${s.desc}</div>
            </div>
            ${s.key === currentStatus ? `<span style="font-size:0.72rem;color:#aaa;font-weight:600;">Cari status</span>` : ''}
          </button>
        `).join('')}
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
}

/* ── Firestore-da statusu yenilə ── */
async function vdUpdateOrderStatus(orderId, newStatus) {
  try {
    await fbDb.collection('orders').doc(orderId).update({
      status:    newStatus,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    // Cache-i yenilə
    const idx = _vdOrders.findIndex(o => o.id === orderId);
    if (idx !== -1) _vdOrders[idx].status = newStatus;

    document.getElementById('vdStatusModal')?.remove();

    // Pending sayını yenilə
    const pendingEl = document.getElementById('vd-pending');
    if (pendingEl) pendingEl.textContent = _vdOrders.filter(o => o.status === 'pending').length;

    // Cəmi gəliri yenilə
    const revenueEl = document.getElementById('vd-revenue');
    if (revenueEl) {
      const rev = _vdOrders.filter(o => o.status === 'delivered').reduce((s, o) => s + (o.total || 0), 0);
      revenueEl.textContent = rev.toFixed(2) + ' ₼';
    }

    // Cədvəli yenilə
    vdFilterOrders();

    showToast('Status yeniləndi ✓');
  } catch (err) {
    showToast('Xəta: ' + err.message);
  }
}

/* ═══════════════════════════════════════════
   SIDEBAR COLLAPSE / EXPAND
   ═══════════════════════════════════════════ */
function collapseSidebarForVendor() {
  document.querySelector('.page')?.classList.add('vendor-mode');
  document.querySelector('.sidebar')?.classList.add('collapsed');
}

function expandSidebar() {
  document.querySelector('.page')?.classList.remove('vendor-mode');
  document.querySelector('.sidebar')?.classList.remove('collapsed');
}

/* ═══════════════════════════════════════════
   YARDIMÇI
   ═══════════════════════════════════════════ */
function vendorInfoRow(label, value) {
  return `
    <div style="background:var(--bg);border-radius:8px;padding:0.65rem 0.85rem;">
      <div style="font-size:0.72rem;color:var(--muted);margin-bottom:0.2rem;">${label}</div>
      <div style="font-size:0.875rem;font-weight:500;">${value || '—'}</div>
    </div>`;
}

async function submitVendorForm() {
  const btn     = document.getElementById('vendorSubmitBtn');
  const errorEl = document.getElementById('vendorFormError');

  const storeName   = document.getElementById('v_storeName').value.trim();
  const category    = document.getElementById('v_category').value;
  const phone       = document.getElementById('v_phone').value.trim();
  const company     = document.getElementById('v_company').value.trim();
  const voen        = document.getElementById('v_voen').value.trim();
  const city        = document.getElementById('v_city').value;
  const description = document.getElementById('v_description').value.trim();
  const agree       = document.getElementById('v_agree').checked;

  errorEl.style.display = 'none';
  if (!storeName)   { showVendorError('Mağaza adı daxil edin.');             return; }
  if (!category)    { showVendorError('Kateqoriya seçin.');                   return; }
  if (!phone)       { showVendorError('Telefon nömrəsi daxil edin.');         return; }
  if (!company)     { showVendorError('Şirkət / sahibkar adını daxil edin.'); return; }
  if (!city)        { showVendorError('Şəhər seçin.');                        return; }
  if (!description) { showVendorError('Mağaza haqqında məlumat yazın.');      return; }
  if (!agree)       { showVendorError('Satıcı şərtlərini qəbul edin.');       return; }

  btn.disabled = true; btn.textContent = 'Göndərilir...';

  const result = await vendor.register(currentUser.uid, {
    storeName, category, phone, company, voen, city, description,
    ownerEmail: currentUser.email, ownerName: currentUser.displayName || ''
  });

  if (result.success) {
    showToast('Müraciətiniz göndərildi! ✓');
    await loadVendorTab(currentUser.uid);
  } else {
    showVendorError('Xəta: ' + result.error);
    btn.disabled = false; btn.textContent = 'Qeydiyyatı tamamla və göndər';
  }
}

function showVendorError(msg) {
  const el = document.getElementById('vendorFormError');
  if (!el) return;
  el.textContent = msg; el.style.display = 'block';
  el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

async function reapplyVendor() {
  if (!currentUser) return;
  if (!confirm('Yenidən müraciət etmək istəyirsiniz?')) return;
  await fbDb.collection('vendors').doc(currentUser.uid).delete();
  await loadVendorTab(currentUser.uid);
}
