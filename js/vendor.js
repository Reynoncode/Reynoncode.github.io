/* ═══════════════════════════════════════════
   vendor.js — Satıcı Paneli
   Qeydiyyat, Status Yoxlama, Panel İdarəsi
   ═══════════════════════════════════════════ */

const vendor = {

  /* ── Satıcı statusunu Firestore-dan yoxla ── */
  async getStatus(uid) {
    try {
      const doc = await fbDb.collection('vendors').doc(uid).get();
      if (!doc.exists) return null;
      return doc.data(); // { status, storeName, ... }
    } catch (err) {
      console.warn('Vendor status yüklənmədi:', err.message);
      return null;
    }
  },

  /* ── Satıcı qeydiyyatı göndər ── */
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

  /* ── Satıcı məlumatlarını yenilə ── */
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
  }
};

/* ═══════════════════════════════════════════
   Satıcı Tab-ını render et
   profile.html-dəki switchTab() ilə işləyir
   ═══════════════════════════════════════════ */

async function loadVendorTab(uid) {
  const container = document.getElementById('tab-vendor');
  if (!container) return;

  // Yüklənir...
  container.innerHTML = `<div class="section-card"><div class="spinner" style="margin:2rem auto;"></div></div>`;

  const data = await vendor.getStatus(uid);

  if (!data) {
    // Hələ qeydiyyat yoxdur — forma göstər
    renderVendorRegisterForm(container);
  } else if (data.status === 'pending') {
    renderVendorPending(container, data);
  } else if (data.status === 'rejected') {
    renderVendorRejected(container, data);
  } else if (data.status === 'approved') {
    renderVendorDashboard(container, data);
  }
}

