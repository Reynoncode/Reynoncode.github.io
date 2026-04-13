/* ═══════════════════════════════════════════
   vendor.js — Satıcı Paneli
   ═══════════════════════════════════════════ */

/* ══════════════════════════════
   MAĞAZA KATEQORİYALARI
══════════════════════════════ */
const STORE_CATEGORIES = [
  { id: 'elektronika', icon: '📱', label: 'Elektronika' },
  { id: 'geyim',       icon: '👗', label: 'Geyim və Moda' },
  { id: 'ev',          icon: '🏠', label: 'Ev və Yaşam' },
  { id: 'gozellik',    icon: '💄', label: 'Gözəllik və Baxım' },
  { id: 'saglamliq',   icon: '💊', label: 'Sağlamlıq və Vitaminlər' },
  { id: 'usaq',        icon: '🧸', label: 'Uşaq və Oyuncaqlar' },
  { id: 'avto',        icon: '🚗', label: 'Avto və Moto' },
  { id: 'idman',       icon: '⚽', label: 'İdman və Outdoor' },
  { id: 'kitab',       icon: '📚', label: 'Kitablar və Ofis' },
  { id: 'hediyye',     icon: '🎁', label: 'Hədiyyələr və Digər' },
];

function vsCatCheckboxHTML(selectedCats = []) {
  return STORE_CATEGORIES.map(c => {
    const sel = selectedCats.includes(c.id);
    return `
      <label class="cat-check-lbl${sel ? ' cat-check-sel' : ''}" data-id="${c.id}"
        style="display:flex;align-items:center;gap:.55rem;padding:.52rem .75rem;border:1.5px solid ${sel ? 'var(--accent)' : 'var(--border)'};border-radius:8px;cursor:pointer;transition:all .18s;background:${sel ? 'rgba(0,0,0,.03)' : 'transparent'};">
        <input type="checkbox" name="vsCategory" value="${c.id}" style="width:auto;accent-color:var(--accent);"
          onchange="vsCatToggle(this)" ${sel ? 'checked' : ''}>
        <span style="font-size:.82rem;">${c.icon} ${c.label}</span>
      </label>`;
  }).join('');
}

function vsCatToggle(checkbox) {
  const all     = document.querySelectorAll('input[name="vsCategory"]');
  const checked = document.querySelectorAll('input[name="vsCategory"]:checked');
  if (checked.length > 2) {
    checkbox.checked = false;
    if (typeof showToast === 'function') showToast('Maksimum 2 kateqoriya seçə bilərsiniz');
  }
  all.forEach(inp => {
    const lbl = inp.closest('.cat-check-lbl');
    if (!lbl) return;
    lbl.style.borderColor = inp.checked ? 'var(--accent)' : 'var(--border)';
    lbl.style.background  = inp.checked ? 'rgba(0,0,0,.03)' : 'transparent';
  });
}

/* ── Seçilmiş kateqoriyaları oxu (istənilən konteyner üçün) ── */
function getSelectedCategories(wrapId) {
  return Array.from(
    document.querySelectorAll(`#${wrapId} input[name="vsCategory"]:checked`)
  ).map(el => el.value);
}

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
    let allOrders = [];
    const seen = new Set();

    try {
      const snap1 = await fbDb.collection('orders')
        .where('vendorId', '==', uid)
        .orderBy('createdAt', 'desc')
        .get();
      snap1.docs.forEach(d => {
        if (!seen.has(d.id)) { seen.add(d.id); allOrders.push({ id: d.id, ...d.data() }); }
      });
    } catch(e) {}

    try {
      const snap2 = await fbDb.collection('orders')
        .where('sellerUid', '==', uid)
        .orderBy('createdAt', 'desc')
        .get();
      snap2.docs.forEach(d => {
        if (!seen.has(d.id)) { seen.add(d.id); allOrders.push({ id: d.id, ...d.data() }); }
      });
    } catch(e) {}

    try {
      if (allOrders.length === 0) {
        const snap3 = await fbDb.collection('orders')
          .orderBy('createdAt', 'desc')
          .limit(200)
          .get();
        snap3.docs.forEach(d => {
          if (seen.has(d.id)) return;
          const data  = d.data();
          const items = data.items || [];
          const belongs = items.some(item =>
            item.userId === uid || item.vendorId === uid || item.sellerId === uid
          );
          if (belongs) { seen.add(d.id); allOrders.push({ id: d.id, ...data }); }
        });
      }
    } catch(e) {}

    allOrders.sort((a, b) => {
      const ta = a.createdAt?.toDate?.() || new Date(0);
      const tb = b.createdAt?.toDate?.() || new Date(0);
      return tb - ta;
    });

    return allOrders;
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
          <label>Kateqoriya <span style="color:var(--danger)">*</span>
            <span style="font-weight:400;color:var(--muted);font-size:.78rem;"> — maksimum 2 seçin</span>
          </label>
          <div id="v_category_wrap" style="display:grid;grid-template-columns:1fr 1fr;gap:.45rem;margin-top:.35rem;">
            ${vsCatCheckboxHTML([])}
          </div>
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
  const catLabels = (data.categories || (data.category ? [data.category] : []))
    .map(id => {
      const found = STORE_CATEGORIES.find(c => c.id === id);
      return found ? `${found.icon} ${found.label}` : id;
    }).join(', ') || '—';

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
        ${vendorInfoRow('Kateqoriya', catLabels)}
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

const VD_STATUS = {
  pending:    { lbl: 'Gözlənilir', color: '#b7950b', bg: '#fef9e7' },
  processing: { lbl: 'Hazırlanır', color: '#6b21a8', bg: '#faf5ff' },
  shipped:    { lbl: 'Yolda',      color: '#1a6fa8', bg: '#eaf4fb' },
  delivered:  { lbl: 'Çatdırıldı', color: '#1e8449', bg: '#eafaf1' },
  cancelled:  { lbl: 'Ləğv edildi',color: '#922b21', bg: '#fdf2f0' },
};

let _vdOrders   = [];
let _vdListings = [];
let _vdUid      = null;

