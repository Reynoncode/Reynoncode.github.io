/* ═══════════════════════════════════════════════════════
   search.js — Axtarış Səhifəsi Məntiqi
   ═══════════════════════════════════════════════════════ */

let _allSearchProducts = [];
let _activeSubCats     = [];
let _activeStores      = [];
let _minPrice          = null;
let _maxPrice          = null;
let _sortOrder         = 'newest';
let _searchQuery       = '';

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

  const sInput = document.getElementById('searchInput');
  if (sInput) sInput.value = _searchQuery;

  loadListings();
});

function applyFilter() { runSearch(); }

/* ══ ƏSAS AXTARIŞ ══ */
function runSearch() {
  if (!_searchQuery) {
    _allSearchProducts = [...PRODUCTS];
  } else {
    const q = _searchQuery.toLowerCase();
    _allSearchProducts = PRODUCTS.filter(p => {
      return (p.category  && p.category.toLowerCase().includes(q))  ||
             (p.brand     && p.brand.toLowerCase().includes(q))     ||
             (p.name      && p.name.toLowerCase().includes(q))      ||
             (p.storeName && p.storeName.toLowerCase().includes(q));
    });
  }
  buildSidebar();
  applySearchFilters();
}

/* ══ SIDEBAR ══ */
async function buildSidebar() {
  const first3 = _allSearchProducts.slice(0, 3);

  // Birinci 3 məhsulun ana kateqoriya ID-lərini topla
  const mainCatIds = new Set();
  first3.forEach(p => {
    if (p.category && p.category.trim()) mainCatIds.add(p.category.trim());
    (p.vendorCategories || []).forEach(c => { if (c) mainCatIds.add(c.trim()); });
  });

  // Firebase-dən platforma kateqoriyalarını yüklə
  let platformCats = [];
  try {
    const snap = await fbDb.collection('admin').doc('platformSettings').get();
    if (snap.exists) {
      const d = snap.data();
      platformCats = d.mainCategories || d.categories || [];
    }
  } catch(e) {}

  if (!platformCats.length) {
    try {
      const snap2 = await fbDb.collection('settings').doc('categories').get();
      if (snap2.exists) platformCats = snap2.data().items || [];
    } catch(e) {}
  }

  // Həmin ana kateqoriyaların alt kateqoriyalarını topla
  const subCatsToShow = [];
  mainCatIds.forEach(catId => {
    const mainCat = platformCats.find(c =>
      c.id === catId || (c.label || '').toLowerCase() === catId.toLowerCase()
    );
    if (mainCat && Array.isArray(mainCat.subCats) && mainCat.subCats.length) {
      mainCat.subCats.forEach(sub => {
        const fullKey = mainCat.id + '::' + sub;
        if (!subCatsToShow.find(s => s.key === fullKey)) {
          subCatsToShow.push({
            key:       fullKey,
            subLabel:  sub,
            mainCatId: mainCat.id,
            icon:      mainCat.icon || '📁'
          });
        }
      });
    }
  });

  // Alt kateqoriya yoxdursa, birbaşa məhsulların ana kateqoriyalarını göstər
  if (subCatsToShow.length === 0) {
    mainCatIds.forEach(cat => {
      const mainCat = platformCats.find(c => c.id === cat);
      subCatsToShow.push({
        key:       'direct::' + cat,
        subLabel:  mainCat ? mainCat.label : cat,
        mainCatId: cat,
        icon:      mainCat ? mainCat.icon : '📁',
        isDirect:  true
      });
    });
  }

  const subCatEl = document.getElementById('sidebarSubCats');
  if (subCatEl) {
    if (!subCatsToShow.length) {
      subCatEl.innerHTML = '<div style="color:var(--muted);font-size:0.8rem;padding:0.25rem 0;">Kateqoriya yoxdur</div>';
    } else {
      subCatEl.innerHTML = subCatsToShow.map(item => {
        const iconSvg = typeof getLucideIcon === 'function'
          ? getLucideIcon(item.icon || '📁') : '';
        const cnt = _allSearchProducts.filter(p => {
          if (item.isDirect) return p.category === item.mainCatId;
          return p.category === item.mainCatId ||
                 (p.vendorCategories || []).includes(item.mainCatId) ||
                 (p.subCategory || '') === item.subLabel;
        }).length;
        return '<label class="sf-check">' +
          '<input type="checkbox" value="' + _esc(item.key) + '"' +
          ' onchange="toggleSubCat(\'' + _esc(item.key) + '\', this.checked)">' +
          '<span class="sf-check-icon">' + iconSvg + '</span>' +
          '<span class="sf-check-label">' + _esc(item.subLabel) + '</span>' +
          '<span class="sf-count">(' + cnt + ')</span>' +
        '</label>';
      }).join('');
    }
  }

  /* ── Mağazalar ── */
  const storeMap = {};
  first3.forEach(p => {
    if (p.userId && p._fromFirebase && !storeMap[p.userId]) {
      storeMap[p.userId] = { uid: p.userId, name: p.storeName || p.brand || 'Mağaza', photoURL: p.storePhotoURL || '', count: 0 };
    }
  });
  _allSearchProducts.forEach(p => { if (p.userId && storeMap[p.userId]) storeMap[p.userId].count++; });

  const storeUids = Object.keys(storeMap);
  if (storeUids.length > 0) {
    try {
      const vSnap = await fbDb.collection('vendors')
        .where(firebase.firestore.FieldPath.documentId(), 'in', storeUids).get();
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
    if (!stores.length) {
      storesEl.innerHTML = '<div style="color:var(--muted);font-size:0.8rem;">Mağaza tapılmadı</div>';
    } else {
      storesEl.innerHTML = stores.map(s => {
        const initials = (s.name || 'M').split(' ').map(w => w[0] || '').join('').substring(0, 2).toUpperCase();
        const avatarHTML = s.photoURL
          ? '<img src="' + _esc(s.photoURL) + '" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" />'
          : '<span style="font-size:0.6rem;font-weight:700;color:#fff;">' + initials + '</span>';
        return '<label class="sf-check">' +
          '<input type="checkbox" value="' + _esc(s.uid) + '"' +
          ' onchange="toggleStore(\'' + _esc(s.uid) + '\', this.checked)">' +
          '<div style="width:22px;height:22px;border-radius:50%;overflow:hidden;background:var(--text);' +
          'display:flex;align-items:center;justify-content:center;flex-shrink:0;">' + avatarHTML + '</div>' +
          '<span class="sf-check-label">' + _esc(s.name) + '</span>' +
          '<span class="sf-count">(' + s.count + ')</span>' +
        '</label>';
      }).join('');
    }
  }

  /* Qiymət placeholder */
  const prices = _allSearchProducts.map(p => parseFloat(p.price)).filter(v => !isNaN(v));
  if (prices.length > 0) {
    const minP = Math.floor(Math.min(...prices));
    const maxP = Math.ceil(Math.max(...prices));
    const minEl = document.getElementById('priceMin');
    const maxEl = document.getElementById('priceMax');
    if (minEl) { minEl.placeholder = 'Min: ' + minP + ' ₼'; minEl.min = 0; }
    if (maxEl) { maxEl.placeholder = 'Maks: ' + maxP + ' ₼'; maxEl.min = 0; }
  }
}

/* ══ FİLTR FUNKSİYALARI ══ */
function toggleSubCat(key, checked) {
  if (checked) { if (!_activeSubCats.includes(key)) _activeSubCats.push(key); }
  else          { _activeSubCats = _activeSubCats.filter(c => c !== key); }
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
  _minPrice = null; _maxPrice = null;
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
  const select = document.getElementById('sfSortSelect');
  if (select) select.value = val;
  applySearchFilters();
}

/* ══ FİLTR + SIRALAMA + RENDER ══ */
function applySearchFilters() {
  let products = [..._allSearchProducts];

  if (_activeSubCats.length > 0) {
    products = products.filter(p => {
      return _activeSubCats.some(key => {
        const parts = key.split('::');
        const mainCatId = parts[0];
        const subLabel  = parts[1] || '';
        if (mainCatId === 'direct') return p.category === subLabel;
        return p.category === mainCatId ||
               (p.vendorCategories || []).includes(mainCatId) ||
               (p.subCategory || '') === subLabel;
      });
    });
  }

  if (_activeStores.length > 0) {
    products = products.filter(p => _activeStores.includes(p.userId));
  }

  if (_minPrice !== null) products = products.filter(p => parseFloat(p.price) >= _minPrice);
  if (_maxPrice !== null) products = products.filter(p => parseFloat(p.price) <= _maxPrice);

  switch (_sortOrder) {
    case 'price-asc':  products.sort((a, b) => (parseFloat(a.price)||0) - (parseFloat(b.price)||0)); break;
    case 'price-desc': products.sort((a, b) => (parseFloat(b.price)||0) - (parseFloat(a.price)||0)); break;
    case 'newest':     products.sort((a, b) => _tsSeconds(b.createdAt) - _tsSeconds(a.createdAt)); break;
    case 'oldest':     products.sort((a, b) => _tsSeconds(a.createdAt) - _tsSeconds(b.createdAt)); break;
    case 'rating':     products.sort((a, b) => (parseFloat(b.rating)||0) - (parseFloat(a.rating)||0)); break;
  }

  const countEl = document.getElementById('searchResultCount');
  if (countEl) countEl.textContent = products.length;

  const grid = document.getElementById('searchResultsGrid');
  if (!grid) return;

  if (!products.length) {
    grid.innerHTML =
      '<div class="sp-empty" style="grid-column:1/-1;">' +
        '<div class="sp-empty-icon">' +
          '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none"' +
          ' stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="opacity:0.3;">' +
          '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>' +
        '</div>' +
        '<p><strong>"' + _esc(_searchQuery) + '"</strong> üzrə heç bir məhsul tapılmadı.</p>' +
        '<p style="font-size:0.85rem;margin-top:0.5rem;">Filtrləri sıfırlayın və ya başqa söz axtarın.</p>' +
      '</div>';
    return;
  }

  renderProducts(products, 'searchResultsGrid');
}

function _tsSeconds(ts) {
  if (!ts) return 0;
  if (ts.seconds) return ts.seconds;
  if (ts.toDate)  return ts.toDate().getTime() / 1000;
  return 0;
}

function _esc(str) {
  return String(str ?? '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