/* ─────────────────────────────────────────
   1. QEYDİYYAT FORMASI (status yoxdur)
   ───────────────────────────────────────── */
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
            <option>Qadın geyimi</option>
            <option>Kişi geyimi</option>
            <option>Uşaq geyimi</option>
            <option>Ayaqqabı</option>
            <option>Aksesuar</option>
            <option>Çanta</option>
            <option>İdman geyimi</option>
            <option>Digər</option>
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
            <option>Bakı</option>
            <option>Sumqayıt</option>
            <option>Gəncə</option>
            <option>Lənkəran</option>
            <option>Mingəçevir</option>
            <option>Digər</option>
          </select>
        </div>

        <div class="form-group full">
          <label>Mağaza haqqında qısa məlumat <span style="color:var(--danger)">*</span></label>
          <textarea id="v_description" placeholder="Mağazanız, satdığınız məhsullar haqqında qısa məlumat yazın..." rows="3" maxlength="500"></textarea>
        </div>

        <div class="form-group full">
          <label style="display:flex;align-items:flex-start;gap:0.5rem;cursor:pointer;">
            <input type="checkbox" id="v_agree" style="width:auto;margin-top:2px;" />
            <span>
              <a href="#" style="color:var(--accent);text-decoration:underline;">Satıcı şərtlərini</a> oxudum və qəbul edirəm.
            </span>
          </label>
        </div>

      </div>

      <div id="vendorFormError" style="display:none;background:#fff0f0;color:var(--danger);border:1px solid #fcc;border-radius:8px;padding:10px 14px;font-size:0.85rem;margin-bottom:1rem;"></div>

      <div class="btn-row">
        <button class="btn btn-dark" onclick="submitVendorForm()" id="vendorSubmitBtn">
          Qeydiyyatı tamamla və göndər
        </button>
      </div>
    </div>
  `;
}

/* ─────────────────────────────────────────
   2. GÖZLƏMƏ EKRANI (status: pending)
   ───────────────────────────────────────── */
function renderVendorPending(container, data) {
  const date = data.createdAt?.toDate
    ? data.createdAt.toDate().toLocaleDateString('az-AZ', { day: 'numeric', month: 'long', year: 'numeric' })
    : '';

  container.innerHTML = `
    <div class="section-card" style="text-align:center;padding:3rem 2rem;">
      <div style="font-size:3rem;margin-bottom:1rem;">⏳</div>
      <h2 style="font-family:'Playfair Display',serif;font-size:1.4rem;margin-bottom:0.75rem;">
        Müraciətiniz baxılır
      </h2>
      <p style="color:var(--muted);font-size:0.9rem;max-width:420px;margin:0 auto 1.5rem;line-height:1.6;">
        <strong>${data.storeName}</strong> mağazası üçün qeydiyyat sorğunuz <strong>${date}</strong> tarixində qəbul edilib. 
        Komandamız ən qısa zamanda nəticəni sizə bildirəcək.
      </p>
      <div class="vendor-status-badge pending">
        <span>●</span> Baxılır
      </div>
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
      ${data.description ? `<p style="margin-top:0.75rem;font-size:0.85rem;color:var(--muted);">${data.description}</p>` : ''}
    </div>
  `;
}

/* ─────────────────────────────────────────
   3. REDDEDİLMƏ EKRANI (status: rejected)
   ───────────────────────────────────────── */
function renderVendorRejected(container, data) {
  container.innerHTML = `
    <div class="section-card" style="text-align:center;padding:3rem 2rem;">
      <div style="font-size:3rem;margin-bottom:1rem;">❌</div>
      <h2 style="font-family:'Playfair Display',serif;font-size:1.4rem;margin-bottom:0.75rem;color:var(--danger);">
        Müraciət rədd edildi
      </h2>
      <p style="color:var(--muted);font-size:0.9rem;max-width:420px;margin:0 auto 1.5rem;line-height:1.6;">
        ${data.rejectReason || 'Müraciətiniz tələblərə uyğun olmadığı üçün rədd edildi.'}
      </p>
      <div class="vendor-status-badge rejected"><span>●</span> Rədd edildi</div>
      <div style="margin-top:1.5rem;">
        <button class="btn btn-dark" onclick="reapplyVendor()">Yenidən müraciət et</button>
      </div>
    </div>
  `;
}

/* ─────────────────────────────────────────
   4. SATICI PANELİ (status: approved)
   ───────────────────────────────────────── */
function renderVendorDashboard(container, data) {
  container.innerHTML = `
    <div class="section-card vendor-approved-header">
      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:1rem;">
        <div>
          <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:0.25rem;">
            <h2 style="font-family:'Playfair Display',serif;font-size:1.2rem;">${data.storeName}</h2>
            <div class="vendor-status-badge approved"><span>●</span> Aktiv</div>
          </div>
          <p style="color:var(--muted);font-size:0.82rem;">${data.category} · ${data.city}</p>
        </div>
        <button class="btn btn-outline" onclick="showToast('Mağaza parametrləri tezliklə')">
          ⚙️ Mağaza parametrləri
        </button>
      </div>
    </div>

    <div class="section-card">
      <div class="section-title">Satıcı paneli</div>
      <div style="text-align:center;padding:2rem 1rem;color:var(--muted);">
        <div style="font-size:2.5rem;margin-bottom:0.75rem;">🚀</div>
        <p style="font-size:0.9rem;max-width:360px;margin:0 auto;line-height:1.6;">
          Mağaza idarəetmə paneli hazırlanır. Tezliklə məhsul əlavə etmək, sifarişləri izləmək mümkün olacaq.
        </p>
      </div>
    </div>
  `;
}

/* ─────────────────────────────────────────
   YARDIMÇI FUNKSİYALAR
   ───────────────────────────────────────── */

function vendorInfoRow(label, value) {
  return `
    <div style="background:var(--bg);border-radius:8px;padding:0.65rem 0.85rem;">
      <div style="font-size:0.72rem;color:var(--muted);margin-bottom:0.2rem;">${label}</div>
      <div style="font-size:0.875rem;font-weight:500;">${value || '—'}</div>
    </div>`;
}

/* ─────────────────────────────────────────
   FORM GÖNDƏR
   ───────────────────────────────────────── */
async function submitVendorForm() {
  const btn      = document.getElementById('vendorSubmitBtn');
  const errorEl  = document.getElementById('vendorFormError');

  const storeName   = document.getElementById('v_storeName').value.trim();
  const category    = document.getElementById('v_category').value;
  const phone       = document.getElementById('v_phone').value.trim();
  const company     = document.getElementById('v_company').value.trim();
  const voen        = document.getElementById('v_voen').value.trim();
  const city        = document.getElementById('v_city').value;
  const description = document.getElementById('v_description').value.trim();
  const agree       = document.getElementById('v_agree').checked;

  errorEl.style.display = 'none';

  if (!storeName)   { showVendorError('Mağaza adı daxil edin.');         return; }
  if (!category)    { showVendorError('Kateqoriya seçin.');               return; }
  if (!phone)       { showVendorError('Telefon nömrəsi daxil edin.');     return; }
  if (!company)     { showVendorError('Şirkət / sahibkar adını daxil edin.'); return; }
  if (!city)        { showVendorError('Şəhər seçin.');                    return; }
  if (!description) { showVendorError('Mağaza haqqında məlumat yazın.');  return; }
  if (!agree)       { showVendorError('Satıcı şərtlərini qəbul edin.');   return; }

  btn.disabled    = true;
  btn.textContent = 'Göndərilir...';

  const result = await vendor.register(currentUser.uid, {
    storeName, category, phone, company, voen, city, description,
    ownerEmail: currentUser.email,
    ownerName:  currentUser.displayName || ''
  });

  if (result.success) {
    showToast('Müraciətiniz göndərildi! Tezliklə cavab veriləcək ✓');
    await loadVendorTab(currentUser.uid);
  } else {
    showVendorError('Xəta: ' + result.error);
    btn.disabled    = false;
    btn.textContent = 'Qeydiyyatı tamamla və göndər';
  }
}

function showVendorError(msg) {
  const el = document.getElementById('vendorFormError');
  if (!el) return;
  el.textContent   = msg;
  el.style.display = 'block';
  el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

/* Rədd edildikdən sonra yenidən müraciət üçün Firestore sənədini sil */
async function reapplyVendor() {
  if (!currentUser) return;
  if (!confirm('Yenidən müraciət etmək istəyirsiniz? Əvvəlki məlumatlar silinəcək.')) return;
  await fbDb.collection('vendors').doc(currentUser.uid).delete();
  await loadVendorTab(currentUser.uid);
}