async function renderVendorDashboard(container, data, uid) {
  _vdUid = uid;
  collapseSidebarForVendor();

  /* Kateqoriya etiketlərini hazırla */
  const catArr = data.categories || (data.category ? [data.category] : []);
  const catLabels = catArr
    .map(id => {
      const found = STORE_CATEGORIES.find(c => c.id === id);
      return found ? `${found.icon} ${found.label}` : id;
    }).join(' · ') || data.category || '';

  /* Cover arxa plan stili */
  const coverStyle = data.coverURL
    ? `background: url('${data.coverURL}') center/cover no-repeat;`
    : `background: linear-gradient(135deg,#1a1a1a 0%,#2c2c2c 55%,#1a1a1a 100%);`;

  /* Logo HTML */
  const logoHTML = data.photoURL
    ? `<img src="${data.photoURL}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`
    : `<span style="font-size:1.6rem;font-weight:600;color:#fff;">${(data.storeName||'M')[0].toUpperCase()}</span>`;

  container.innerHTML = `

    <!-- ═══ HEADER KARTI ═══ -->
    <div style="background:var(--card);border:1px solid var(--border);border-radius:12px;overflow:hidden;margin-bottom:0;">

      <!-- Cover bölməsi -->
      <div style="position:relative;height:130px;${coverStyle}">
        <div style="position:absolute;inset:0;background:rgba(0,0,0,0.4);"></div>
        <!-- Parametrlər düyməsi cover üzərində -->
        <button onclick="openVendorSettings()"
          style="position:absolute;top:12px;right:12px;display:inline-flex;align-items:center;gap:6px;padding:6px 14px;border-radius:8px;border:1.5px solid rgba(255,255,255,0.5);background:rgba(255,255,255,0.12);color:#fff;font-size:0.8rem;font-weight:500;cursor:pointer;font-family:inherit;backdrop-filter:blur(4px);transition:background .2s;"
          onmouseover="this.style.background='rgba(255,255,255,0.22)'"
          onmouseout="this.style.background='rgba(255,255,255,0.12)'">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
          </svg>
          Parametrlər
        </button>
      </div>

      <!-- Mağaza məlumatları bölməsi -->
      <div style="padding:0 1.5rem 1.25rem;display:flex;align-items:flex-end;gap:1rem;margin-top:-32px;position:relative;z-index:2;">
        <!-- Avatar -->
        <div id="vdStoreAvatar"
          style="width:64px;height:64px;min-width:64px;border-radius:50%;overflow:hidden;background:linear-gradient(135deg,#2c2c2c,#1a1a1a);border:3px solid #fff;box-shadow:0 2px 10px rgba(0,0,0,0.18);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
          ${logoHTML}
        </div>
        <!-- Ad + kateqoriya + aktiv badge -->
        <div style="padding-bottom:0.25rem;min-width:0;flex:1;">
          <div style="display:flex;align-items:center;gap:0.6rem;flex-wrap:wrap;">
            <h2 id="vdStoreName"
              style="font-family:'Playfair Display',serif;font-size:1.15rem;font-weight:700;color:var(--accent);margin:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
              ${data.storeName}
            </h2>
            <div class="vendor-status-badge approved" style="flex-shrink:0;"><span>●</span> Aktiv</div>
          </div>
          <p id="vdStoreMeta"
            style="font-size:0.8rem;color:var(--muted);margin:0.2rem 0 0;">
            ${catLabels} · ${data.city}
          </p>
        </div>
      </div>
    </div>
    <!-- ═══════════════════ -->

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

    <div class="section-card" style="padding:1.5rem 1.75rem;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.25rem;padding-bottom:0.75rem;border-bottom:1px solid var(--border);">
        <span style="font-family:'Playfair Display',serif;font-size:1.1rem;font-weight:600;">Son sifarişlər</span>
        <select id="vdOrderFilter" onchange="vdFilterOrders()" style="font-size:0.78rem;padding:5px 10px;border:1px solid var(--border);border-radius:8px;background:var(--bg);color:var(--accent);font-family:inherit;">
          <option value="">Hamısı</option>
          <option value="pending">Gözlənilir</option>
          <option value="processing">Hazırlanır</option>
          <option value="shipped">Yolda</option>
          <option value="delivered">Çatdırıldı</option>
          <option value="cancelled">Ləğv edildi</option>
        </select>
      </div>
      <div id="vd-orders-list" style="max-height:420px;overflow-y:auto;padding-right:4px;">
        <div class="spinner" style="margin:1.5rem auto;"></div>
      </div>
    </div>

    <div class="section-card" style="padding:1.5rem 1.75rem;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.25rem;padding-bottom:0.75rem;border-bottom:1px solid var(--border);">
        <span style="font-family:'Playfair Display',serif;font-size:1.1rem;font-weight:600;">Son elanlar</span>
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

  const [listings, orders] = await Promise.all([
    vendor.getListings(uid),
    vendor.getVendorOrders(uid)
  ]);

  _vdOrders   = orders;
  _vdListings = listings;

  const totalRevenue   = orders.filter(o => o.status === 'delivered').reduce((s, o) => s + (o.total || 0), 0);
  const activeListings = listings.filter(l => l.status !== 'inactive').length;
  const pendingOrders  = orders.filter(o => o.status === 'pending').length;

  document.getElementById('vd-revenue').textContent  = totalRevenue.toFixed(2) + ' ₼';
  document.getElementById('vd-orders').textContent   = orders.length;
  document.getElementById('vd-listings').textContent = activeListings;
  document.getElementById('vd-pending').textContent  = pendingOrders;

  vdRenderOrderCards(orders);
  vdRenderListingRows(listings);
}

/* ══════════════════════════════════════════════════
   SİFARİŞ KARTLARI
══════════════════════════════════════════════════ */
function vdRenderOrderCards(orders) {
  const container = document.getElementById('vd-orders-list');
  if (!container) return;

  if (orders.length === 0) {
    container.innerHTML = `
      <div style="text-align:center;padding:2.5rem;color:var(--muted);">
        <div style="font-size:2rem;margin-bottom:0.5rem;">📭</div>
        Hələ sifariş yoxdur
      </div>`;
    return;
  }

  container.innerHTML = orders.map(o => vdOrderCardHTML(o)).join('');
}

function vdOrderCardHTML(o) {
  const st   = VD_STATUS[o.status] || { lbl: o.status || '—', color: '#888', bg: '#f5f5f5' };
  const date = o.createdAt?.toDate
    ? o.createdAt.toDate().toLocaleDateString('az-AZ', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : '—';

  const items    = o.items || [];
  const orderNum = o.orderNumber ? `#${o.orderNumber}` : `#${o.id.slice(-6).toUpperCase()}`;

  const buyerName  = o.buyerName  || o.userName  || o.customerName || '';
  const buyerPhone = o.buyerPhone || o.phone     || '';
  const buyerEmail = o.buyerEmail || '';

  const addrObj    = o.address || o.deliveryAddress || o.shippingAddress || '';
  const addressStr = typeof addrObj === 'object'
    ? (addrObj.label || [addrObj.city, addrObj.district, addrObj.street, addrObj.apartment].filter(Boolean).join(', '))
    : (addrObj || '');

  function itemChips(item) {
    const color    = item.selectedColor?.name || item.color    || '';
    const colorHex = item.selectedColor?.hex  || item.colorHex || '';
    const size     = item.selectedSize?.label || item.size     || '';
    const qty      = item.quantity || 1;

    const colorChip = color
      ? `<span style="display:inline-flex;align-items:center;gap:4px;background:#f5f0ff;color:#6b21a8;font-size:0.7rem;padding:2px 8px;border-radius:10px;">
          ${colorHex ? `<span style="width:9px;height:9px;border-radius:50%;background:${colorHex};border:1px solid rgba(0,0,0,.15);flex-shrink:0;display:inline-block;"></span>` : '🎨'} ${color}
         </span>`
      : '';
    const sizeChip = size
      ? `<span style="background:#f0f9ff;color:#1a4fb8;font-size:0.7rem;padding:2px 8px;border-radius:10px;">📐 ${size}</span>`
      : '';
    const qtyChip = qty > 1
      ? `<span style="background:#f0faf4;color:#1e8449;font-size:0.7rem;padding:2px 8px;border-radius:10px;">×${qty}</span>`
      : '';

    return (colorChip || sizeChip || qtyChip)
      ? `<div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:4px;">${colorChip}${sizeChip}${qtyChip}</div>`
      : '';
  }

  const itemsHTML = items.map(item => {
    const name  = item.name || item.title || '—';
    const price = ((item.price || 0) * (item.quantity || 1)).toFixed(2);
    return `
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;padding:6px 0;border-bottom:1px dashed var(--border);">
        <div style="flex:1;">
          <div style="font-size:0.82rem;font-weight:500;">${name}</div>
          ${itemChips(item)}
        </div>
        <div style="font-size:0.8rem;font-weight:600;white-space:nowrap;flex-shrink:0;">${price} ₼</div>
      </div>`;
  }).join('');

  return `
    <div style="border:1px solid var(--border);border-radius:12px;padding:1rem 1.25rem;margin-bottom:0.75rem;transition:box-shadow .2s;" onmouseover="this.style.boxShadow='0 4px 16px rgba(0,0,0,.07)'" onmouseout="this.style.boxShadow='none'">
      <div style="display:flex;align-items:center;gap:0.75rem;flex-wrap:wrap;margin-bottom:0.75rem;">
        <span style="font-family:monospace;font-weight:700;font-size:0.85rem;">${orderNum}</span>
        <span style="color:var(--muted);font-size:0.78rem;">${date}</span>
        <span style="flex:1;"></span>
        <span style="font-weight:700;font-size:0.9rem;">${(o.total||0).toFixed(2)} ₼</span>
        <span style="background:${st.bg};color:${st.color};padding:3px 10px;border-radius:20px;font-size:0.72rem;font-weight:600;">${st.lbl}</span>
        <button onclick="vdOpenStatusModal('${o.id}','${o.status||'pending'}')"
          style="background:none;border:1px solid var(--border);border-radius:8px;padding:4px 10px;font-size:0.75rem;cursor:pointer;color:var(--accent);white-space:nowrap;font-family:inherit;transition:border-color .15s;"
          onmouseover="this.style.borderColor='#1a1a1a'"
          onmouseout="this.style.borderColor='var(--border)'">
          Status dəyiş
        </button>
      </div>
      <div style="margin-bottom:0.85rem;">
        <div style="font-size:0.68rem;font-weight:600;color:var(--muted);letter-spacing:0.04em;text-transform:uppercase;margin-bottom:0.4rem;">
          📦 Məhsullar (${items.length})
        </div>
        ${itemsHTML || '<div style="font-size:0.78rem;color:var(--muted);">Məhsul məlumatı yoxdur</div>'}
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:0.75rem;padding-top:0.75rem;border-top:1px solid var(--border);">
        <div style="background:#f8f8f8;border-radius:8px;padding:0.65rem 0.85rem;">
          <div style="font-size:0.68rem;font-weight:600;color:var(--muted);letter-spacing:0.04em;text-transform:uppercase;margin-bottom:0.45rem;">👤 Müştəri</div>
          ${buyerName
            ? `<div style="font-size:0.8rem;font-weight:500;margin-bottom:2px;">${buyerName}</div>`
            : `<div style="font-size:0.78rem;color:var(--muted);">Ad məlumatı yoxdur</div>`}
          ${buyerPhone ? `<div style="font-size:0.76rem;color:#555;display:flex;align-items:center;gap:4px;margin-top:2px;">📞 ${buyerPhone}</div>` : ''}
          ${buyerEmail ? `<div style="font-size:0.72rem;color:var(--muted);margin-top:2px;">✉️ ${buyerEmail}</div>` : ''}
        </div>
        <div style="background:#f8f8f8;border-radius:8px;padding:0.65rem 0.85rem;">
          <div style="font-size:0.68rem;font-weight:600;color:var(--muted);letter-spacing:0.04em;text-transform:uppercase;margin-bottom:0.45rem;">📍 Çatdırılma ünvanı</div>
          ${addressStr
            ? `<div style="font-size:0.76rem;color:#555;line-height:1.5;">${addressStr}</div>`
            : `<div style="font-size:0.78rem;color:var(--muted);">Ünvan məlumatı yoxdur</div>`}
        </div>
      </div>
    </div>`;
}

