/* ═══════════════════════════════════════════════════════
   search.js — Axtarış Səhifəsi Məntiqi
   PRODUCTS, createProductCard, renderProducts, addToCart,
   toggleFav, openProductDetail — products.js-dən gəlir
   ═══════════════════════════════════════════════════════ */

let _allSearchProducts = [];   // axtarışa uyğun bütün məhsullar
let _activeSubCats     = [];   // seçilmiş kateqoriyalar
let _activeStores      = [];   // seçilmiş mağazalar
let _minPrice          = null;
let _maxPrice          = null;
let _sortOrder         = 'newest';
let _searchQuery       = '';

/* ══════════════════════════════
   SƏHİFƏ YÜKLƏNMƏ
   ══════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  _searchQuery = (params.get('q') || '').trim();

  const titleEl = document.getElementById('spQueryTitle');
  if (titleEl) {
    titleEl.textContent = _searchQuery
      ? `"${_searchQuery}" üzrə nəticələr`
      : 'Bütün məhsullar';
  }
  document.title = _searchQuery
    ? `"${_searchQuery}" — ALMODA Axtarış`
    : 'Axtarış — ALMODA';

  // Headerdakı search inputu mövcud query ilə doldur
  const sInput = document.getElementById('searchInput');
  if (sInput) sInput.value = _searchQuery;

  // products.js-dəki loadListings() Firebase-dən məhsulları yükləyir;
  // bitdikdə applyFilter() çağırır — biz onu override edirik
  loadListings();
});

/* products.js-dəki hook — loadListings bitdikdə burası çağrılır */
function applyFilter() {
  runSearch();
}

/* ══════════════════════════════
   ƏSAS AXTARIŞ
   ══════════════════════════════ */
function runSearch() {
  if (!_searchQuery) {
    _allSearchProducts = [...PRODUCTS];
  } else {
    const q = _searchQuery.toLowerCase();
    _allSearchProducts = PRODUCTS.filter(p => {
      const inCat   = p.category  && p.category.toLowerCase().includes(q);
      const inBrand = p.brand     && p.brand.toLowerCase().includes(q);
      const inName  = p.name      && p.name.toLowerCase().includes(q);
      const inStore = p.storeName && p.storeName.toLowerCase().includes(q);
      return inCat || inBrand || inName || inStore;
    });
  }

  buildSidebar();
  applySearchFilters();
}

/* ══════════════════════════════
   SIDEBAR TİKİNTİSİ
   ══════════════════════════════ */
