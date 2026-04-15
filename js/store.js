/* ═══════════════════════════════════════════════
   store.js — Mağaza səhifəsi məntiqi
   store.html-ə əlavə et: <script src="js/store.js"></script>
   ═══════════════════════════════════════════════ */

let storeUid      = null;
let storeData     = {};
let storeListings = [];
let isFollowing   = false;

// ── YENİ: Kateqoriya filter state ──
let _storePlatformCats = []; // admin/platformSettings-dən oxunur
let _storeActiveMainCat = null; // seçili ana kateqoriya id-si (null = hamısı)
let _storeActiveSubCat  = null; // seçili alt kateqoriya adı (null = hamısı)

/* ══════════════════════════════════════════
   ANA YÜKLƏMƏ
══════════════════════════════════════════ */
async function loadStorePage() {
  const params = new URLSearchParams(window.location.search);
  storeUid = params.get('uid');

  if (!storeUid) {
    document.getElementById('storePageContent').innerHTML =
      `<p style="text-align:center;color:var(--muted);padding:6rem 0;font-size:.9rem;">Mağaza tapılmadı.</p>`;
    return;
  }

  try {
    const cu = fbAuth.currentUser;

    // ── YENİ: Platform kateqoriyalarını yüklə ──
    try {
      const settSnap = await fbDb.collection('admin').doc('platformSettings').get();
      if (settSnap.exists) {
        const d = settSnap.data();
        _storePlatformCats = d.mainCategories || d.categories || [];
      }
    } catch(e) {
      _storePlatformCats = [];
    }

    const [vSnap, uSnap] = await Promise.all([
      fbDb.collection('vendors').doc(storeUid).get(),
      fbDb.collection('users').doc(storeUid).get()
    ]);

    const v = vSnap.exists ? vSnap.data() : {};
    const u = uSnap.exists ? uSnap.data() : {};
    const fullName = ((u.firstName || '') + ' ' + (u.lastName || '')).trim();

    storeData = {
      uid:          storeUid,
      storeName:    v.storeName  || u.storeName  || fullName || 'Mağaza',
      photoURL:     v.photoURL   || u.photoURL   || '',
      coverURL:     v.coverURL   || '',
      desc:         v.desc       || v.description || u.desc || '',
      email:        u.email      || '',
      phone:        v.phone      || u.phone       || '',
      publicEmail:  v.publicEmail || '',
      category:     v.category   || '',
      city:         v.city       || u.city        || '',
      district:     v.district   || '',
      street:       v.street     || '',
      workHours:    v.workHours  || '',
      brand:        v.brand      || '',
      website:      v.website    || '',
      deliveryDays: v.deliveryDays || '',
      freeShippingThreshold: v.freeShippingThreshold ?? 50,
      instagram:    v.instagram  || '',
      tiktok:       v.tiktok     || '',
      facebook:     v.facebook   || '',
      youtube:      v.youtube    || '',
      whatsapp:     v.whatsapp   || '',
      createdAt:    v.createdAt  || u.createdAt   || null,
      followerCount: 0,
    };

    const [listSnap, followSnap] = await Promise.all([
      fbDb.collection('listings').where('userId', '==', storeUid).orderBy('createdAt', 'desc').get(),
      fbDb.collection('follows').where('storeId', '==', storeUid).get()
    ]);

    storeListings = listSnap.docs.map(d => ({ id: d.id, ...d.data(), _fromFirebase: true }));
    storeData.followerCount = followSnap.size;

    if (cu) {
      const myFollow = await fbDb.collection('follows').doc(`${cu.uid}_${storeUid}`).get();
      isFollowing = myFollow.exists;
    }

    renderStorePage();

  } catch (err) {
    document.getElementById('storePageContent').innerHTML =
      `<p style="color:var(--danger);text-align:center;padding:4rem 0;font-size:.875rem;">Xəta: ${err.message}</p>`;
  }
}

/* ══════════════════════════════════════════
   YENİ: Kateqoriya filter köməkçiləri
══════════════════════════════════════════ */

// Bu mağazanın elanlarında hansı kateqoriyalar var?
function _getStoreCatsUsed() {
  const usedIds = new Set(storeListings.map(l => l.mainCategory || l.category).filter(Boolean));
  return _storePlatformCats.filter(c => usedIds.has(c.id));
}

