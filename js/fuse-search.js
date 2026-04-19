/* ═══════════════════════════════════════════════════════════════
   fuse-search.js — Fuzzy (ağıllı) Axtarış Modulu
   Fuse.js istifadə edərək hərfləri səhv yazılan sorğuları
   avtomatik düzəldir və uyğun məhsulları tapır.

   İstifadə:  fuzzySearchProducts(query)
              → { catMatches, brandMatches, nameMatches, storeMap,
                  wasCorrected }
   ═══════════════════════════════════════════════════════════════ */

const FUSE_OPTIONS = {
  keys: [
    { name: 'name',      weight: 0.50 },
    { name: 'brand',     weight: 0.30 },
    { name: 'category',  weight: 0.15 },
    { name: 'storeName', weight: 0.05 },
  ],
  threshold:          0.42,   /* 0 = mükəmməl uyğunluq, 1 = hər şey */
  distance:           200,
  minMatchCharLength: 2,
  includeScore:       true,
  useExtendedSearch:  false,
};

let _fuseInstance    = null;
let _fuseProductHash = 0;

/* Fuse instansını PRODUCTS uyğunluğuna görə qaytar/yenilə */
function _getFuse() {
  if (typeof Fuse === 'undefined') return null;
  const hash = (typeof PRODUCTS !== 'undefined') ? PRODUCTS.length : 0;
  if (!_fuseInstance || _fuseProductHash !== hash) {
    _fuseInstance    = new Fuse(PRODUCTS || [], FUSE_OPTIONS);
    _fuseProductHash = hash;
  }
  return _fuseInstance;
}

/* Fuse instansını məcburi sıfırla (PRODUCTS yeniləndikdən sonra) */
function resetFuseIndex() {
  _fuseInstance    = null;
  _fuseProductHash = 0;
}

/**
 * Əsas fuzzy axtarış funksiyası.
 *
 * @param  {string} query — istifadəçinin daxil etdiyi mətn
 * @returns {{
 *   catMatches:   Array,
 *   brandMatches: Array,
 *   nameMatches:  Array,
 *   storeMap:     Object,
 *   wasCorrected: boolean
 * }}
 */
function fuzzySearchProducts(query) {
  const fuse = _getFuse();

  /* Fuse yüklənməyibsə köhnə dəqiq axtarışa yönləndir */
  if (!fuse) return _exactFallback(query);

  const q = (query || '').toLowerCase().trim();
  if (!q) return { catMatches: [], brandMatches: [], nameMatches: [], storeMap: {}, wasCorrected: false };

  /* ── Dəqiq uyğunluq var mı? ── */
  const hasExact = (typeof PRODUCTS !== 'undefined') && PRODUCTS.some(p =>
    (p.name      || '').toLowerCase().includes(q) ||
    (p.brand     || '').toLowerCase().includes(q) ||
    (p.category  || '').toLowerCase().includes(q) ||
    (p.storeName || '').toLowerCase().includes(q)
  );

  const rawResults = fuse.search(query);
  const wasCorrected = !hasExact && rawResults.length > 0;

  const catMatches   = [];
  const brandMatches = [];
  const nameMatches  = [];
  const storeMap     = {};
  const seen         = new Set();

  rawResults.forEach(({ item: p }) => {
    if (seen.has(p.id)) return;
    seen.add(p.id);

    /* Kateqoriya / marka / ad üzrə qruplaşdır
       (dəqiq uyğunluq əsasında; fuzzy olanlar nameMatches-ə düşür) */
    const inCat   = (p.category || '').toLowerCase().includes(q);
    const inBrand = (p.brand    || '').toLowerCase().includes(q);

    if (inCat)        catMatches.push(p);
    else if (inBrand) brandMatches.push(p);
    else              nameMatches.push(p);

    /* Mağaza kartları — yalnız dəqiq uyğunluqda göstər */
    if (!wasCorrected && p._fromFirebase && p.userId) {
      const sName = (p.storeName || '').toLowerCase();
      const bName = (p.brand     || '').toLowerCase();
      if (sName.includes(q) || bName.includes(q)) {
        if (!storeMap[p.userId]) {
          storeMap[p.userId] = {
            uid:      p.userId,
            name:     p.storeName || p.brand || 'Mağaza',
            photoURL: p.storePhotoURL || '',
            count:    0,
          };
        }
        storeMap[p.userId].count++;
      }
    }
  });

  return { catMatches, brandMatches, nameMatches, storeMap, wasCorrected };
}

/* ── Fallback: Fuse olmadan dəqiq axtarış ── */
function _exactFallback(query) {
  const q = (query || '').toLowerCase();
  const catMatches = [], brandMatches = [], nameMatches = [];
  const storeMap = {};

  (typeof PRODUCTS !== 'undefined' ? PRODUCTS : []).forEach(p => {
    const inCat   = p.category && p.category.toLowerCase().includes(q);
    const inBrand = p.brand    && p.brand.toLowerCase().includes(q);
    const inName  = p.name     && p.name.toLowerCase().includes(q);

    if (inCat)        catMatches.push(p);
    else if (inBrand) brandMatches.push(p);
    else if (inName)  nameMatches.push(p);

    if (p._fromFirebase && p.userId) {
      const sName = (p.storeName || '').toLowerCase();
      const bName = (p.brand     || '').toLowerCase();
      if (sName.includes(q) || bName.includes(q)) {
        if (!storeMap[p.userId]) {
          storeMap[p.userId] = { uid: p.userId, name: p.storeName || p.brand || 'Mağaza', photoURL: p.storePhotoURL || '', count: 0 };
        }
        storeMap[p.userId].count++;
      }
    }
  });

  return { catMatches, brandMatches, nameMatches, storeMap, wasCorrected: false };
}