async function buildSidebar() {
  const first3 = _allSearchProducts.slice(0, 3);

  /* ── Kateqoriyalar ──
     Birinci 3 məhsulun satıcısının seçdiyi kateqoriyalar (vendorCategories)
     + məhsulun özünün category dəyəri                                      */
  const subCatSet = new Set();
  first3.forEach(p => {
    if (p.category && p.category.trim()) subCatSet.add(p.category.trim());
    (p.vendorCategories || []).forEach(c => { if (c) subCatSet.add(c); });
  });

  /* Platforma kateqoriyaları label xəritəsi (Firebase-dən + standart) */
  const CAT_MAP = {
    elektronika: '📱 Elektronika',
    geyim:       '👗 Geyim və Moda',
    ev:          '🏠 Ev və Yaşam',
    gozellik:    '💄 Gözəllik',
    saglamliq:   '💊 Sağlamlıq',
    usaq:        '🧸 Uşaq',
    avto:        '🚗 Avto',
    idman:       '⚽ İdman',
    kitab:       '📚 Kitablar',
    hediyye:     '🎁 Hədiyyələr',
    qadin:       '👗 Qadın',
    kisi:        '👔 Kişi',
    unisex:      '🧥 Unisex',
    aksesuallar: '👜 Aksesuarlar',
    ayaqqabi:    '👟 Ayaqqabı',
    idman_geym:  '🏃 İdman Geyimi',
  };

  /* Firebase-dən platform kateqoriya adlarını da cəhd et */
  try {
    const snap = await fbDb.collection('settings').doc('categories').get();
    if (snap.exists) {
      (snap.data().items || []).forEach(c => {
        if (c.id && c.label) CAT_MAP[c.id] = (c.icon ? c.icon + ' ' : '') + c.label;
      });
    }
  } catch(e) {}

  const subCatEl = document.getElementById('sidebarSubCats');
  if (subCatEl) {
    const cats = [...subCatSet];
    if (cats.length === 0) {
      subCatEl.innerHTML = '<div style="color:var(--muted);font-size:0.8rem;">Kateqoriya yoxdur</div>';
    } else {
      subCatEl.innerHTML = cats.map(cat => {
        const label = CAT_MAP[cat] || cat;
        const cnt   = _allSearchProducts.filter(p =>
          p.category === cat || (p.vendorCategories || []).includes(cat)
        ).length;
        return `<label class="sf-check">
          <input type="checkbox" value="${_esc(cat)}"
            onchange="toggleSubCat('${_esc(cat)}', this.checked)">
          <span>${_esc(label)}</span>
          <span class="sf-count">(${cnt})</span>
        </label>`;
      }).join('');
    }
  }

  /* ── Mağazalar ──
     Birinci 3 məhsulun satıcısı                                           */
  const storeMap = {};
  first3.forEach(p => {
    if (p.userId && p._fromFirebase && !storeMap[p.userId]) {
      storeMap[p.userId] = {
        uid:      p.userId,
        name:     p.storeName || p.brand || 'Mağaza',
        photoURL: p.storePhotoURL || '',
        count:    0
      };
    }
  });
  _allSearchProducts.forEach(p => {
    if (p.userId && storeMap[p.userId]) storeMap[p.userId].count++;
  });

  /* Vendor adlarını Firebase-dən de yüklə (real storeName üçün) */
  const storeUids = Object.keys(storeMap);
  if (storeUids.length > 0) {
    try {
      const vSnap = await fbDb.collection('vendors')
        .where(firebase.firestore.FieldPath.documentId(), 'in', storeUids)
        .get();
      vSnap.docs.forEach(d => {
        const vd = d.data();
        if (storeMap[d.id]) {
          storeMap[d.id].name     = vd.storeName || storeMap[d.id].name;
          storeMap[d.id].photoURL = vd.photoURL  || vd.logoURL || storeMap[d.id].photoURL;
        }
      });
    } catch(e) {}
  }

  const storesEl = document.getElementById('sidebarStores');
  if (storesEl) {
    const stores = Object.values(storeMap);
    if (stores.length === 0) {
      storesEl.innerHTML = '<div style="color:var(--muted);font-size:0.8rem;">Mağaza tapılmadı</div>';
    } else {
      storesEl.innerHTML = stores.map(s => {
        const initials = (s.name || 'M').split(' ').map(w => w[0] || '').join('').substring(0, 2).toUpperCase();
        const avatarHTML = s.photoURL
          ? `<img src="${_esc(s.photoURL)}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" />`
          : `<span style="font-size:0.6rem;font-weight:700;color:#fff;">${initials}</span>`;
        return `<label class="sf-check">
          <input type="checkbox" value="${_esc(s.uid)}"
            onchange="toggleStore('${_esc(s.uid)}', this.checked)">
          <div style="width:22px;height:22px;border-radius:50%;overflow:hidden;background:var(--text);
                      display:flex;align-items:center;justify-content:center;flex-shrink:0;">
            ${avatarHTML}
          </div>
          <span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:110px;">${_esc(s.name)}</span>
          <span class="sf-count">(${s.count})</span>
        </label>`;
      }).join('');
    }
  }

  /* ── Qiymət aralığı placeholder-ları ── */
  const prices = _allSearchProducts.map(p => parseFloat(p.price)).filter(v => !isNaN(v));
  if (prices.length > 0) {
    const minP = Math.floor(Math.min(...prices));
    const maxP = Math.ceil(Math.max(...prices));
    const minEl = document.getElementById('priceMin');
    const maxEl = document.getElementById('priceMax');
    if (minEl) { minEl.placeholder = `Min: ${minP} ₼`; minEl.min = 0; }
    if (maxEl) { maxEl.placeholder = `Maks: ${maxP} ₼`; maxEl.min = 0; }
  }
}

/* ══════════════════════════════
   FİLTR TƏTBİQLƏRİ
   ══════════════════════════════ */
function toggleSubCat(cat, checked) {
  if (checked) { if (!_activeSubCats.includes(cat)) _activeSubCats.push(cat); }
  else          { _activeSubCats = _activeSubCats.filter(c => c !== cat); }
  applySearchFilters();
}

