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
        .limit(30)
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
async function renderVendorDashboard(container, data, uid) {
  collapseSidebarForVendor();

  container.innerHTML = `
    <!-- Mağaza başlığı -->
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

    <!-- 4 Stat kart -->
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

    <!-- Son sifarişlər -->
    <div class="section-card">
      <div class="section-title">Son sifarişlər</div>
      <div class="vd-table-wrap">
        <table class="vd-table">
          <thead><tr><th>Məhsul</th><th>Sifariş №</th><th>Tarix</th><th>Məbləğ</th><th>Status</th></tr></thead>
          <tbody id="vd-orders-tbody">
            <tr><td colspan="5" style="text-align:center;padding:1.5rem;"><div class="spinner" style="margin:0 auto;"></div></td></tr>
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

  /* Məlumatları yüklə */
  const [listings, orders] = await Promise.all([
    vendor.getListings(uid),
    vendor.getVendorOrders(uid)
  ]);

  /* Stats */
  const totalRevenue   = orders.reduce((s, o) => s + (o.total || 0), 0);
  const activeListings = listings.filter(l => l.status !== 'inactive').length;
  const pendingOrders  = orders.filter(o => o.status === 'pending').length;

  document.getElementById('vd-revenue').textContent  = totalRevenue.toFixed(2) + ' ₼';
  document.getElementById('vd-orders').textContent   = orders.length;
  document.getElementById('vd-listings').textContent = activeListings;
  document.getElementById('vd-pending').textContent  = pendingOrders;

  /* Sifarişlər cədvəli */
  const statusMap = {
    delivered: { lbl:'Çatdırıldı', color:'#1e8449', bg:'#eafaf1' },
    shipped:   { lbl:'Yolda',      color:'#1a6fa8', bg:'#eaf4fb' },
    pending:   { lbl:'Gözləyir',   color:'#b7950b', bg:'#fef9e7' },
    cancelled: { lbl:'Ləğv edildi',color:'#922b21', bg:'#fdf2f0' },
  };

  const tbody = document.getElementById('vd-orders-tbody');
  if (orders.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:2rem;color:var(--muted);">Hələ sifariş yoxdur</td></tr>`;
  } else {
    tbody.innerHTML = orders.map(o => {
      const st   = statusMap[o.status] || { lbl: o.status||'—', color:'#888', bg:'#f5f5f5' };
      const date = o.createdAt?.toDate
        ? o.createdAt.toDate().toLocaleDateString('az-AZ', { day:'2-digit', month:'2-digit', year:'numeric' })
        : '—';
      return `<tr>
        <td style="font-weight:500;">${o.title||'Sifariş'}</td>
        <td style="color:var(--muted);font-size:0.82rem;">#${o.id.slice(-5).toUpperCase()}</td>
        <td>${date}</td>
        <td style="font-weight:600;">${(o.total||0).toFixed(2)} ₼</td>
        <td><span style="background:${st.bg};color:${st.color};padding:0.2rem 0.7rem;border-radius:20px;font-size:0.75rem;font-weight:600;">${st.lbl}</span></td>
      </tr>`;
    }).join('');
  }

  /* Elanlar cədvəli */
  const lbody = document.getElementById('vd-listings-tbody');
  if (listings.length === 0) {
    lbody.innerHTML = `<tr><td colspan="4" style="text-align:center;padding:2rem;color:var(--muted);">Hələ elan yoxdur</td></tr>`;
  } else {
    lbody.innerHTML = listings.slice(0, 6).map(l => `<tr>
      <td style="font-weight:500;">${l.title||l.name||'—'}</td>
      <td style="color:var(--muted);">${l.category||'—'}</td>
      <td style="font-weight:600;">${(l.price||0).toFixed(2)} ₼</td>
      <td><span style="background:${(l.stock||0)>0?'#eafaf1':'#fdf2f0'};color:${(l.stock||0)>0?'#1e8449':'#922b21'};padding:0.2rem 0.7rem;border-radius:20px;font-size:0.75rem;font-weight:600;">
        ${(l.stock||0)>0 ? l.stock+' ədəd' : 'Stok yoxdur'}
      </span></td>
    </tr>`).join('');
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
      <div style="font-size:0.875rem;font-weight:500;">${value||'—'}</div>
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
  el.scrollIntoView({ behavior:'smooth', block:'nearest' });
}

async function reapplyVendor() {
  if (!currentUser) return;
  if (!confirm('Yenidən müraciət etmək istəyirsiniz?')) return;
  await fbDb.collection('vendors').doc(currentUser.uid).delete();
  await loadVendorTab(currentUser.uid);
}