function vdRenderListingRows(listings) {
  const tbody = document.getElementById('vd-listings-tbody');
  if (!tbody) return;

  if (listings.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;padding:2rem;color:var(--muted);">Hələ elan yoxdur</td></tr>`;
    return;
  }

  tbody.innerHTML = listings.slice(0, 6).map(l => {
    const totalStock = (l.sizes||[]).reduce((s,x) => s+(parseInt(x.stock)||0), 0) || l.stock || l.quantity || 0;
    return `<tr>
      <td style="font-weight:500;">${l.title||l.name||'—'}</td>
      <td style="color:var(--muted);">${l.category||'—'}</td>
      <td style="font-weight:600;">${(l.price||0).toFixed(2)} ₼</td>
      <td>
        <span style="background:${totalStock>0?'#eafaf1':'#fdf2f0'};color:${totalStock>0?'#1e8449':'#922b21'};padding:0.2rem 0.7rem;border-radius:20px;font-size:0.75rem;font-weight:600;">
          ${totalStock>0?totalStock+' ədəd':'Stok yoxdur'}
        </span>
      </td>
    </tr>`;
  }).join('');
}

function vdFilterOrders() {
  const filter   = document.getElementById('vdOrderFilter')?.value || '';
  const filtered = filter ? _vdOrders.filter(o => o.status === filter) : _vdOrders;
  vdRenderOrderCards(filtered);
}

/* ════════════════════════════════════════════════
   STATUS MODALI
════════════════════════════════════════════════ */
const STATUS_FLOW = [
  { key:'pending',    icon:'⏳', label:'Gözlənilir', desc:'Sifariş qəbul edilib, hazırlanır' },
  { key:'processing', icon:'📦', label:'Hazırlanır',  desc:'Sifariş yığılır və hazırlanır' },
  { key:'shipped',    icon:'🚚', label:'Yolda',       desc:'Sifariş göndərildi — stok avtomatik azalacaq' },
  { key:'delivered',  icon:'✅', label:'Çatdırıldı',  desc:'Sifariş alıcıya çatdırıldı' },
];