function toggleStore(uid, checked) {
  if (checked) { if (!_activeStores.includes(uid)) _activeStores.push(uid); }
  else          { _activeStores = _activeStores.filter(u => u !== uid); }
  applySearchFilters();
}

function setPriceFilter() {
  const minEl = document.getElementById('priceMin');
  const maxEl = document.getElementById('priceMax');
  _minPrice = (minEl && minEl.value !== '') ? parseFloat(minEl.value) : null;
  _maxPrice = (maxEl && maxEl.value !== '') ? parseFloat(maxEl.value) : null;
  applySearchFilters();
}

function resetPrice() {
  _minPrice = null;
  _maxPrice = null;
  const minEl = document.getElementById('priceMin');
  const maxEl = document.getElementById('priceMax');
  if (minEl) minEl.value = '';
  if (maxEl) maxEl.value = '';
  applySearchFilters();
}

function resetSubCats() {
  _activeSubCats = [];
  document.querySelectorAll('#sidebarSubCats input[type="checkbox"]').forEach(cb => cb.checked = false);
  applySearchFilters();
}

function resetStores() {
  _activeStores = [];
  document.querySelectorAll('#sidebarStores input[type="checkbox"]').forEach(cb => cb.checked = false);
  applySearchFilters();
}

function setSortOrder(val) {
  _sortOrder = val;
  document.querySelectorAll('.sf-sort-btn').forEach(b => b.classList.remove('active'));
  const activeBtn = document.querySelector(`.sf-sort-btn[data-sort="${val}"]`);
  if (activeBtn) activeBtn.classList.add('active');
  applySearchFilters();
}

/* ══════════════════════════════
   FİLTR + SIRALAMA + RENDER
   ══════════════════════════════ */
function applySearchFilters() {
  let products = [..._allSearchProducts];

  /* Kateqoriya filteri */
  if (_activeSubCats.length > 0) {
    products = products.filter(p =>
      _activeSubCats.some(cat =>
        p.category === cat || (p.vendorCategories || []).includes(cat)
      )
    );
  }

  /* Mağaza filteri */
  if (_activeStores.length > 0) {
    products = products.filter(p => _activeStores.includes(p.userId));
  }

  /* Qiymət filteri */
  if (_minPrice !== null) products = products.filter(p => parseFloat(p.price) >= _minPrice);
  if (_maxPrice !== null) products = products.filter(p => parseFloat(p.price) <= _maxPrice);

  /* Sıralama */
  switch (_sortOrder) {
    case 'price-asc':
      products.sort((a, b) => (parseFloat(a.price) || 0) - (parseFloat(b.price) || 0));
      break;
    case 'price-desc':
      products.sort((a, b) => (parseFloat(b.price) || 0) - (parseFloat(a.price) || 0));
      break;
    case 'newest':
      products.sort((a, b) =>
        (_tsSeconds(b.createdAt) - _tsSeconds(a.createdAt))
      );
      break;
    case 'oldest':
      products.sort((a, b) =>
        (_tsSeconds(a.createdAt) - _tsSeconds(b.createdAt))
      );
      break;
    case 'rating':
      products.sort((a, b) =>
        ((parseFloat(b.rating) || 0) - (parseFloat(a.rating) || 0))
      );
      break;
  }

  /* Nəticə sayını göstər */
  const countEl = document.getElementById('searchResultCount');
  if (countEl) countEl.textContent = products.length;

  /* Grid render */
  const grid = document.getElementById('searchResultsGrid');
  if (!grid) return;

  if (products.length === 0) {
    grid.innerHTML = `
      <div class="sp-empty" style="grid-column:1/-1;">
        <div class="sp-empty-icon">🔍</div>
        <p><strong>"${_esc(_searchQuery)}"</strong> üzrə heç bir məhsul tapılmadı.</p>
        <p style="font-size:0.85rem;margin-top:0.5rem;">Filtrləri sıfırlayın və ya başqa söz axtarın.</p>
      </div>`;
    return;
  }

  /* renderProducts → containerId = 'searchResultsGrid' olduğuna görə
     products.js-dəki öncü mağaza kartı əlavə etmir                      */
  renderProducts(products, 'searchResultsGrid');
}

/* ── Yardımçılar ── */
function _tsSeconds(ts) {
  if (!ts) return 0;
  if (ts.seconds) return ts.seconds;
  if (ts.toDate)  return ts.toDate().getTime() / 1000;
  return 0;
}

function _esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