// Seçili ana kateqoriyaya görə alt kateqoriyaları tap
function _getSubCatsForActive() {
  if (!_storeActiveMainCat) return [];
  const cat = _storePlatformCats.find(c => c.id === _storeActiveMainCat);
  if (!cat || !cat.subCats) return [];
  // Yalnız bu mağazada mövcud olan alt kateqoriyaları göstər
  const usedSubs = new Set(
    storeListings
      .filter(l => (l.mainCategory || l.category) === _storeActiveMainCat)
      .map(l => l.subCategory)
      .filter(Boolean)
  );
  return cat.subCats.filter(s => usedSubs.has(s));
}

// Aktiv filterlərə görə elanları filtrele
function _getFilteredListings() {
  return storeListings.filter(l => {
    const catMatch = !_storeActiveMainCat ||
      (l.mainCategory || l.category) === _storeActiveMainCat;
    const subMatch = !_storeActiveSubCat ||
      l.subCategory === _storeActiveSubCat;
    return catMatch && subMatch;
  });
}

// Ana kateqoriya seçildi
function storeSetMainCat(id) {
  if (_storeActiveMainCat === id) {
    // Eyni kateqoriyaya klik = sıfırla
    _storeActiveMainCat = null;
    _storeActiveSubCat  = null;
  } else {
    _storeActiveMainCat = id;
    _storeActiveSubCat  = null;
  }
  _renderStoreCatFilter();
  _renderStoreProducts();
}

// Alt kateqoriya seçildi
function storeSetSubCat(name) {
  _storeActiveSubCat = (_storeActiveSubCat === name) ? null : name;
  _renderStoreCatFilter();
  _renderStoreProducts();
}

/* ══════════════════════════════════════════
   YENİ: Kateqoriya filter UI render
══════════════════════════════════════════ */
function _renderStoreCatFilter() {
  const wrap = document.getElementById('storeCatFilter');
  if (!wrap) return;

  const usedCats = _getStoreCatsUsed();
  const subCats  = _getSubCatsForActive();
  const filtered = _getFilteredListings();

  // Hamısı düyməsi
  let html = `
    <div class="scf-main-row">
      <button class="scf-chip ${!_storeActiveMainCat ? 'scf-chip--active' : ''}"
              onclick="storeSetMainCat(null)">
        Hamısı
        <span class="scf-count">${storeListings.length}</span>
      </button>`;

  usedCats.forEach(cat => {
    const count = storeListings.filter(l => (l.mainCategory || l.category) === cat.id).length;
    const isActive = _storeActiveMainCat === cat.id;
    html += `
      <button class="scf-chip ${isActive ? 'scf-chip--active' : ''}"
              onclick="storeSetMainCat('${cat.id}')">
        ${cat.icon ? `<span class="scf-icon">${cat.icon}</span>` : ''}
        ${cat.label}
        <span class="scf-count">${count}</span>
      </button>`;
  });

  html += `</div>`;

  // Alt kateqoriyalar (yalnız ana seçilibsə)
  if (subCats.length > 0) {
    html += `<div class="scf-sub-row">`;
    subCats.forEach(sub => {
      const count = storeListings.filter(l =>
        (l.mainCategory || l.category) === _storeActiveMainCat && l.subCategory === sub
      ).length;
      const isActive = _storeActiveSubCat === sub;
      html += `
        <button class="scf-chip scf-chip--sub ${isActive ? 'scf-chip--active' : ''}"
                onclick="storeSetSubCat('${sub}')">
          ${sub}
          <span class="scf-count">${count}</span>
        </button>`;
    });
    html += `</div>`;
  }

  wrap.innerHTML = html;

  // Məhsul sayını yenilə
  const countEl = document.getElementById('storeProductCount');
  if (countEl) countEl.textContent = `${filtered.length} məhsul`;
}