function vdOpenStatusModal(orderId, currentStatus) {
  const old = document.getElementById('vdStatusModal');
  if (old) old.remove();

  const currentIdx = STATUS_FLOW.findIndex(s => s.key === currentStatus);
  const overlay    = document.createElement('div');
  overlay.id       = 'vdStatusModal';
  overlay.style.cssText = `position:fixed;inset:0;z-index:2000;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.45);backdrop-filter:blur(4px);`;

  overlay.innerHTML = `
    <div style="background:#fff;border-radius:16px;padding:28px;max-width:420px;width:90%;box-shadow:0 20px 60px rgba(0,0,0,0.15);position:relative;">
      <button onclick="document.getElementById('vdStatusModal').remove()"
        style="position:absolute;top:14px;right:16px;background:none;border:none;font-size:1.2rem;cursor:pointer;color:var(--muted)">✕</button>
      <h3 style="font-family:'Playfair Display',serif;margin-bottom:6px;">Sifariş statusu</h3>
      <p style="color:var(--muted);font-size:0.82rem;margin-bottom:24px;">Sifarişin cari mərhələsini seçin</p>
      <div style="display:flex;align-items:center;margin-bottom:28px;">
        ${STATUS_FLOW.map((s,i) => `
          <div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:6px;">
            <div style="width:36px;height:36px;border-radius:50%;background:${i<=currentIdx?'#1a1a1a':'#e8e5e0'};color:${i<=currentIdx?'#fff':'#aaa'};display:flex;align-items:center;justify-content:center;font-size:1rem;">
              ${i<currentIdx?'✓':s.icon}
            </div>
            <div style="font-size:0.7rem;font-weight:${i===currentIdx?'600':'400'};color:${i<=currentIdx?'#1a1a1a':'#aaa'};text-align:center;">${s.label}</div>
          </div>
          ${i<STATUS_FLOW.length-1?`<div style="flex:0 0 32px;height:2px;background:${i<currentIdx?'#1a1a1a':'#e8e5e0'};margin-bottom:22px;"></div>`:''}
        `).join('')}
      </div>
      <div style="display:flex;flex-direction:column;gap:10px;margin-bottom:16px;">
        ${STATUS_FLOW.map(s => `
          <button onclick="vdUpdateOrderStatus('${orderId}','${s.key}')"
            style="display:flex;align-items:center;gap:12px;padding:12px 16px;border:2px solid ${s.key===currentStatus?'#1a1a1a':'#e8e5e0'};border-radius:12px;background:${s.key===currentStatus?'rgba(26,26,26,0.04)':'transparent'};cursor:${s.key===currentStatus?'default':'pointer'};text-align:left;width:100%;font-family:inherit;transition:border-color .2s;">
            <span style="font-size:1.2rem;">${s.icon}</span>
            <div style="flex:1;">
              <div style="font-weight:600;font-size:0.88rem;">${s.label}</div>
              <div style="font-size:0.75rem;color:var(--muted);">${s.desc}</div>
            </div>
            ${s.key===currentStatus?`<span style="font-size:0.72rem;color:#aaa;font-weight:600;">Cari status</span>`:''}
          </button>
        `).join('')}
        <button onclick="vdUpdateOrderStatus('${orderId}','cancelled')"
          style="padding:10px;border:1.5px solid #fecaca;border-radius:10px;background:#fef2f2;color:#dc2626;font-size:0.82rem;font-weight:500;cursor:pointer;font-family:inherit;">
          ❌ Sifarişi ləğv et
        </button>
      </div>
    </div>`;

  document.body.appendChild(overlay);
  overlay.addEventListener('click', e => { if (e.target===overlay) overlay.remove(); });
}

/* ════════════════════════════════════════════════
   STATUS YENİLƏ + STOK AZALT
════════════════════════════════════════════════ */
async function vdUpdateOrderStatus(orderId, newStatus) {
  try {
    const orderSnap = await fbDb.collection('orders').doc(orderId).get();
    if (!orderSnap.exists) throw new Error('Sifariş tapılmadı');

    const orderData     = orderSnap.data();
    const prevStatus    = orderData.status || 'pending';
    const stockDeducted = orderData.stockDeducted === true;

    if (prevStatus === newStatus) {
      document.getElementById('vdStatusModal')?.remove();
      return;
    }

    const updatePayload = {
      status:    newStatus,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    if (newStatus === 'shipped' && !stockDeducted) {
      await vdDecreaseStockForOrder(orderData);
      updatePayload.stockDeducted = true;
    }

    if (newStatus === 'cancelled' && stockDeducted) {
      await vdRestoreStockForOrder(orderData);
      updatePayload.stockDeducted = false;
    }

    await fbDb.collection('orders').doc(orderId).update(updatePayload);

    const idx = _vdOrders.findIndex(o => o.id === orderId);
    if (idx !== -1) {
      _vdOrders[idx].status        = newStatus;
      _vdOrders[idx].stockDeducted = updatePayload.stockDeducted ?? stockDeducted;
    }

    document.getElementById('vdStatusModal')?.remove();

    const pendingEl = document.getElementById('vd-pending');
    if (pendingEl) pendingEl.textContent = _vdOrders.filter(o => o.status === 'pending').length;

    const revenueEl = document.getElementById('vd-revenue');
    if (revenueEl) {
      const rev = _vdOrders.filter(o => o.status === 'delivered').reduce((s, o) => s + (o.total || 0), 0);
      revenueEl.textContent = rev.toFixed(2) + ' ₼';
    }

    vdFilterOrders();

    const freshListings = await vendor.getListings(_vdUid);
    _vdListings = freshListings;
    vdRenderListingRows(freshListings);

    showToast('Status yeniləndi ✓');
  } catch (err) {
    showToast('Xəta: ' + err.message);
    console.error('vdUpdateOrderStatus xətası:', err);
  }
}

async function vdDecreaseStockForOrder(orderData) {
  const items = orderData.items || [];
  if (items.length === 0) return;

  const listingIds = [...new Set(items.map(i => i.id).filter(Boolean))];

  for (const listingId of listingIds) {
    try {
      const listingRef  = fbDb.collection('listings').doc(listingId);
      const listingSnap = await listingRef.get();
      if (!listingSnap.exists) continue;

      const listingData = listingSnap.data();
      const sizes       = listingData.sizes || [];
      const orderedItems = items.filter(i => i.id === listingId);

      let updated = false;
      const newSizes = sizes.map(sizeEntry => {
        const match = orderedItems.find(oi => {
          const orderedSize = oi.selectedSize?.label || oi.size || null;
          return orderedSize === sizeEntry.label;
        });
        if (match) {
          const qty      = match.quantity || 1;
          const newStock = Math.max(0, (parseInt(sizeEntry.stock) || 0) - qty);
          updated = true;
          return { ...sizeEntry, stock: newStock };
        }
        return sizeEntry;
      });

      if (!updated) {
        const noSizeItems = orderedItems.filter(oi => !(oi.selectedSize?.label || oi.size));
        if (noSizeItems.length > 0) {
          const totalQty     = noSizeItems.reduce((s, i) => s + (i.quantity || 1), 0);
          const currentStock = parseInt(listingData.stock || listingData.quantity || 0);
          await listingRef.update({
            stock:     Math.max(0, currentStock - totalQty),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
          });
          continue;
        }
      }

      if (updated) {
        await listingRef.update({
          sizes:     newSizes,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      }
    } catch (e) {
      console.warn(`Listing ${listingId} stoku azaldılmadı:`, e.message);
    }
  }
}

async function vdRestoreStockForOrder(orderData) {
  const items = orderData.items || [];
  if (items.length === 0) return;

  const listingIds = [...new Set(items.map(i => i.id).filter(Boolean))];

  for (const listingId of listingIds) {
    try {
      const listingRef  = fbDb.collection('listings').doc(listingId);
      const listingSnap = await listingRef.get();
      if (!listingSnap.exists) continue;

      const listingData  = listingSnap.data();
      const sizes        = listingData.sizes || [];
      const orderedItems = items.filter(i => i.id === listingId);

      let updated  = false;
      const newSizes = sizes.map(sizeEntry => {
        const match = orderedItems.find(oi => {
          const orderedSize = oi.selectedSize?.label || oi.size || null;
          return orderedSize === sizeEntry.label;
        });
        if (match) {
          const qty      = match.quantity || 1;
          const newStock = (parseInt(sizeEntry.stock) || 0) + qty;
          updated = true;
          return { ...sizeEntry, stock: newStock };
        }
        return sizeEntry;
      });

      if (!updated) {
        const noSizeItems = orderedItems.filter(oi => !(oi.selectedSize?.label || oi.size));
        if (noSizeItems.length > 0) {
          const totalQty     = noSizeItems.reduce((s, i) => s + (i.quantity || 1), 0);
          const currentStock = parseInt(listingData.stock || listingData.quantity || 0);
          await listingRef.update({
            stock:     currentStock + totalQty,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
          });
          continue;
        }
      }

      if (updated) {
        await listingRef.update({
          sizes:     newSizes,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      }
    } catch (e) {
      console.warn(`Listing ${listingId} stoku bərpa edilmədi:`, e.message);
    }
  }
}

/* ═══════════════════════════════════════════
   MAĞAZA PARAMETRLƏRİ MODALI
   ═══════════════════════════════════════════ */
async function openVendorSettings() {
  const old = document.getElementById('vendorSettingsModal');
  if (old) old.remove();

  const uid = fbAuth.currentUser?.uid || _vdUid;
  if (!uid) return;

  const [vSnap, uSnap] = await Promise.all([
    fbDb.collection('vendors').doc(uid).get(),
    fbDb.collection('users').doc(uid).get()
  ]);
  const v = vSnap.exists ? vSnap.data() : {};
  const u = uSnap.exists ? uSnap.data() : {};

  /* Mövcud kateqoriyaları oxu — köhnə string və ya yeni array */
  const savedCats = v.categories || (v.category ? [v.category] : []);

  const overlay = document.createElement('div');
  overlay.id    = 'vendorSettingsModal';
  overlay.style.cssText = `position:fixed;inset:0;z-index:3000;background:rgba(15,10,5,.6);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;padding:1rem;opacity:0;transition:opacity .3s;`;

  overlay.innerHTML = `
    <div id="vsPanel" style="background:#fff;border-radius:20px;width:100%;max-width:660px;max-height:90vh;overflow-y:auto;box-shadow:0 24px 80px rgba(0,0,0,.2);transform:translateY(32px) scale(.97);transition:transform .35s cubic-bezier(.34,1.56,.64,1);">

      <div style="display:flex;align-items:center;justify-content:space-between;padding:1.5rem 1.75rem 0;">
        <div>
          <h3 style="font-family:'Playfair Display',serif;font-size:1.2rem;font-weight:600;margin-bottom:.2rem">Mağaza Parametrləri</h3>
          <p style="font-size:.78rem;color:var(--muted)">Mağaza məlumatlarınızı burada idarə edin</p>
        </div>
        <button onclick="closeVendorSettings()" style="width:34px;height:34px;border-radius:50%;border:1px solid var(--border);background:var(--bg,#faf9f7);cursor:pointer;color:var(--muted);display:flex;align-items:center;justify-content:center;font-size:1rem;">✕</button>
      </div>

      <div style="display:flex;border-bottom:1px solid var(--border);margin:1.25rem 1.75rem 0;padding:0;">
        ${[['vs-tab-general','Ümumi'],['vs-tab-brand','Brend'],['vs-tab-social','Sosial Media'],['vs-tab-address','Ünvan']]
          .map((t,i) => `<button id="${t[0]}-btn" onclick="vsShowTab('${t[0]}')" style="padding:.65rem 1.1rem;border:none;background:none;cursor:pointer;font-size:.82rem;font-weight:600;font-family:inherit;color:${i===0?'var(--text)':'var(--muted)'};border-bottom:${i===0?'2px solid var(--accent)':'2px solid transparent'};margin-bottom:-1px;transition:all .2s;">${t[1]}</button>`).join('')}
      </div>

      <div style="padding:1.5rem 1.75rem 1.75rem;">

        <!-- TAB: Ümumi -->
        <div id="vs-tab-general" class="vs-tab">
          <div style="margin-bottom:1.5rem;">
            <div style="font-size:.78rem;font-weight:600;color:var(--accent);margin-bottom:.5rem;">Arxa plan (Cover) Şəkli</div>
            <div id="vsCoverWrap" onclick="document.getElementById('vsCoverInput').click()" style="width:100%;height:130px;border-radius:12px;overflow:hidden;background:linear-gradient(135deg,#1a1a1a,#2c2c2c);border:2px dashed var(--border);position:relative;cursor:pointer;">
              ${v.coverURL?`<img src="${v.coverURL}" style="width:100%;height:100%;object-fit:cover">`:''}
              <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:.4rem;color:rgba(255,255,255,.75);font-size:.78rem;background:${v.coverURL?'rgba(0,0,0,.35)':'transparent'};">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                <span>${v.coverURL?'Dəyiş':'Cover şəkli əlavə et'}</span>
                <span style="font-size:.68rem;opacity:.7">1200×400 px tövsiyə edilir</span>
              </div>
            </div>
            <input type="file" id="vsCoverInput" accept="image/*" style="display:none" onchange="vsHandleCover(this.files[0])">
            ${v.coverURL?`<button onclick="vsRemoveCover()" style="margin-top:.4rem;padding:.28rem .7rem;border:1px solid #fecaca;background:#fef2f2;color:#dc2626;border-radius:7px;font-size:.72rem;cursor:pointer;font-family:inherit;">Cover şəklini sil</button>`:''}
          </div>

          <div style="display:grid;grid-template-columns:auto 1fr;gap:1.25rem;margin-bottom:1rem;align-items:start;">
            <div style="display:flex;flex-direction:column;align-items:center;gap:.4rem;">
              <div style="font-size:.74rem;font-weight:500;color:#555;">Logo</div>
              <div id="vsLogoWrap" onclick="document.getElementById('vsLogoInput').click()" style="width:72px;height:72px;border-radius:50%;overflow:hidden;position:relative;background:linear-gradient(135deg,#2c2c2c,#1a1a1a);color:#fff;display:flex;align-items:center;justify-content:center;font-family:'Playfair Display',serif;font-size:1.3rem;font-weight:600;border:2.5px solid var(--border);cursor:pointer;">
                ${v.photoURL?`<img src="${v.photoURL}" style="width:100%;height:100%;object-fit:cover;">`:`<span>${vsGetInitials(v.storeName||u.displayName||'')}</span>`}
                <div style="position:absolute;inset:0;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity .2s;color:#fff;font-size:.62rem;text-align:center;border-radius:50%;" onmouseover="this.style.opacity=1" onmouseout="this.style.opacity=0">📷<br>Dəyiş</div>
              </div>
              <input type="file" id="vsLogoInput" accept="image/*" style="display:none" onchange="vsHandleLogo(this.files[0])">
            </div>
            <div style="display:flex;flex-direction:column;gap:.7rem;">
              <div>
                <label style="${vsLabelStyle()}">Mağaza adı <span style="color:var(--danger)">*</span></label>
                <input type="text" id="vsStoreName" value="${v.storeName||u.storeName||''}" placeholder="Mağazanızın adı" style="${vsInputStyle()}">
              </div>
            </div>
          </div>

          <!-- KATEQORİYA — checkbox grid -->
          <div style="margin-bottom:1rem;">
            <label style="${vsLabelStyle()}">Kateqoriya
              <span style="font-weight:400;color:var(--muted);"> — maksimum 2 seçin</span>
            </label>
            <div id="vsCategoryWrap" style="display:grid;grid-template-columns:1fr 1fr;gap:.45rem;margin-top:.4rem;">
              ${vsCatCheckboxHTML(savedCats)}
            </div>
          </div>

          <div style="margin-bottom:.75rem;">
            <label style="${vsLabelStyle()}">Mağaza haqqında</label>
            <textarea id="vsDesc" rows="3" placeholder="Mağazanız haqqında qısa məlumat..." style="${vsInputStyle()}resize:vertical;">${v.desc||v.description||''}</textarea>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:.75rem;margin-bottom:.75rem;">
            <div>
              <label style="${vsLabelStyle()}">Telefon</label>
              <input type="tel" id="vsPhone" value="${v.phone||u.phone||''}" placeholder="+994 XX XXX XX XX" style="${vsInputStyle()}">
            </div>
            <div>
              <label style="${vsLabelStyle()}">İctimai e-poçt</label>
              <input type="email" id="vsPublicEmail" value="${v.publicEmail||''}" placeholder="magaza@mail.com" style="${vsInputStyle()}">
            </div>
          </div>
          <div>
            <label style="${vsLabelStyle()}">Pulsuz çatdırılma həddi (₼)</label>
            <input type="number" id="vsFreeShipping" value="${v.freeShippingThreshold||50}" min="0" step="1" style="${vsInputStyle()}width:160px;">
            <div style="font-size:.7rem;color:var(--muted);margin-top:.25rem;">Bu məbləğdən yuxarı sifarişlərə pulsuz çatdırılma</div>
          </div>
        </div>

        <!-- TAB: Brend -->
        <div id="vs-tab-brand" class="vs-tab" style="display:none;">
          <div style="display:flex;flex-direction:column;gap:.85rem;">
            <div><label style="${vsLabelStyle()}">Brend / Marka adı</label><input type="text" id="vsBrand" value="${v.brand||''}" placeholder="Məs: ZARA, H&M..." style="${vsInputStyle()}"></div>
            <div><label style="${vsLabelStyle()}">Veb sayt</label><input type="url" id="vsWebsite" value="${v.website||''}" placeholder="https://saytiniz.com" style="${vsInputStyle()}"></div>
            <div>
              <label style="${vsLabelStyle()}">Çatdırılma müddəti</label>
              <select id="vsDelivery" style="${vsInputStyle()}">
                ${[['1-2','1-2 iş günü'],['2-3','2-3 iş günü'],['3-5','3-5 iş günü'],['5-7','5-7 iş günü'],['7+','7+ iş günü']]
                  .map(([val,lbl]) => `<option value="${val}" ${(v.deliveryDays||'2-3')===val?'selected':''}>${lbl}</option>`).join('')}
              </select>
            </div>
            <div><label style="${vsLabelStyle()}">Qaytarma siyasəti</label><textarea id="vsReturnPolicy" rows="3" placeholder="Məs: 14 gün ərzində qaytarma..." style="${vsInputStyle()}resize:vertical;">${v.returnPolicy||''}</textarea></div>
          </div>
        </div>

        <!-- TAB: Sosial Media -->
        <div id="vs-tab-social" class="vs-tab" style="display:none;">
          <p style="font-size:.78rem;color:var(--muted);margin-bottom:1.25rem;line-height:1.6;">Sosial media hesablarınızı əlavə edin. Mağaza səhifəsində görünəcək.</p>
          ${[
            {id:'vsInstagram',icon:`<svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><defs><radialGradient id="ig1" cx="30%" cy="107%" r="150%"><stop offset="0%" stop-color="#fdf497"/><stop offset="5%" stop-color="#fdf497"/><stop offset="45%" stop-color="#fd5949"/><stop offset="60%" stop-color="#d6249f"/><stop offset="90%" stop-color="#285AEB"/></radialGradient></defs><rect x="2" y="2" width="20" height="20" rx="5" fill="url(#ig1)"/><circle cx="12" cy="12" r="4" stroke="white" stroke-width="1.8" fill="none"/><circle cx="17.5" cy="6.5" r="1.2" fill="white"/></svg>`,lbl:'Instagram',ph:'@hesabiniz',        val:v.instagram||''},
            {id:'vsTiktok',   icon:`<svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="24" height="24" rx="6" fill="#010101"/><path d="M16.6 8.4a4.6 4.6 0 01-2.8-.9v6.1a4.1 4.1 0 11-4.1-4.1h.4v2.1h-.4a2 2 0 102 2V5h2.1a4.6 4.6 0 002.8 3.4z" fill="white"/><path d="M16.6 8.4a4.6 4.6 0 002.4.7V7a2.6 2.6 0 01-2.4-1.3v2.7z" fill="#69C9D0"/><path d="M9.7 13.6a2 2 0 100 4 2 2 0 000-4z" fill="#EE1D52"/><path d="M16.6 8.4V5.7a4.6 4.6 0 002.4 1.3v2.1a4.6 4.6 0 01-2.4-.7zM13.8 7.5v6.1a4.1 4.1 0 01-4.1 4.1 4.1 4.1 0 01-4.1-4.1 4.1 4.1 0 014.1-4.1h.4v2.1h-.4a2 2 0 102 2V5h2.1v2.5z" fill="white"/></svg>`,lbl:'TikTok',   ph:'@hesabiniz',        val:v.tiktok||''},
            {id:'vsFacebook', icon:`<svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="24" height="24" rx="6" fill="#1877F2"/><path d="M16 12h-2.5v7H11v-7H9v-2.5h2V8c0-1.7 1-2.5 2.5-2.5h2V8h-1.5c-.6 0-.5.3-.5.7V9.5H16L15.5 12z" fill="white"/></svg>`,lbl:'Facebook',  ph:'facebook.com/...',  val:v.facebook||''},
            {id:'vsYoutube',  icon:`<svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="24" height="24" rx="6" fill="#FF0000"/><path d="M19.6 8.2a2 2 0 00-1.4-1.4C16.8 6.5 12 6.5 12 6.5s-4.8 0-6.2.3A2 2 0 004.4 8.2 20 20 0 004 12a20 20 0 00.4 3.8 2 2 0 001.4 1.4c1.4.3 6.2.3 6.2.3s4.8 0 6.2-.3a2 2 0 001.4-1.4A20 20 0 0020 12a20 20 0 00-.4-3.8z" fill="white"/><polygon points="10,15 15,12 10,9" fill="#FF0000"/></svg>`,lbl:'YouTube',  ph:'youtube.com/...',   val:v.youtube||''},
            {id:'vsWhatsapp', icon:`<svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="24" height="24" rx="6" fill="#25D366"/><path d="M12 4a8 8 0 00-6.9 12L4 20l4.1-1.1A8 8 0 1012 4zm0 14.5a6.4 6.4 0 01-3.3-.9l-.2-.1-2.4.6.7-2.3-.2-.2a6.5 6.5 0 1111.4-6.5 6.5 6.5 0 01-6 9.4zm3.5-4.8c-.2-.1-1.1-.5-1.3-.6-.2-.1-.3-.1-.4.1-.1.2-.5.6-.6.7-.1.1-.2.1-.4 0-.2-.1-.8-.3-1.5-.9-.6-.5-.9-1.1-1-1.3-.1-.2 0-.3.1-.4l.3-.3.2-.3v-.3l-.6-1.5c-.1-.4-.3-.3-.4-.3h-.4c-.1 0-.3.1-.5.2-.2.2-.7.7-.7 1.6s.7 1.9.8 2c.1.1 1.4 2.2 3.5 3 .5.2.9.3 1.2.4.5.1 1 .1 1.3.1.4-.1 1.2-.5 1.3-1 .1-.5.1-.9.1-1 0-.1-.2-.2-.4-.2z" fill="white"/></svg>`,lbl:'WhatsApp',  ph:'+994 XX XXX XX XX',val:v.whatsapp||''},
          ].map(s=>`
            <div style="display:flex;align-items:center;gap:.75rem;margin-bottom:.75rem;">
              <div style="width:36px;height:36px;border-radius:10px;overflow:hidden;display:flex;align-items:center;justify-content:center;flex-shrink:0;">${s.icon}</div>
              <div style="flex:1;"><div style="font-size:.72rem;font-weight:500;color:#555;margin-bottom:.2rem">${s.lbl}</div><input type="text" id="${s.id}" value="${s.val}" placeholder="${s.ph}" style="${vsInputStyle()}margin:0;"></div>
            </div>
          `).join('')}
        </div>

        <!-- TAB: Ünvan -->
        <div id="vs-tab-address" class="vs-tab" style="display:none;">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:.75rem;margin-bottom:.75rem;">
            <div>
              <label style="${vsLabelStyle()}">Şəhər</label>
              <select id="vsCity" style="${vsInputStyle()}">
                ${['Bakı','Gəncə','Sumqayıt','Lənkəran','Mingəçevir','Naxçıvan','Şirvan','Şəki','Digər']
                  .map(c=>`<option value="${c}" ${(v.city||u.city||'Bakı')===c?'selected':''}>${c}</option>`).join('')}
              </select>
            </div>
            <div><label style="${vsLabelStyle()}">Rayon / Qəsəbə</label><input type="text" id="vsDistrict" value="${v.district||''}" placeholder="Məs: Nərimanov..." style="${vsInputStyle()}"></div>
          </div>
          <div style="margin-bottom:.75rem;"><label style="${vsLabelStyle()}">Küçə / Ünvan</label><input type="text" id="vsStreet" value="${v.street||''}" placeholder="Küçə adı, bina nömrəsi..." style="${vsInputStyle()}"></div>
          <div style="margin-bottom:.75rem;"><label style="${vsLabelStyle()}">İş saatları</label><input type="text" id="vsWorkHours" value="${v.workHours||''}" placeholder="Məs: B.e–C. 09:00–18:00" style="${vsInputStyle()}"></div>
          <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:10px;padding:.75rem 1rem;font-size:.78rem;color:#0369a1;">📍 Ünvan yalnız mağaza səhifəsinin əlaqə bölümündə görünür.</div>
        </div>

        <div style="display:flex;gap:.75rem;margin-top:1.5rem;padding-top:1.25rem;border-top:1px solid var(--border);">
          <button onclick="closeVendorSettings()" style="flex:1;padding:.75rem;border-radius:10px;border:1.5px solid var(--border);background:none;font-size:.875rem;font-weight:500;cursor:pointer;font-family:inherit;">Ləğv et</button>
          <button onclick="saveVendorSettings()" id="vsSaveBtn" style="flex:2;padding:.75rem;border-radius:10px;background:#1a1a1a;color:#fff;border:none;font-size:.9rem;font-weight:600;cursor:pointer;font-family:inherit;">💾 Yadda saxla</button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
  setTimeout(() => {
    overlay.style.opacity = '1';
    document.getElementById('vsPanel').style.transform = 'translateY(0) scale(1)';
  }, 10);
  overlay.addEventListener('click', e => { if (e.target===overlay) closeVendorSettings(); });

  window._vsCoverBase64 = null;
  window._vsLogoBase64  = null;
}

function vsShowTab(tabId) {
  document.querySelectorAll('.vs-tab').forEach(t => t.style.display='none');
  const el = document.getElementById(tabId);
  if (el) el.style.display = 'block';
  ['vs-tab-general','vs-tab-brand','vs-tab-social','vs-tab-address'].forEach(t => {
    const btn = document.getElementById(t+'-btn');
    if (!btn) return;
    const active = t===tabId;
    btn.style.color        = active?'var(--text)':'var(--muted)';
    btn.style.borderBottom = active?'2px solid var(--accent)':'2px solid transparent';
  });
}

function vsHandleCover(file) {
  if (!file||!file.type.startsWith('image/')) return;
  const reader = new FileReader();
  reader.onload = e => {
    window._vsCoverBase64 = e.target.result;
    const wrap = document.getElementById('vsCoverWrap');
    if (wrap) {
      wrap.innerHTML = `<img src="${e.target.result}" style="width:100%;height:100%;object-fit:cover"><div style="position:absolute;inset:0;background:rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;color:#fff;font-size:.78rem;">📷 Dəyiş</div>`;
      wrap.onclick = () => document.getElementById('vsCoverInput').click();
    }
  };
  reader.readAsDataURL(file);
}

function vsRemoveCover() {
  window._vsCoverBase64 = '__remove__';
  const wrap = document.getElementById('vsCoverWrap');
  if (wrap) {
    wrap.innerHTML = `<div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:.4rem;color:rgba(255,255,255,.75);font-size:.78rem;"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>Cover şəkli əlavə et</div>`;
    wrap.onclick = () => document.getElementById('vsCoverInput').click();
  }
}

function vsHandleLogo(file) {
  if (!file||!file.type.startsWith('image/')) return;
  const reader = new FileReader();
  reader.onload = e => {
    window._vsLogoBase64 = e.target.result;
    const wrap = document.getElementById('vsLogoWrap');
    if (wrap) {
      wrap.innerHTML = `<img src="${e.target.result}" style="width:100%;height:100%;object-fit:cover;border-radius:50%"><div style="position:absolute;inset:0;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;color:#fff;font-size:.62rem;text-align:center;border-radius:50%;opacity:0;transition:opacity .2s" onmouseover="this.style.opacity=1" onmouseout="this.style.opacity=0">📷<br>Dəyiş</div>`;
      wrap.onclick = () => document.getElementById('vsLogoInput').click();
    }
  };
  reader.readAsDataURL(file);
}

async function saveVendorSettings() {
  const btn = document.getElementById('vsSaveBtn');
  if (!btn) return;
  btn.disabled = true; btn.textContent = 'Saxlanılır...';

  const uid = fbAuth.currentUser?.uid || _vdUid;
  if (!uid) return;

  try {
    /* Seçilmiş kateqoriyaları oxu */
    const categories = getSelectedCategories('vsCategoryWrap');

    const payload = {
      storeName:             document.getElementById('vsStoreName')?.value.trim()    ||'',
      categories,
      category:              categories[0] || '',
      desc:                  document.getElementById('vsDesc')?.value.trim()         ||'',
      phone:                 document.getElementById('vsPhone')?.value.trim()        ||'',
      publicEmail:           document.getElementById('vsPublicEmail')?.value.trim()  ||'',
      freeShippingThreshold: parseFloat(document.getElementById('vsFreeShipping')?.value)||50,
      brand:                 document.getElementById('vsBrand')?.value.trim()        ||'',
      website:               document.getElementById('vsWebsite')?.value.trim()      ||'',
      deliveryDays:          document.getElementById('vsDelivery')?.value            ||'2-3',
      returnPolicy:          document.getElementById('vsReturnPolicy')?.value.trim() ||'',
      instagram:             document.getElementById('vsInstagram')?.value.trim()    ||'',
      tiktok:                document.getElementById('vsTiktok')?.value.trim()       ||'',
      facebook:              document.getElementById('vsFacebook')?.value.trim()     ||'',
      youtube:               document.getElementById('vsYoutube')?.value.trim()      ||'',
      whatsapp:              document.getElementById('vsWhatsapp')?.value.trim()     ||'',
      city:                  document.getElementById('vsCity')?.value                ||'',
      district:              document.getElementById('vsDistrict')?.value.trim()     ||'',
      street:                document.getElementById('vsStreet')?.value.trim()       ||'',
      workHours:             document.getElementById('vsWorkHours')?.value.trim()    ||'',
      updatedAt:             firebase.firestore.FieldValue.serverTimestamp(),
    };

    if (window._vsLogoBase64)                 payload.photoURL = window._vsLogoBase64;
    if (window._vsCoverBase64==='__remove__') payload.coverURL = '';
    else if (window._vsCoverBase64)           payload.coverURL = window._vsCoverBase64;

    await Promise.all([
      fbDb.collection('vendors').doc(uid).set(payload, { merge: true }),
      fbDb.collection('users').doc(uid).set({
        storeName: payload.storeName, phone: payload.phone, city: payload.city,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      }, { merge: true })
    ]);

    /* Dashboard header-i canlı yenilə */
    const nameEl   = document.getElementById('vdStoreName');
    const metaEl   = document.getElementById('vdStoreMeta');
    const avatarEl = document.getElementById('vdStoreAvatar');
    if (nameEl) nameEl.textContent = payload.storeName;
    if (metaEl) {
      const catLabels = categories
        .map(id => {
          const found = STORE_CATEGORIES.find(c => c.id === id);
          return found ? `${found.icon} ${found.label}` : id;
        }).join(' · ') || '';
      metaEl.textContent = `${catLabels} · ${payload.city}`;
    }
    if (avatarEl && window._vsLogoBase64) {
      avatarEl.innerHTML = `<img src="${window._vsLogoBase64}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`;
    }

    /* Cover-i dashboard-da canlı yenilə */
    const coverDiv = document.querySelector('#tab-vendor > div:first-child > div:first-child');
    if (coverDiv) {
      if (payload.coverURL) {
        coverDiv.style.background = `url('${payload.coverURL}') center/cover no-repeat`;
      } else if (window._vsCoverBase64 === '__remove__') {
        coverDiv.style.background = 'linear-gradient(135deg,#1a1a1a 0%,#2c2c2c 55%,#1a1a1a 100%)';
      }
    }

    showToast('Parametrlər saxlanıldı ✓');
    closeVendorSettings();
  } catch (err) {
    showToast('Xəta: ' + err.message);
    btn.disabled = false; btn.textContent = '💾 Yadda saxla';
  }
}

function closeVendorSettings() {
  const overlay = document.getElementById('vendorSettingsModal');
  if (!overlay) return;
  overlay.style.opacity = '0';
  const panel = document.getElementById('vsPanel');
  if (panel) panel.style.transform = 'translateY(32px) scale(.97)';
  setTimeout(() => overlay.remove(), 300);
}

/* ═══════════════════════════════════════════
   SIDEBAR
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
  return `<div style="background:var(--bg);border-radius:8px;padding:0.65rem 0.85rem;"><div style="font-size:0.72rem;color:var(--muted);margin-bottom:0.2rem;">${label}</div><div style="font-size:0.875rem;font-weight:500;">${value||'—'}</div></div>`;
}

function vsGetInitials(name) {
  return (name||'').split(' ').map(w=>w[0]||'').join('').substring(0,2).toUpperCase()||'?';
}

function vsInputStyle() {
  return `display:block;width:100%;padding:.58rem .82rem;border:1.5px solid var(--border);border-radius:8px;font-family:'DM Sans',sans-serif;font-size:.875rem;color:var(--text);background:var(--bg,#faf9f7);outline:none;transition:border-color .2s;box-sizing:border-box;`;
}

function vsLabelStyle() {
  return `font-size:.76rem;font-weight:500;color:#555;display:block;margin-bottom:.3rem;`;
}

async function submitVendorForm() {
  const btn     = document.getElementById('vendorSubmitBtn');
  const errorEl = document.getElementById('vendorFormError');

  const storeName   = document.getElementById('v_storeName').value.trim();
  const categories  = getSelectedCategories('v_category_wrap');
  const phone       = document.getElementById('v_phone').value.trim();
  const company     = document.getElementById('v_company').value.trim();
  const voen        = document.getElementById('v_voen').value.trim();
  const city        = document.getElementById('v_city').value;
  const description = document.getElementById('v_description').value.trim();
  const agree       = document.getElementById('v_agree').checked;

  errorEl.style.display = 'none';
  if (!storeName)        { showVendorError('Mağaza adı daxil edin.');             return; }
  if (!categories.length){ showVendorError('Ən azı 1 kateqoriya seçin.');         return; }
  if (!phone)            { showVendorError('Telefon nömrəsi daxil edin.');         return; }
  if (!company)          { showVendorError('Şirkət / sahibkar adını daxil edin.'); return; }
  if (!city)             { showVendorError('Şəhər seçin.');                        return; }
  if (!description)      { showVendorError('Mağaza haqqında məlumat yazın.');      return; }
  if (!agree)            { showVendorError('Satıcı şərtlərini qəbul edin.');       return; }

  btn.disabled = true; btn.textContent = 'Göndərilir...';

  const result = await vendor.register(currentUser.uid, {
    storeName,
    categories,
    category:   categories[0] || '',
    phone,
    company,
    voen,
    city,
    description,
    ownerEmail: currentUser.email,
    ownerName:  currentUser.displayName || ''
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
  el.scrollIntoView({ behavior:'smooth', block:'nearest' });
}

async function reapplyVendor() {
  if (!currentUser) return;
  if (!confirm('Yenidən müraciət etmək istəyirsiniz?')) return;
  await fbDb.collection('vendors').doc(currentUser.uid).delete();
  await loadVendorTab(currentUser.uid);
}