/* ══════════════════════════════════════════
   YENİ: Məhsulları filtrə görə render et
══════════════════════════════════════════ */
function _renderStoreProducts() {
  const grid = document.getElementById('storeProductGrid');
  if (!grid) return;

  const filtered = _getFilteredListings();

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div class="store-empty" style="grid-column:1/-1;">
        <div style="font-size:2.5rem;margin-bottom:.75rem;">🔍</div>
        <p>Bu kateqoriyada məhsul yoxdur</p>
      </div>`;
    return;
  }

  if (typeof renderProducts === 'function') {
    renderProducts(filtered, 'storeProductGrid');
  }
}

/* ══════════════════════════════════════════
   RENDER — müştəri görünüşü
══════════════════════════════════════════ */
function renderStorePage() {
  const s = storeData;

  const initials = s.storeName.split(' ').map(w => w[0] || '').join('').substring(0, 2).toUpperCase();
  const logoHTML = s.photoURL
    ? `<img src="${s.photoURL}" alt="${s.storeName}"/>`
    : initials;

  const joinYear = s.createdAt?.toDate ? s.createdAt.toDate().getFullYear() : null;

  const catTag = s.category
    ? `<span style="display:inline-block;background:rgba(255,255,255,0.12);color:rgba(255,255,255,0.7);font-size:0.7rem;padding:2px 10px;border-radius:20px;margin-left:0.75rem;letter-spacing:0.04em;vertical-align:middle;">${s.category}</span>`
    : '';

  const coverStyle = s.coverURL
    ? `background:url('${s.coverURL}') center/cover no-repeat;`
    : `background:linear-gradient(135deg,#1a1a1a 0%,#2c2c2c 55%,#1a1a1a 100%);`;

  const coverOverlay = s.coverURL
    ? `<div style="position:absolute;inset:0;background:rgba(0,0,0,.45);border-radius:var(--radius-xl);"></div>`
    : '';

  const socialLinks = [
    { key: 'instagram', icon: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg>`, label: 'Instagram', prefix: 'https://instagram.com/' },
    { key: 'tiktok',    icon: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 12a4 4 0 100 8 4 4 0 000-8z"/><path d="M15 2s1 0 2 2 2 2 3 2v4s-1 0-3-1-3-3-3-3v8"/></svg>`, label: 'TikTok',    prefix: 'https://tiktok.com/@' },
    { key: 'facebook',  icon: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z"/></svg>`, label: 'Facebook',  prefix: 'https://' },
    { key: 'youtube',   icon: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22.54 6.42a2.78 2.78 0 00-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46A2.78 2.78 0 001.46 6.42 29 29 0 001 12a29 29 0 00.46 5.58 2.78 2.78 0 001.95 1.96C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 001.95-1.96A29 29 0 0023 12a29 29 0 00-.46-5.58z"/><polygon fill="currentColor" stroke="none" points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02"/></svg>`, label: 'YouTube',   prefix: 'https://' },
    { key: 'whatsapp',  icon: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/></svg>`, label: 'WhatsApp',  prefix: 'https://wa.me/' },
  ].filter(soc => s[soc.key]);

  const hasSocial  = socialLinks.length > 0;
  const hasContact = s.phone || s.publicEmail || s.email || s.website;
  const hasAddress = s.city || s.district || s.street;

  const deliveryText = s.deliveryDays ? `${s.deliveryDays} iş günü ərzində çatdırılma.` : '2–4 iş günü ərzində çatdırılma.';
  const freeShipText = `${s.freeShippingThreshold} AZN üzərindəki sifarişlərə pulsuz çatdırılma.`;

  // ── YENİ: filter-i yalnız birdən çox kateqoriya varsa göstər
  const usedCats = _getStoreCatsUsed();
  const showFilter = usedCats.length > 0;

  document.getElementById('storePageContent').innerHTML = `

    <!-- HERO -->
    <div class="store-hero" style="${coverStyle}">
      ${coverOverlay}
      <div class="store-hero-inner">
        <div class="store-logo">${logoHTML}</div>
        <div class="store-hero-info">
          <div class="store-hero-name">${s.storeName}${catTag}</div>
          ${s.desc
            ? `<div class="store-hero-desc">${s.desc}</div>`
            : '<div style="margin-bottom:1.1rem;"></div>'}
          <div class="store-hero-stats">
            <div class="store-stat"><span id="followerCount">${s.followerCount}</span><small>İzləyici</small></div>
            <div class="store-stat"><span>${storeListings.length}</span><small>Məhsul</small></div>
            ${joinYear ? `<div class="store-stat"><span>${joinYear}</span><small>İldən bəri</small></div>` : ''}
          </div>
        </div>
        <button class="store-follow-btn ${isFollowing ? 'following' : ''}" id="storeFollowBtn" onclick="toggleFollow()">
          ${followBtnHTML(isFollowing)}
        </button>
      </div>
    </div>

    <!-- ── YENİ: KATEQORİYA FİLTER PANEL ── -->
    ${showFilter ? `
    <div id="storeCatFilter" class="store-cat-filter"></div>
    ` : ''}

    <!-- CONTENT GRID -->
    <div class="store-content-grid">

      <!-- Sol: məhsullar -->
      <div>
        <div class="store-products-header">
          <h2 class="store-products-title">Məhsullar</h2>
          <span class="section-count" id="storeProductCount">${storeListings.length} məhsul</span>
        </div>
        ${storeListings.length > 0
          ? `<div class="product-grid" id="storeProductGrid"></div>`
          : `<div class="store-empty">
               <div style="font-size:3rem;margin-bottom:1rem;">🏷️</div>
               <p>Bu mağazada hələ məhsul yoxdur</p>
             </div>`
        }
      </div>

      <!-- Sağ: sidebar -->
      <div class="store-side-col">

        <!-- Haqqımızda -->
        ${s.desc ? `
        <div class="store-side-card">
          <div class="store-side-title">Haqqımızda</div>
          <p class="store-side-text">${s.desc}</p>
          ${s.brand ? `
          <div class="store-contact-row" style="margin-top:10px;">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
            <span style="font-size:0.8rem;">${s.brand}</span>
          </div>` : ''}
        </div>` : ''}

        <!-- Kampaniya -->
        <div class="store-side-card campaign-card">
          <div class="store-side-title">Kampaniya</div>
          <div class="campaign-badge">Aktiv deyil</div>
          <div class="campaign-title">Hazırda kampaniya yoxdur</div>
          <p class="store-side-text">Bu mağazanın aktiv kampaniyası olmadıqda burada görünəcək.</p>
        </div>

        <!-- Əlaqə -->
        ${hasContact ? `
        <div class="store-side-card">
          <div class="store-side-title">Əlaqə</div>
          ${s.phone ? `
          <div class="store-contact-row">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 01.4 1.18 2 2 0 012 1h3a2 2 0 012 1.72c.13.96.36 1.9.7 2.81a2 2 0 01-.45 2.11L6.09 8.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0122 16.92z"/></svg>
            <span>${s.phone}</span>
          </div>` : ''}
          ${(s.publicEmail || s.email) ? `
          <div class="store-contact-row">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
            <span>${s.publicEmail || s.email}</span>
          </div>` : ''}
          ${s.website ? `
          <div class="store-contact-row">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>
            <a href="${s.website.startsWith('http') ? s.website : 'https://'+s.website}" target="_blank" rel="noopener"
               style="color:var(--accent);text-decoration:none;font-size:0.835rem;"
               onmouseover="this.style.textDecoration='underline'" onmouseout="this.style.textDecoration='none'">
              ${s.website.replace(/^https?:\/\//, '')}
            </a>
          </div>` : ''}
        </div>` : ''}

        <!-- Ünvan & İş saatları -->
        ${(hasAddress || s.workHours) ? `
        <div class="store-side-card">
          <div class="store-side-title">Ünvan & İş saatları</div>
          ${hasAddress ? `
          <div class="store-contact-row" style="align-items:flex-start;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-top:2px;flex-shrink:0"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
            <span style="line-height:1.55;">${[s.street, s.district, s.city].filter(Boolean).join(', ')}</span>
          </div>` : ''}
          ${s.workHours ? `
          <div class="store-contact-row">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            <span>${s.workHours}</span>
          </div>` : ''}
        </div>` : ''}

        <!-- Sosial Media -->
        ${hasSocial ? `
        <div class="store-side-card">
          <div class="store-side-title">Sosial Media</div>
          <div style="display:flex;flex-direction:column;gap:8px;">
            ${socialLinks.map(soc => {
              const val     = s[soc.key];
              const href    = val.startsWith('http') ? val : soc.prefix + val.replace('@','');
              const display = val.replace(/^https?:\/\/[^/]+\/?/, '').replace(/^@?/, '@').substring(0, 20);
              return `
              <a href="${href}" target="_blank" rel="noopener"
                 style="display:flex;align-items:center;gap:10px;padding:8px 10px;border:1px solid var(--border);border-radius:10px;text-decoration:none;color:var(--text);transition:all .2s;font-size:0.82rem;"
                 onmouseover="this.style.borderColor='var(--accent)';this.style.background='var(--bg)'"
                 onmouseout="this.style.borderColor='var(--border)';this.style.background='transparent'">
                <span style="color:var(--accent);display:flex;align-items:center;">${soc.icon}</span>
                <span style="font-weight:500;flex:1;">${soc.label}</span>
                <span style="color:var(--muted);font-size:0.76rem;">${display.length > 18 ? display.substring(0,18)+'…' : display}</span>
              </a>`;
            }).join('')}
          </div>
        </div>` : ''}

        <!-- Çatdırılma -->
        <div class="store-side-card">
          <div class="store-side-title">Çatdırılma</div>
          <div class="store-delivery-tag">✓ Pulsuz çatdırılma</div>
          <p class="store-side-text">${freeShipText}</p>
          ${s.deliveryDays ? `
          <div class="store-contact-row" style="margin-top:8px;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="3" width="15" height="13" rx="1"/><path d="M16 8h4l3 5v4h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
            <span>${deliveryText}</span>
          </div>` : ''}
        </div>

      </div>
    </div>

    <!-- ── YENİ: Kateqoriya filter CSS ── -->
    <style>
      .store-cat-filter {
        margin-bottom: 1.5rem;
        display: flex;
        flex-direction: column;
        gap: 0.6rem;
      }
      .scf-main-row, .scf-sub-row {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
        align-items: center;
      }
      .scf-sub-row {
        padding-left: 0.5rem;
        border-left: 2px solid var(--border);
      }
      .scf-chip {
        display: inline-flex;
        align-items: center;
        gap: 0.35rem;
        padding: 0.38rem 0.85rem;
        border-radius: 20px;
        border: 1.5px solid var(--border);
        background: var(--surface, #fff);
        color: var(--text);
        font-size: 0.8rem;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.18s;
        white-space: nowrap;
        font-family: inherit;
      }
      .scf-chip:hover {
        border-color: var(--accent);
        color: var(--accent);
      }
      .scf-chip--active {
        background: var(--accent, #1a1a1a);
        border-color: var(--accent, #1a1a1a);
        color: #fff;
      }
      .scf-chip--active:hover {
        opacity: 0.88;
        color: #fff;
      }
      .scf-chip--sub {
        font-size: 0.75rem;
        padding: 0.3rem 0.72rem;
        border-style: dashed;
      }
      .scf-chip--sub.scf-chip--active {
        border-style: solid;
      }
      .scf-icon {
        font-size: 0.85rem;
        line-height: 1;
      }
      .scf-count {
        font-size: 0.68rem;
        font-weight: 600;
        opacity: 0.65;
        margin-left: 0.1rem;
      }
      .scf-chip--active .scf-count {
        opacity: 0.8;
      }
      @media (max-width: 500px) {
        .scf-chip { font-size: 0.74rem; padding: 0.32rem 0.7rem; }
      }
    </style>
  `;

  document.title = `${s.storeName} — MODA`;

  // Filter paneli render et
  if (showFilter) _renderStoreCatFilter();

  // Məhsulları render et
  if (storeListings.length > 0) _renderStoreProducts();
}

/* ══════════════════════════════════════════
   İZLƏ / İZLƏMƏ
══════════════════════════════════════════ */
function followBtnHTML(following) {
  if (following) return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/><polyline points="17 11 19 13 23 9"/></svg>İzləyirsiniz`;
  return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="16" y1="11" x2="22" y2="11"/></svg>İzlə`;
}

async function toggleFollow() {
  const cu = fbAuth.currentUser;
  if (!cu) {
    if (typeof modal !== 'undefined') modal.open('authModal');
    if (typeof toast !== 'undefined') toast.show('İzləmək üçün daxil olun', 'default');
    return;
  }

  const btn   = document.getElementById('storeFollowBtn');
  const docId = `${cu.uid}_${storeUid}`;
  const ref   = fbDb.collection('follows').doc(docId);

  try {
    if (isFollowing) {
      await ref.delete();
      isFollowing = false;
      storeData.followerCount = Math.max(0, storeData.followerCount - 1);
    } else {
      await ref.set({ followerId: cu.uid, storeId: storeUid, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
      isFollowing = true;
      storeData.followerCount++;
    }
    const countEl = document.getElementById('followerCount');
    if (countEl) countEl.textContent = storeData.followerCount;
    btn.className = `store-follow-btn${isFollowing ? ' following' : ''}`;
    btn.innerHTML = followBtnHTML(isFollowing);
    if (typeof toast !== 'undefined') toast.show(isFollowing ? `${storeData.storeName} izlənilir ✓` : 'İzləmə dayandırıldı', 'success');
  } catch (err) {
    if (typeof toast !== 'undefined') toast.show('Xəta: ' + err.message, 'error');
  }
}
