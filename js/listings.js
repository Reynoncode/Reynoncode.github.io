/* ═══════════════════════════════════════════
   listings.js — Elan idarəetmə paneli
   Profile.html-ə əlavə et: <script src="js/listings.js"></script>
   ═══════════════════════════════════════════ */

/* ── Preset rənglər ── */
const PRESET_COLORS = [
  { name:'Qara',         hex:'#111111' }, { name:'Ağ',           hex:'#FFFFFF' },
  { name:'Boz',          hex:'#9CA3AF' }, { name:'Tünd boz',     hex:'#4B5563' },
  { name:'Krem',         hex:'#FEF3C7' }, { name:'Bej',          hex:'#D4B896' },
  { name:'Qəhvəyi',      hex:'#92400E' }, { name:'Karamel',      hex:'#B45309' },
  { name:'Tünd mavi',    hex:'#1E3A5F' }, { name:'Mavi',         hex:'#2563EB' },
  { name:'Açıq mavi',    hex:'#93C5FD' }, { name:'Göy',          hex:'#06B6D4' },
  { name:'Qırmızı',      hex:'#DC2626' }, { name:'Bordo',        hex:'#881337' },
  { name:'Çəhrayı',      hex:'#EC4899' }, { name:'Açıq çəhrayı', hex:'#FBCFE8' },
  { name:'Narıncı',      hex:'#F97316' }, { name:'Sarı',         hex:'#EAB308' },
  { name:'Limon',        hex:'#D9F99D' }, { name:'Yaşıl',        hex:'#16A34A' },
  { name:'Zeytun',       hex:'#65A30D' }, { name:'Tünd yaşıl',   hex:'#14532D' },
  { name:'Bənövşəyi',    hex:'#7C3AED' }, { name:'Lavanda',      hex:'#C4B5FD' },
];

/* ════════════════════════════════════════════════════════════
   KATEQORİYA SİSTEMİ — Firebase-dən oxunur
   ════════════════════════════════════════════════════════════ */
let _listingMainCats = [];
let _listingPlatCats = [];   // 3-cü tip: qruplaşdırılmış kateqoriyalar

async function loadListingCategories() {
  let cats = null;
  try {
    const pubSnap = await fbDb.collection('settings').doc('categories').get();
    if (pubSnap.exists) { cats = pubSnap.data().items || null; }
  } catch(e) { console.warn('Public kateqoriyalar oxunmadı:', e.message); }

  if (!cats) {
    try {
      const adminSnap = await fbDb.collection('admin').doc('platformSettings').get();
      if (adminSnap.exists) {
        const d = adminSnap.data();
        cats = d.mainCategories || d.categories || null;
      }
    } catch(e) { console.warn('Admin kateqoriyalar oxunmadı:', e.message); }
  }
  _listingMainCats = Array.isArray(cats) ? cats : [];

  // Platforma kateqoriyalarını yüklə (3-cü tip)
  try {
    const platSnap = await fbDb.collection('settings').doc('platformCategories').get();
    if (platSnap.exists) {
      _listingPlatCats = platSnap.data().items || [];
    }
  } catch(e) {
    // Fallback: admin/platformSettings-dən oxu
    try {
      const adminSnap = await fbDb.collection('admin').doc('platformSettings').get();
      if (adminSnap.exists) {
        _listingPlatCats = adminSnap.data().platformCategories || [];
      }
    } catch(e2) { console.warn('Platforma kateqoriyaları oxunmadı:', e2.message); }
  }
}

function onMainCatChange() {
  const mainCatId = document.getElementById('lmMainCategory')?.value;
  const subWrap   = document.getElementById('lmSubCatWrap');
  const subSelect = document.getElementById('lmSubCategory');
  if (!subWrap || !subSelect) return;
  const cat  = _listingMainCats.find(c => c.id === mainCatId);
  const subs = (cat && Array.isArray(cat.subCats)) ? cat.subCats : [];
  if (subs.length === 0) { subWrap.style.display = 'none'; subSelect.innerHTML = ''; return; }
  subSelect.innerHTML = `<option value="">— Seçin —</option>` +
    subs.map(s => `<option value="${s}">${s}</option>`).join('');
  subWrap.style.display = '';
}

function onPlatCatChange() {
  const platCatId   = document.getElementById('lmPlatCategory')?.value;
  const brandWrap   = document.getElementById('lmBrandCatWrap');
  const brandSelect = document.getElementById('lmBrandCategory');
  if (!brandWrap || !brandSelect) return;
  // Find the subCat object that matches selected id
  let brands = [];
  for (const grp of _listingPlatCats) {
    const sub = (grp.subCats || []).find(s => s.id === platCatId);
    if (sub) { brands = sub.brands || []; break; }
  }
  if (!brands.length) { brandWrap.style.display = 'none'; brandSelect.innerHTML = ''; return; }
  brandSelect.innerHTML = `<option value="">— Marka seçin —</option>` +
    brands.map(b => `<option value="${b}">${b}</option>`).join('');
  brandWrap.style.display = '';
}

function buildMainCatSelect() {
  const sel = document.getElementById('lmMainCategory');
  if (!sel) return;
  sel.innerHTML = `<option value="">Seçin...</option>` +
    _listingMainCats.map(c => `<option value="${c.id}">${c.icon || ''} ${c.label}</option>`).join('');
}

function buildPlatCatSelect() {
  const sel = document.getElementById('lmPlatCategory');
  if (!sel) return;
  // Qruplaşdırılmış <optgroup> formatında göstər
  if (!_listingPlatCats.length) {
    sel.innerHTML = '<option value="">Kateqoriya yoxdur</option>';
    return;
  }
  sel.innerHTML = `<option value="">— Seçin —</option>` +
    _listingPlatCats.map(grp => {
      const subs = (grp.subCats || []);
      if (!subs.length) return '';
      return `<optgroup label="${grp.icon ? grp.icon + ' ' : ''}${grp.label}">` +
        subs.map(s => `<option value="${s.id}">${s.label}</option>`).join('') +
        `</optgroup>`;
    }).join('');
}

/* ════════════════════════════════════════════════════════════
   STATE
   ════════════════════════════════════════════════════════════ */
let lState = {
  editingId:       null,
  images:          [],
  colors:          [],
  sizes:           [],
  colorPickerOpen: false,
};

/* ════════════════════════════════════════════════════════════
   CROP STATE & SABİTLƏR
   ════════════════════════════════════════════════════════════ */
// Kart aspect-ratio 3/4 (en:hündürlük)
const CROP_RATIO = 3 / 4;

let _crop = {
  img:           null,
  callback:      null,
  zoom:          1,
  panX:          0,
  panY:          0,
  dragging:      false,
  dragStartX:    0,
  dragStartY:    0,
  dragStartPanX: 0,
  dragStartPanY: 0,
  vpW:           0,
  vpH:           0,
  frameW:        0,
  frameH:        0,
  natW:          0,
  natH:          0,
};

/* ════════════════════════════════════════════════════════════
   TAB YÜKLƏMƏ
   ════════════════════════════════════════════════════════════ */
function loadListingsTab(uid) {
  const container = document.getElementById('tab-listings');
  container.innerHTML = `
    <div class="section-card lst-header-card">
      <div class="lst-header-row">
        <div>
          <div class="section-title" style="margin-bottom:0.25rem;padding-bottom:0;border-bottom:none;">Elanlarım</div>
          <p class="lst-sub">Mağazanıza əlavə etdiyiniz məhsulları burada idarə edin</p>
        </div>
        <button class="btn btn-dark lst-add-btn" onclick="openListingModal()">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Elan əlavə et
        </button>
      </div>
    </div>
    <div id="listingsGrid"></div>
  `;
  injectListingStyles();
  injectListingModal();
  fetchUserListings(uid);
  loadListingCategories().then(() => { buildMainCatSelect(); buildPlatCatSelect(); });
}

/* ════════════════════════════════════════════════════════════
   FİREBASE — ELANLAR
   ════════════════════════════════════════════════════════════ */
async function fetchUserListings(uid) {
  const grid = document.getElementById('listingsGrid');
  if (!grid) return;
  grid.innerHTML = '<div class="section-card"><div class="spinner" style="margin:2rem auto;"></div></div>';
  try {
    const snap = await fbDb.collection('listings')
      .where('userId', '==', uid)
      .orderBy('createdAt', 'desc')
      .get();

    if (snap.empty) {
      grid.innerHTML = `
        <div class="section-card lst-empty">
          <div style="font-size:3rem;margin-bottom:1rem;">🏷️</div>
          <p style="font-weight:500;margin-bottom:0.4rem;">Hələ elan əlavə etməmisiniz</p>
          <p style="font-size:0.82rem;color:var(--muted);margin-bottom:1.25rem;">İlk məhsulunuzu əlavə edərək satışa başlayın</p>
          <button class="btn btn-dark" onclick="openListingModal()">İlk elanı əlavə et</button>
        </div>`;
      return;
    }

    const listings = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    grid.innerHTML = `<div class="lst-grid">${listings.map(renderListingCard).join('')}</div>`;
    if (typeof loadListingReviewsCard === 'function') await loadListingReviewsCard(uid);
  } catch(err) {
    grid.innerHTML = `<div class="section-card"><p style="color:var(--danger);font-size:.875rem;">Xəta: ${err.message}</p></div>`;
  }
}

/* ── Elan kartı ── */
function renderListingCard(l) {
  const img        = (l.imgs && l.imgs[0]) || '';
  const sizes      = l.sizes  || [];
  const colors     = l.colors || [];
  const totalStock = sizes.reduce((s, x) => s + (parseInt(x.stock) || 0), 0);
  const isSale     = l.oldPrice && l.oldPrice > l.price;

  const mainCat  = _listingMainCats.find(c => c.id === (l.mainCategory || l.category));
  const catLabel = mainCat
    ? `${mainCat.icon || ''} ${mainCat.label}${l.subCategory ? ' › ' + l.subCategory : ''}`
    : (l.subCategory || l.category || '');

  return `
  <div class="lac-card" data-id="${l.id}">
    <div class="lac-img-wrap">
      ${img ? `<img src="${img}" alt="${l.name}" loading="lazy">` : `<div class="lac-img-placeholder">👗</div>`}
      <span class="lac-status-badge ${totalStock > 0 ? 'lac-active' : 'lac-out'}">
        ${totalStock > 0 ? `${totalStock} ədəd` : 'Stok yoxdur'}
      </span>
    </div>
    <div class="lac-body">
      ${l.brand ? `<div class="lac-brand">${l.brand}</div>` : ''}
      <div class="lac-name">${l.name || ''}</div>
      <div class="lac-price-row">
        <span class="lac-price ${isSale ? 'lac-sale' : ''}">${(l.price || 0).toFixed(2)} ₼</span>
        ${isSale ? `<span class="lac-old-price">${l.oldPrice.toFixed(2)} ₼</span>` : ''}
      </div>
      ${colors.length ? `
        <div class="lac-colors-row">
          ${colors.slice(0,7).map(c =>
            `<span class="lac-color-dot" style="background:${c.hex};border:${c.hex==='#FFFFFF'?'1px solid #ddd':'none'}" title="${c.name}"></span>`
          ).join('')}
          ${colors.length > 7 ? `<span class="lac-colors-more">+${colors.length-7}</span>` : ''}
        </div>` : ''}
      ${catLabel ? `<div class="lac-cat-tag">${catLabel}</div>` : ''}
      <div class="lac-actions">
        <button class="lac-btn lac-btn-edit" onclick="openEditListing('${l.id}')">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          Redaktə
        </button>
        <button class="lac-btn lac-btn-stock" onclick="openStockModal('${l.id}')">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/></svg>
          Stok
        </button>
        <button class="lac-btn lac-btn-delete" onclick="deleteUserListing('${l.id}')" title="Sil">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6m5 0V4h4v2"/></svg>
        </button>
      </div>
    </div>
  </div>`;
}

/* ════════════════════════════════════════════════════════════
   ELAN MODAL — HTML
   ════════════════════════════════════════════════════════════ */
function injectListingModal() {
  if (document.getElementById('listingFormOverlay')) return;
  document.body.insertAdjacentHTML('beforeend', `
  <!-- ELAN MODAL -->
  <div id="listingFormOverlay" class="lm-overlay" onclick="closeLMIfBg(event)">
    <div class="lm-modal" id="listingFormModal">

      <div class="lm-header">
        <div>
          <h3 class="lm-title" id="lmTitle">Yeni elan</h3>
          <p class="lm-subtitle" id="lmSubtitle">Məhsul məlumatlarını daxil edin</p>
        </div>
        <button class="lm-close-btn" onclick="closeListingModal()">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      <div class="lm-body">

        <!-- Şəkillər -->
        <div class="lm-section">
          <div class="lm-section-label">Şəkillər <span class="lm-hint">(maksimum 8)</span></div>
          <div id="lmImgPreviews" class="lm-img-previews"></div>
          <input type="file" id="lmImgInput" accept="image/*" multiple style="display:none" onchange="lmHandleImages(this.files)">
        </div>

        <!-- Mağaza adı + Ana Kateqoriya -->
        <div class="lm-row2">
          <div class="lm-field">
            <label class="lm-label">Mağaza adı</label>
            <input type="text" class="lm-input" id="lmStoreName" readonly placeholder="Yüklənir..." style="background:#f8f8f8;cursor:not-allowed;">
          </div>
          <div class="lm-field">
            <label class="lm-label">Ana Kateqoriya <span style="color:var(--danger)">*</span></label>
            <select class="lm-input lm-select" id="lmMainCategory" onchange="onMainCatChange()">
              <option value="">Seçin...</option>
            </select>
          </div>
        </div>

        <!-- Alt Kateqoriya -->
        <div class="lm-field lm-field-full" id="lmSubCatWrap" style="display:none;margin-bottom:0.75rem;">
          <label class="lm-label">Alt Kateqoriya</label>
          <select class="lm-input lm-select" id="lmSubCategory">
            <option value="">— Seçin —</option>
          </select>
        </div>

        <!-- Platforma Kateqoriyası (qruplaşdırılmış) -->
        <div class="lm-field lm-field-full" style="margin-bottom:0.75rem;">
          <label class="lm-label">Kateqoriya <span style="font-size:0.72rem;color:var(--muted);">(isteğe bağlı)</span></label>
          <select class="lm-input lm-select" id="lmPlatCategory" onchange="onPlatCatChange()">
            <option value="">— Seçin —</option>
          </select>
        </div>

        <!-- Marka (platforma kateqoriyasına bağlı) -->
        <div class="lm-field lm-field-full" id="lmBrandCatWrap" style="display:none;margin-bottom:0.75rem;">
          <label class="lm-label">Marka</label>
          <select class="lm-input lm-select" id="lmBrandCategory">
            <option value="">— Marka seçin —</option>
          </select>
        </div>

        <!-- Məhsul adı + Marka -->
        <div class="lm-row2">
          <div class="lm-field">
            <label class="lm-label">Məhsul adı <span style="color:var(--danger)">*</span></label>
            <input type="text" class="lm-input" id="lmName" placeholder="Məs: Slim fit cins şalvar">
          </div>
          <div class="lm-field">
            <label class="lm-label">Marka / Brend</label>
            <input type="text" class="lm-input" id="lmBrand" placeholder="Məs: Zara, H&M">
          </div>
        </div>

        <!-- Qiymət -->
        <div class="lm-row2">
          <div class="lm-field">
            <label class="lm-label">Qiymət (₼) <span style="color:var(--danger)">*</span></label>
            <input type="number" class="lm-input" id="lmPrice" placeholder="0.00" min="0" step="0.01">
          </div>
          <div class="lm-field">
            <label class="lm-label">Köhnə qiymət (₼) <span class="lm-hint">endirimsə</span></label>
            <input type="number" class="lm-input" id="lmOldPrice" placeholder="0.00" min="0" step="0.01">
          </div>
        </div>

        <!-- Açıqlama -->
        <div class="lm-field lm-field-full">
          <label class="lm-label">Açıqlama</label>
          <textarea class="lm-input lm-textarea" id="lmDesc" placeholder="Məhsul haqqında ətraflı məlumat: material, xüsusiyyətlər..."></textarea>
        </div>

        <!-- Material + Vəziyyət -->
        <div class="lm-row2">
          <div class="lm-field">
            <label class="lm-label">Material</label>
            <input type="text" class="lm-input" id="lmMaterial" placeholder="Məs: 100% pambıq">
          </div>
          <div class="lm-field">
            <label class="lm-label">Vəziyyəti</label>
            <select class="lm-input lm-select" id="lmCondition">
              <option value="new">Yeni</option>
              <option value="like_new">Yeni kimi</option>
              <option value="good">Yaxşı</option>
              <option value="used">İşlənmiş</option>
            </select>
          </div>
        </div>

        <div class="lm-divider"></div>

        <!-- RƏNGLƏR -->
        <div class="lm-section">
          <div class="lm-section-header">
            <div class="lm-section-label">Rənglər</div>
            <button type="button" class="lm-add-trigger" onclick="toggleColorPicker()">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
              Rəng əlavə et
            </button>
          </div>
          <div id="lmSelectedColors" class="lm-chips"></div>
          <div id="lmColorPicker" class="lm-color-picker" style="display:none;">
            <div class="lm-cp-presets">
              ${PRESET_COLORS.map(c => `
                <button type="button" class="lm-cp-swatch" style="background:${c.hex};${c.hex==='#FFFFFF'?'border:1.5px solid #ddd;':''}"
                  title="${c.name}" onclick="lmAddColor('${c.name}','${c.hex}')"></button>
              `).join('')}
            </div>
            <div class="lm-cp-custom">
              <div class="lm-cp-custom-preview" id="lmCpPreview" style="background:#E5E7EB;" onclick="document.getElementById('lmCpColorInput').click()"></div>
              <input type="color" id="lmCpColorInput" value="#E5E7EB"
                oninput="document.getElementById('lmCpPreview').style.background=this.value;document.getElementById('lmCpHexText').value=this.value"
                style="position:absolute;opacity:0;width:0;height:0;pointer-events:none;">
              <input type="text" class="lm-input lm-cp-hex" id="lmCpHexText" placeholder="#Rəng kodu" maxlength="7"
                oninput="if(this.value.startsWith('#')&&this.value.length===7){document.getElementById('lmCpPreview').style.background=this.value;document.getElementById('lmCpColorInput').value=this.value;}">
              <input type="text" class="lm-input lm-cp-name" id="lmCpName" placeholder="Rəng adı">
              <button type="button" class="lm-btn-sm lm-btn-primary" onclick="lmAddCustomColor()">Əlavə et</button>
            </div>
            <div style="display:flex;gap:.5rem;justify-content:flex-end;margin-top:.5rem;">
              <button type="button" class="lm-btn-sm lm-btn-outline" onclick="toggleColorPicker()">Bağla</button>
            </div>
          </div>
        </div>

        <div class="lm-divider"></div>

        <!-- ÖLÇÜLƏR & STOK -->
        <div class="lm-section">
          <div class="lm-section-header">
            <div class="lm-section-label">Ölçülər & Stok</div>
            <button type="button" class="lm-add-trigger" onclick="lmShowSizeInput()">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
              Ölçü əlavə et
            </button>
          </div>
          <p class="lm-hint-block">Hər ölçü üçün ayrıca stok sayı qeyd edin. Ölçü adını özünüz yazın (S, M, L / 36, 38 / Universal...).</p>
          <div id="lmSizeInputRow" class="lm-size-input-row" style="display:none;">
            <input type="text" class="lm-input lm-size-name-in" id="lmSizeName" placeholder="Ölçü (məs: M, 38, Universal)">
            <input type="number" class="lm-input lm-size-stock-in" id="lmSizeStock" placeholder="Stok" min="0">
            <button type="button" class="lm-btn-sm lm-btn-primary" onclick="lmAddSize()">Əlavə et</button>
            <button type="button" class="lm-btn-sm lm-btn-outline" onclick="document.getElementById('lmSizeInputRow').style.display='none'">Ləğv</button>
          </div>
          <div id="lmSizeList" class="lm-size-list"></div>
        </div>

        <div class="lm-divider"></div>

        <div class="lm-footer">
          <button type="button" class="lm-btn-outline-full" onclick="closeListingModal()">Ləğv et</button>
          <button type="button" class="lm-btn-submit" id="lmSubmitBtn" onclick="submitListing()">
            <span id="lmSubmitText">Elanı yayımla</span>
          </button>
        </div>
      </div>
    </div>
  </div>

  <!-- STOK MODAL -->
  <div id="stockModalOverlay" class="lm-overlay" onclick="closeStockIfBg(event)">
    <div class="lm-modal lm-modal-sm">
      <div class="lm-header">
        <div>
          <h3 class="lm-title">Stok idarəetməsi</h3>
          <p class="lm-subtitle" id="stockModalSubtitle">Ölçülər üzrə stok sayını yeniləyin</p>
        </div>
        <button class="lm-close-btn" onclick="closeStockModal()">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
      <div class="lm-body">
        <div id="stockModalBody"></div>
        <div class="lm-footer" style="margin-top:1rem;">
          <button type="button" class="lm-btn-outline-full" onclick="closeStockModal()">Ləğv et</button>
          <button type="button" class="lm-btn-submit" onclick="saveStock()">Yenilə</button>
        </div>
      </div>
    </div>
  </div>

  <!-- CROP MODAL -->
  <div id="lmCropOverlay" class="lm-crop-overlay">
    <div class="lm-crop-modal">

      <div class="lm-crop-header">
        <div class="lm-crop-header-left">
          <div class="lm-crop-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="6 2 6 8 2 8"/><polyline points="18 22 18 16 22 16"/>
              <path d="M2 8h16v12"/><path d="M6 2v16h16"/>
            </svg>
          </div>
          <div>
            <div class="lm-crop-title">Şəkili kəs</div>
            <div class="lm-crop-subtitle">Kart ölçüsünə uyğun sahəni seçin (3:4)</div>
          </div>
        </div>
        <button class="lm-close-btn" onclick="lmCropCancel()">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      <div class="lm-crop-body">
        <div class="lm-crop-viewport-wrap">
          <div class="lm-crop-viewport" id="lmCropViewport">
            <canvas id="lmCropCanvas"></canvas>
            <div class="lm-crop-frame" id="lmCropFrame">
              <div class="lm-crop-grid">
                <div class="lm-crop-grid-line lm-crop-grid-h" style="top:33.33%"></div>
                <div class="lm-crop-grid-line lm-crop-grid-h" style="top:66.66%"></div>
                <div class="lm-crop-grid-line lm-crop-grid-v" style="left:33.33%"></div>
                <div class="lm-crop-grid-line lm-crop-grid-v" style="left:66.66%"></div>
              </div>
              <div class="lm-crop-corner lm-crop-corner-tl"></div>
              <div class="lm-crop-corner lm-crop-corner-tr"></div>
              <div class="lm-crop-corner lm-crop-corner-bl"></div>
              <div class="lm-crop-corner lm-crop-corner-br"></div>
            </div>
          </div>
        </div>

        <div class="lm-crop-controls">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--muted);flex-shrink:0">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            <line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/>
          </svg>
          <input type="range" id="lmCropZoom" class="lm-crop-zoom-slider"
            min="100" max="300" value="100" step="1"
            oninput="lmCropSetZoom(this.value)">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--muted);flex-shrink:0">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <span class="lm-crop-zoom-val" id="lmCropZoomVal">100%</span>
          <button type="button" class="lm-btn-sm lm-btn-outline" onclick="lmCropReset()" style="margin-left:auto;">
            Sıfırla
          </button>
        </div>
      </div>

      <div class="lm-crop-footer">
        <button type="button" class="lm-btn-outline-full" onclick="lmCropCancel()">
          Ləğv et
        </button>
        <button type="button" class="lm-btn-submit" onclick="lmCropConfirm()">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="margin-right:6px">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          Kəs və əlavə et
        </button>
      </div>

    </div>
  </div>
  `);
}

/* ════════════════════════════════════════════════════════════
   MODAL AÇMA / BAĞLAMA
   ════════════════════════════════════════════════════════════ */
async function openListingModal(editId = null) {
  lState = { editingId: null, images: [], colors: [], sizes: [], colorPickerOpen: false };

  document.getElementById('lmTitle').textContent       = editId ? 'Elanı redaktə et' : 'Yeni elan';
  document.getElementById('lmSubtitle').textContent    = editId ? 'Məlumatları yeniləyin' : 'Məhsul məlumatlarını daxil edin';
  document.getElementById('lmSubmitText').textContent  = editId ? 'Yadda saxla' : 'Elanı yayımla';

  await lmFillStoreName();

  ['lmName','lmBrand','lmPrice','lmOldPrice','lmDesc','lmMaterial'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = '';
  });
  document.getElementById('lmMainCategory').value = '';
  document.getElementById('lmCondition').value    = 'new';
  document.getElementById('lmColorPicker').style.display = 'none';
  document.getElementById('lmSizeInputRow').style.display = 'none';
  document.getElementById('lmSubCatWrap').style.display = 'none';
  const platCatEl = document.getElementById('lmPlatCategory');
  if (platCatEl) platCatEl.value = '';
  if (document.getElementById('lmBrandCatWrap')) document.getElementById('lmBrandCatWrap').style.display = 'none';
  const brandCatEl = document.getElementById('lmBrandCategory');
  if (brandCatEl) brandCatEl.value = '';

  if (_listingMainCats.length === 0) { await loadListingCategories(); }
  buildMainCatSelect();
  buildPlatCatSelect();

  lmRenderImages();
  lmRenderColors();
  lmRenderSizes();

  if (editId) {
    lState.editingId = editId;
    const doc = await fbDb.collection('listings').doc(editId).get();
    if (doc.exists) {
      const d = doc.data();
      document.getElementById('lmName').value         = d.name         || '';
      document.getElementById('lmBrand').value        = d.brand        || '';
      document.getElementById('lmPrice').value        = d.price        || '';
      document.getElementById('lmOldPrice').value     = d.oldPrice     || '';
      document.getElementById('lmDesc').value         = d.desc         || '';
      document.getElementById('lmMaterial').value     = d.material     || '';
      document.getElementById('lmMainCategory').value = d.mainCategory || d.category || '';
      document.getElementById('lmCondition').value    = d.condition    || 'new';
      lState.images = d.imgs   || [];
      lState.colors = d.colors || [];
      lState.sizes  = d.sizes  || [];
      onMainCatChange();
      if (d.subCategory) {
        setTimeout(() => {
          const subSel = document.getElementById('lmSubCategory');
          if (subSel) subSel.value = d.subCategory;
        }, 50);
      }
      // Platforma kateqoriyası və markasını bərpa et
      if (d.platCategory) {
        setTimeout(() => {
          const platSel = document.getElementById('lmPlatCategory');
          if (platSel) {
            platSel.value = d.platCategory;
            onPlatCatChange();
            setTimeout(() => {
              const bSel = document.getElementById('lmBrandCategory');
              if (bSel && d.brandCategory) bSel.value = d.brandCategory;
            }, 50);
          }
        }, 50);
      }
      lmRenderImages();
      lmRenderColors();
      lmRenderSizes();
    }
  }

  document.getElementById('listingFormOverlay').classList.add('lm-open');
}

function openEditListing(id) { openListingModal(id); }
function closeListingModal() { document.getElementById('listingFormOverlay').classList.remove('lm-open'); }
function closeLMIfBg(e) { if (e.target.id === 'listingFormOverlay') closeListingModal(); }

async function lmFillStoreName() {
  const user = fbAuth.currentUser;
  if (!user) return;
  try {
    const vSnap = await fbDb.collection('vendors').doc(user.uid).get();
    const uSnap = await fbDb.collection('users').doc(user.uid).get();
    const storeName =
      (vSnap.exists && vSnap.data().storeName) ||
      (uSnap.exists && uSnap.data().storeName)  ||
      (uSnap.exists && ((uSnap.data().firstName||'')+' '+(uSnap.data().lastName||'')).trim()) ||
      user.displayName || '';
    document.getElementById('lmStoreName').value = storeName;
  } catch(e) {}
}

/* ════════════════════════════════════════════════════════════
   ŞƏKİL — CROP İLƏ (YENİLƏNİB)
   ════════════════════════════════════════════════════════════ */

/**
 * İstifadəçi fayl seçəndə çağırılır.
 * Hər şəkil üçün ardıcıl crop modal açılır.
 * Onaylamadan əvvəl lState.images-ə əlavə edilmir.
 */
function lmHandleImages(files) {
  const fileArr = Array.from(files).filter(f => f.type.startsWith('image/'));
  if (!fileArr.length) return;

  // Input-u sıfırla ki eyni fayl yenidən seçilə bilsin
  const inp = document.getElementById('lmImgInput');
  if (inp) inp.value = '';

  _processCropQueue(fileArr, 0);
}

function _processCropQueue(queue, index) {
  if (index >= queue.length) return;

  if (lState.images.length >= 8) {
    showToast('Maksimum 8 şəkil əlavə edə bilərsiniz');
    return;
  }

  const reader = new FileReader();
  reader.onload = e => {
    lmOpenCrop(e.target.result, croppedDataUrl => {
      if (croppedDataUrl) {
        lState.images.push(croppedDataUrl);
        lmRenderImages();
      }
      // Növbəti faylı işlə (ləğv edilsə də növbəti açılır)
      _processCropQueue(queue, index + 1);
    });
  };
  reader.readAsDataURL(queue[index]);
}

function lmRenderImages() {
  const wrap = document.getElementById('lmImgPreviews');
  if (!wrap) return;
  wrap.innerHTML = '';
  lState.images.forEach((src, i) => {
    const div = document.createElement('div');
    div.className = 'lm-img-thumb';
    div.innerHTML = `
      <img src="${src}" alt="şəkil">
      <button type="button" class="lm-img-rm" onclick="lmRemoveImg(${i})">✕</button>
      ${i === 0 ? '<span class="lm-img-main">Əsas</span>' : ''}
    `;
    wrap.appendChild(div);
  });
  if (lState.images.length < 8) {
    const add = document.createElement('label');
    add.className = 'lm-img-add';
    add.htmlFor   = 'lmImgInput';
    add.innerHTML = `
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
        <rect x="3" y="3" width="18" height="18" rx="3"/>
        <line x1="12" y1="8" x2="12" y2="16"/>
        <line x1="8" y1="12" x2="16" y2="12"/>
      </svg>
      <span>${lState.images.length}/8</span>
    `;
    wrap.appendChild(add);
  }
}

function lmRemoveImg(i) { lState.images.splice(i, 1); lmRenderImages(); }

/* ════════════════════════════════════════════════════════════
   CROP — AÇMA
   ════════════════════════════════════════════════════════════ */
function lmOpenCrop(dataUrl, callback) {
  _crop.callback = callback;
  _crop.zoom     = 1;
  _crop.panX     = 0;
  _crop.panY     = 0;

  const img = new Image();
  img.onload = () => {
    _crop.img  = img;
    _crop.natW = img.naturalWidth;
    _crop.natH = img.naturalHeight;
    _cropSetupViewport();
    _cropDraw();
    _cropBindDrag();
  };
  img.src = dataUrl;

  document.getElementById('lmCropOverlay').classList.add('lm-open');
  document.getElementById('lmCropZoom').value = 100;
  document.getElementById('lmCropZoomVal').textContent = '100%';
}

function _cropSetupViewport() {
  const vp = document.getElementById('lmCropViewport');

  _crop.vpW = vp.offsetWidth  || 460;
  _crop.vpH = vp.offsetHeight || 420;

  // Crop frame: viewport-un 85%-i, 3:4 nisbətinə görə
  const maxFrameW = _crop.vpW * 0.85;
  const maxFrameH = _crop.vpH * 0.85;

  if (maxFrameW / CROP_RATIO <= maxFrameH) {
    _crop.frameW = maxFrameW;
    _crop.frameH = maxFrameW / CROP_RATIO;
  } else {
    _crop.frameH = maxFrameH;
    _crop.frameW = maxFrameH * CROP_RATIO;
  }

  // Frame mövqeyi (mərkəzdə)
  const frame = document.getElementById('lmCropFrame');
  const fLeft = (_crop.vpW - _crop.frameW) / 2;
  const fTop  = (_crop.vpH - _crop.frameH) / 2;
  frame.style.width  = _crop.frameW + 'px';
  frame.style.height = _crop.frameH + 'px';
  frame.style.left   = fLeft + 'px';
  frame.style.top    = fTop  + 'px';

  // Canvas ölçüsü = viewport ölçüsü
  const canvas = document.getElementById('lmCropCanvas');
  canvas.width  = _crop.vpW;
  canvas.height = _crop.vpH;

  _cropResetPan();
}

function _cropResetPan() {
  const scaleToFit = Math.max(
    _crop.frameW / _crop.natW,
    _crop.frameH / _crop.natH
  );
  const scaledW = _crop.natW * scaleToFit * _crop.zoom;
  const scaledH = _crop.natH * scaleToFit * _crop.zoom;

  const fLeft = (_crop.vpW - _crop.frameW) / 2;
  const fTop  = (_crop.vpH - _crop.frameH) / 2;

  _crop.panX = fLeft + (_crop.frameW - scaledW) / 2;
  _crop.panY = fTop  + (_crop.frameH - scaledH) / 2;
}

function _cropDraw() {
  const canvas = document.getElementById('lmCropCanvas');
  if (!canvas || !_crop.img) return;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, _crop.vpW, _crop.vpH);

  const scaleToFit = Math.max(
    _crop.frameW / _crop.natW,
    _crop.frameH / _crop.natH
  );
  const scaledW = _crop.natW * scaleToFit * _crop.zoom;
  const scaledH = _crop.natH * scaleToFit * _crop.zoom;

  ctx.drawImage(_crop.img, _crop.panX, _crop.panY, scaledW, scaledH);

  // Frame xaricini karalt
  const fLeft = (_crop.vpW - _crop.frameW) / 2;
  const fTop  = (_crop.vpH - _crop.frameH) / 2;

  ctx.fillStyle = 'rgba(0,0,0,0.52)';
  ctx.fillRect(0, 0, _crop.vpW, fTop);
  ctx.fillRect(0, fTop + _crop.frameH, _crop.vpW, _crop.vpH - fTop - _crop.frameH);
  ctx.fillRect(0, fTop, fLeft, _crop.frameH);
  ctx.fillRect(fLeft + _crop.frameW, fTop, _crop.vpW - fLeft - _crop.frameW, _crop.frameH);
}

function _cropClampPan() {
  const scaleToFit = Math.max(
    _crop.frameW / _crop.natW,
    _crop.frameH / _crop.natH
  );
  const scaledW = _crop.natW * scaleToFit * _crop.zoom;
  const scaledH = _crop.natH * scaleToFit * _crop.zoom;

  const fLeft = (_crop.vpW - _crop.frameW) / 2;
  const fTop  = (_crop.vpH - _crop.frameH) / 2;

  _crop.panX = Math.min(fLeft, Math.max(fLeft + _crop.frameW - scaledW, _crop.panX));
  _crop.panY = Math.min(fTop,  Math.max(fTop  + _crop.frameH - scaledH, _crop.panY));
}

/* ── Drag (mouse) ── */
function _cropBindDrag() {
  const vp = document.getElementById('lmCropViewport');
  vp.onmousedown  = _cropMouseDown;
  vp.ontouchstart = _cropTouchStart;
}

function _cropMouseDown(e) {
  e.preventDefault();
  _crop.dragging      = true;
  _crop.dragStartX    = e.clientX;
  _crop.dragStartY    = e.clientY;
  _crop.dragStartPanX = _crop.panX;
  _crop.dragStartPanY = _crop.panY;
  document.onmousemove = _cropMouseMove;
  document.onmouseup   = _cropMouseUp;
}

function _cropMouseMove(e) {
  if (!_crop.dragging) return;
  _crop.panX = _crop.dragStartPanX + (e.clientX - _crop.dragStartX);
  _crop.panY = _crop.dragStartPanY + (e.clientY - _crop.dragStartY);
  _cropClampPan();
  _cropDraw();
}

function _cropMouseUp() {
  _crop.dragging = false;
  document.onmousemove = null;
  document.onmouseup   = null;
}

/* ── Drag (touch) ── */
function _cropTouchStart(e) {
  if (e.touches.length !== 1) return;
  const t = e.touches[0];
  _crop.dragging      = true;
  _crop.dragStartX    = t.clientX;
  _crop.dragStartY    = t.clientY;
  _crop.dragStartPanX = _crop.panX;
  _crop.dragStartPanY = _crop.panY;
  document.ontouchmove = _cropTouchMove;
  document.ontouchend  = _cropTouchEnd;
}

function _cropTouchMove(e) {
  if (!_crop.dragging || e.touches.length !== 1) return;
  e.preventDefault();
  const t = e.touches[0];
  _crop.panX = _crop.dragStartPanX + (t.clientX - _crop.dragStartX);
  _crop.panY = _crop.dragStartPanY + (t.clientY - _crop.dragStartY);
  _cropClampPan();
  _cropDraw();
}

function _cropTouchEnd() {
  _crop.dragging = false;
  document.ontouchmove = null;
  document.ontouchend  = null;
}

/* ════════════════════════════════════════════════════════════
   CROP — ZOOM, RESET, CONFIRM, CANCEL
   ════════════════════════════════════════════════════════════ */
function lmCropSetZoom(val) {
  const newZoom = parseInt(val) / 100;
  const scaleToFit = Math.max(_crop.frameW / _crop.natW, _crop.frameH / _crop.natH);

  const oldW = _crop.natW * scaleToFit * _crop.zoom;
  const oldH = _crop.natH * scaleToFit * _crop.zoom;
  const newW = _crop.natW * scaleToFit * newZoom;
  const newH = _crop.natH * scaleToFit * newZoom;

  // Mərkəzi sabit saxla
  const cx = _crop.vpW / 2;
  const cy = _crop.vpH / 2;
  _crop.panX = cx - (cx - _crop.panX) * (newW / oldW);
  _crop.panY = cy - (cy - _crop.panY) * (newH / oldH);

  _crop.zoom = newZoom;
  _cropClampPan();
  _cropDraw();
  document.getElementById('lmCropZoomVal').textContent = val + '%';
}

function lmCropReset() {
  _crop.zoom = 1;
  _cropResetPan();
  _cropDraw();
  document.getElementById('lmCropZoom').value = 100;
  document.getElementById('lmCropZoomVal').textContent = '100%';
}

function lmCropConfirm() {
  if (!_crop.img) return;

  // Çıxış ölçüsü: 600×800 (3:4, yüksək keyfiyyət)
  const OUT_W = 600, OUT_H = 800;
  const outCanvas = document.createElement('canvas');
  outCanvas.width  = OUT_W;
  outCanvas.height = OUT_H;
  const outCtx = outCanvas.getContext('2d');

  const scaleToFit = Math.max(_crop.frameW / _crop.natW, _crop.frameH / _crop.natH);
  const scaledW = _crop.natW * scaleToFit * _crop.zoom;
  const scaledH = _crop.natH * scaleToFit * _crop.zoom;

  const fLeft = (_crop.vpW - _crop.frameW) / 2;
  const fTop  = (_crop.vpH - _crop.frameH) / 2;

  // Şəkildə crop frame-ə düşən hissəni hesabla
  const srcX = (fLeft - _crop.panX) / scaledW * _crop.natW;
  const srcY = (fTop  - _crop.panY) / scaledH * _crop.natH;
  const srcW = (_crop.frameW / scaledW) * _crop.natW;
  const srcH = (_crop.frameH / scaledH) * _crop.natH;

  outCtx.drawImage(_crop.img, srcX, srcY, srcW, srcH, 0, 0, OUT_W, OUT_H);

  const result = outCanvas.toDataURL('image/jpeg', 0.88);
  _closeCropModal();
  if (_crop.callback) _crop.callback(result);
}

function lmCropCancel() {
  _closeCropModal();
  if (_crop.callback) _crop.callback(null);
}

function _closeCropModal() {
  const overlay = document.getElementById('lmCropOverlay');
  if (overlay) overlay.classList.remove('lm-open');
  document.onmousemove = null;
  document.onmouseup   = null;
  document.ontouchmove = null;
  document.ontouchend  = null;
}

/* ════════════════════════════════════════════════════════════
   RƏNGLƏR
   ════════════════════════════════════════════════════════════ */
function toggleColorPicker() {
  const cp = document.getElementById('lmColorPicker');
  lState.colorPickerOpen = !lState.colorPickerOpen;
  cp.style.display = lState.colorPickerOpen ? 'block' : 'none';
}

function lmAddColor(name, hex) {
  if (lState.colors.some(c => c.hex === hex)) { showToast('Bu rəng artıq əlavə edilib'); return; }
  lState.colors.push({ name, hex });
  lmRenderColors();
}

function lmAddCustomColor() {
  const hex  = document.getElementById('lmCpColorInput').value.trim();
  const name = document.getElementById('lmCpName').value.trim() || 'Xüsusi rəng';
  if (!hex) { showToast('Rəng seçin'); return; }
  lmAddColor(name, hex);
  document.getElementById('lmCpName').value = '';
}

function lmRemoveColor(i) { lState.colors.splice(i, 1); lmRenderColors(); }

function lmRenderColors() {
  const wrap = document.getElementById('lmSelectedColors');
  if (!wrap) return;
  wrap.innerHTML = lState.colors.length
    ? lState.colors.map((c, i) => `
        <div class="lm-color-chip">
          <span class="lm-cc-swatch" style="background:${c.hex};${c.hex==='#FFFFFF'?'border:1px solid #ccc;':''}"></span>
          <span class="lm-cc-name">${c.name}</span>
          <button type="button" class="lm-cc-rm" onclick="lmRemoveColor(${i})">✕</button>
        </div>`).join('')
    : '<p class="lm-hint-block" style="margin:0;">Hər hansı rəng əlavə etməyibsiniz</p>';
}

/* ════════════════════════════════════════════════════════════
   ÖLÇÜLƏR
   ════════════════════════════════════════════════════════════ */
function lmShowSizeInput() {
  document.getElementById('lmSizeInputRow').style.display = 'flex';
  document.getElementById('lmSizeName').focus();
}

function lmAddSize() {
  const label = document.getElementById('lmSizeName').value.trim();
  const stock = parseInt(document.getElementById('lmSizeStock').value) || 0;
  if (!label) { showToast('Ölçü adını daxil edin'); return; }
  if (lState.sizes.some(s => s.label.toLowerCase() === label.toLowerCase())) { showToast('Bu ölçü artıq var'); return; }
  lState.sizes.push({ label, stock });
  document.getElementById('lmSizeName').value  = '';
  document.getElementById('lmSizeStock').value = '';
  document.getElementById('lmSizeInputRow').style.display = 'none';
  lmRenderSizes();
}

function lmRemoveSize(i) { lState.sizes.splice(i, 1); lmRenderSizes(); }
function lmUpdateSizeStock(i, val) { lState.sizes[i].stock = parseInt(val) || 0; }

function lmRenderSizes() {
  const wrap = document.getElementById('lmSizeList');
  if (!wrap) return;
  wrap.innerHTML = lState.sizes.length
    ? lState.sizes.map((s, i) => `
        <div class="lm-size-row">
          <span class="lm-size-label">${s.label}</span>
          <div class="lm-size-stock-wrap">
            <button type="button" class="lm-stock-btn" onclick="lmStepStock(${i},-1)">−</button>
            <input type="number" class="lm-stock-input" value="${s.stock}" min="0"
              onchange="lmUpdateSizeStock(${i},this.value)" oninput="lmUpdateSizeStock(${i},this.value)">
            <button type="button" class="lm-stock-btn" onclick="lmStepStock(${i},1)">+</button>
          </div>
          <span class="lm-size-unit">ədəd</span>
          <button type="button" class="lm-size-rm" onclick="lmRemoveSize(${i})">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>`).join('')
    : '<p class="lm-hint-block" style="margin:0;">Hər hansı ölçü əlavə etməyibsiniz</p>';
}

function lmStepStock(i, delta) {
  lState.sizes[i].stock = Math.max(0, (lState.sizes[i].stock || 0) + delta);
  lmRenderSizes();
}

/* ════════════════════════════════════════════════════════════
   SUBMIT
   ════════════════════════════════════════════════════════════ */
async function submitListing() {
  const name         = document.getElementById('lmName').value.trim();
  const price        = parseFloat(document.getElementById('lmPrice').value);
  const mainCatId    = document.getElementById('lmMainCategory').value;
  const subCategory  = document.getElementById('lmSubCategory')?.value || '';
  const platCategory = document.getElementById('lmPlatCategory')?.value || '';
  const brandCategory= document.getElementById('lmBrandCategory')?.value || '';

  if (!name)              { showToast('Məhsul adını daxil edin'); return; }
  if (!price || price<=0) { showToast('Düzgün qiymət daxil edin'); return; }
  if (!mainCatId)         { showToast('Ana kateqoriya seçin'); return; }

  const btn  = document.getElementById('lmSubmitBtn');
  const span = document.getElementById('lmSubmitText');
  btn.disabled     = true;
  span.textContent = lState.editingId ? 'Yenilənir...' : 'Əlavə edilir...';

  const oldPriceRaw = parseFloat(document.getElementById('lmOldPrice').value);
  const mainCat     = _listingMainCats.find(c => c.id === mainCatId);

  // platCategory label-ini tap
  let platCatLabel = '';
  let brandCatLabel = brandCategory;
  if (platCategory) {
    for (const grp of _listingPlatCats) {
      const sub = (grp.subCats || []).find(s => s.id === platCategory);
      if (sub) { platCatLabel = sub.label; break; }
    }
  }

  const payload = {
    name,
    brand:          document.getElementById('lmBrand').value.trim(),
    price,
    oldPrice:       (oldPriceRaw > price) ? oldPriceRaw : null,
    desc:           document.getElementById('lmDesc').value.trim(),
    material:       document.getElementById('lmMaterial').value.trim(),
    condition:      document.getElementById('lmCondition').value,
    mainCategory:   mainCatId,
    categoryLabel:  mainCat ? mainCat.label : '',
    subCategory,
    platCategory,
    platCatLabel,
    brandCategory:  brandCatLabel,
    category:       mainCatId,
    badge:          (oldPriceRaw > price) ? 'Endirim' : 'Yeni',
    imgs:           lState.images,
    colors:         lState.colors,
    sizes:          lState.sizes,
    userId:         fbAuth.currentUser.uid,
    userEmail:      fbAuth.currentUser.email,
    storeName:      document.getElementById('lmStoreName').value,
    updatedAt:      firebase.firestore.FieldValue.serverTimestamp(),
  };

  try {
    if (lState.editingId) {
      await fbDb.collection('listings').doc(lState.editingId).update(payload);
      showToast('Elan yeniləndi ✓');
    } else {
      payload.createdAt = firebase.firestore.FieldValue.serverTimestamp();
      await fbDb.collection('listings').add(payload);
      showToast('Elan əlavə edildi ✓');
    }
    closeListingModal();
    fetchUserListings(fbAuth.currentUser.uid);
  } catch(err) {
    showToast('Xəta: ' + err.message);
  } finally {
    btn.disabled     = false;
    span.textContent = lState.editingId ? 'Yadda saxla' : 'Elanı yayımla';
  }
}

/* ════════════════════════════════════════════════════════════
   SİLMƏ
   ════════════════════════════════════════════════════════════ */
async function deleteUserListing(id) {
  if (!confirm('Bu elanı silmək istəyirsiniz?')) return;
  try {
    await fbDb.collection('listings').doc(id).delete();
    showToast('Elan silindi');
    fetchUserListings(fbAuth.currentUser.uid);
  } catch(err) {
    showToast('Silinmədi: ' + err.message);
  }
}

/* ════════════════════════════════════════════════════════════
   STOK MODAL
   ════════════════════════════════════════════════════════════ */
let stockEditId = null, stockEditData = null;

async function openStockModal(id) {
  stockEditId = id;
  const doc = await fbDb.collection('listings').doc(id).get();
  if (!doc.exists) { showToast('Elan tapılmadı'); return; }
  stockEditData = doc.data();
  const sizes = stockEditData.sizes || [];
  document.getElementById('stockModalSubtitle').textContent = stockEditData.name || '';
  document.getElementById('stockModalBody').innerHTML = sizes.length
    ? sizes.map((s, i) => `
        <div class="lm-size-row" style="margin-bottom:.75rem;">
          <span class="lm-size-label">${s.label}</span>
          <div class="lm-size-stock-wrap">
            <button type="button" class="lm-stock-btn" onclick="smStep(${i},-1)">−</button>
            <input type="number" class="lm-stock-input" id="sm-stock-${i}" value="${s.stock}" min="0">
            <button type="button" class="lm-stock-btn" onclick="smStep(${i},1)">+</button>
          </div>
          <span class="lm-size-unit">ədəd</span>
        </div>`).join('')
    : '<p style="color:var(--muted);font-size:.875rem;text-align:center;padding:1rem 0;">Bu elana ölçü əlavə edilməyib.<br>Elanı redaktə edərək ölçü əlavə edin.</p>';
  document.getElementById('stockModalOverlay').classList.add('lm-open');
}

function smStep(i, delta) {
  const inp = document.getElementById(`sm-stock-${i}`);
  if (inp) inp.value = Math.max(0, (parseInt(inp.value) || 0) + delta);
}

async function saveStock() {
  if (!stockEditId || !stockEditData) return;
  const sizes = (stockEditData.sizes || []).map((s, i) => ({
    ...s,
    stock: parseInt(document.getElementById(`sm-stock-${i}`)?.value) || 0
  }));
  try {
    await fbDb.collection('listings').doc(stockEditId).update({
      sizes,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    showToast('Stok yeniləndi ✓');
    closeStockModal();
    fetchUserListings(fbAuth.currentUser.uid);
  } catch(err) { showToast('Xəta: ' + err.message); }
}

function closeStockModal() {
  document.getElementById('stockModalOverlay').classList.remove('lm-open');
  stockEditId = null;
  stockEditData = null;
}
function closeStockIfBg(e) { if (e.target.id === 'stockModalOverlay') closeStockModal(); }

/* ════════════════════════════════════════════════════════════
   STİLLƏR
   ════════════════════════════════════════════════════════════ */
function injectListingStyles() {
  if (document.getElementById('listingsStyles')) return;
  const style = document.createElement('style');
  style.id = 'listingsStyles';
  style.textContent = `
  .lst-header-row{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:1rem;}
  .lst-sub{color:var(--muted);font-size:0.82rem;margin-top:0.25rem;}
  .lst-add-btn{display:inline-flex;align-items:center;gap:.5rem;}
  .lst-empty{text-align:center;padding:3rem 1rem;}
  .lst-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:1.25rem;padding:1.5rem;background:var(--card,#fff);border:1px solid var(--border);border-radius:12px;}
  .lac-card{border:1px solid var(--border);border-radius:12px;overflow:hidden;background:var(--bg,#faf9f7);transition:box-shadow .2s,transform .2s;}
  .lac-card:hover{box-shadow:0 6px 24px rgba(0,0,0,.09);transform:translateY(-2px);}
  .lac-img-wrap{position:relative;aspect-ratio:3/4;background:#f0ece6;overflow:hidden;}
  .lac-img-wrap img{width:100%;height:100%;object-fit:cover;}
  .lac-img-placeholder{width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:3rem;}
  .lac-status-badge{position:absolute;bottom:8px;left:8px;font-size:.68rem;font-weight:600;padding:3px 10px;border-radius:20px;}
  .lac-active{background:#dcfce7;color:#166534;}.lac-out{background:#fee2e2;color:#991b1b;}
  .lac-body{padding:12px 14px 14px;}
  .lac-brand{font-size:.68rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#b07a4a;margin-bottom:3px;}
  .lac-name{font-size:.88rem;font-weight:500;line-height:1.4;margin-bottom:6px;}
  .lac-price-row{display:flex;align-items:baseline;gap:.5rem;margin-bottom:8px;}
  .lac-price{font-size:.95rem;font-weight:700;}.lac-sale{color:#dc2626;}
  .lac-old-price{font-size:.76rem;color:var(--muted);text-decoration:line-through;}
  .lac-colors-row{display:flex;align-items:center;gap:4px;margin-bottom:8px;flex-wrap:wrap;}
  .lac-color-dot{width:14px;height:14px;border-radius:50%;flex-shrink:0;}
  .lac-colors-more{font-size:.68rem;color:var(--muted);}
  .lac-cat-tag{display:inline-block;font-size:.68rem;background:var(--tag-bg,#f2ede8);padding:2px 8px;border-radius:20px;margin-bottom:10px;color:var(--muted);}
  .lac-actions{display:flex;gap:.4rem;}
  .lac-btn{display:inline-flex;align-items:center;gap:.3rem;padding:.35rem .6rem;border-radius:6px;font-size:.72rem;font-weight:500;border:none;cursor:pointer;transition:all .15s;}
  .lac-btn-edit{background:#eff6ff;color:#1d4ed8;}.lac-btn-edit:hover{background:#dbeafe;}
  .lac-btn-stock{background:#f0fdf4;color:#166534;}.lac-btn-stock:hover{background:#dcfce7;}
  .lac-btn-delete{background:#fef2f2;color:#dc2626;margin-left:auto;}.lac-btn-delete:hover{background:#fee2e2;}

  .lm-overlay{position:fixed;inset:0;z-index:500;background:rgba(15,10,5,.55);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;opacity:0;pointer-events:none;transition:opacity .3s;padding:1rem;}
  .lm-overlay.lm-open{opacity:1;pointer-events:all;}
  .lm-modal{background:#fff;border-radius:20px;width:100%;max-width:640px;max-height:90vh;overflow-y:auto;box-shadow:0 24px 80px rgba(0,0,0,.18);transform:translateY(30px) scale(.97);transition:transform .35s cubic-bezier(.34,1.56,.64,1);}
  .lm-overlay.lm-open .lm-modal{transform:translateY(0) scale(1);}
  .lm-modal-sm{max-width:420px;}
  .lm-header{display:flex;align-items:flex-start;justify-content:space-between;padding:1.5rem 1.75rem 0;}
  .lm-title{font-family:'Playfair Display',serif;font-size:1.2rem;font-weight:600;}
  .lm-subtitle{font-size:.78rem;color:var(--muted);margin-top:.2rem;}
  .lm-close-btn{width:34px;height:34px;border-radius:50%;border:1px solid var(--border);background:var(--bg);display:flex;align-items:center;justify-content:center;cursor:pointer;color:var(--muted);flex-shrink:0;transition:background .2s,color .2s;}
  .lm-close-btn:hover{background:var(--border);color:var(--accent);}
  .lm-body{padding:1.25rem 1.75rem 1.75rem;}
  .lm-section{margin-bottom:.25rem;}
  .lm-section-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:.75rem;}
  .lm-section-label{font-size:.82rem;font-weight:600;color:var(--accent);}
  .lm-divider{height:1px;background:var(--border);margin:1.25rem 0;}
  .lm-hint{font-size:.74rem;color:var(--muted);font-weight:400;}
  .lm-hint-block{font-size:.76rem;color:var(--muted);margin-bottom:.75rem;line-height:1.5;}
  .lm-row2{display:grid;grid-template-columns:1fr 1fr;gap:.75rem;margin-bottom:.75rem;}
  .lm-field{display:flex;flex-direction:column;gap:.35rem;}
  .lm-field-full{margin-bottom:.75rem;}
  .lm-label{font-size:.76rem;font-weight:500;color:#555;}
  .lm-input{padding:.6rem .85rem;border:1.5px solid var(--border);border-radius:8px;font-family:'DM Sans',sans-serif;font-size:.875rem;color:var(--accent);background:var(--bg);outline:none;transition:border-color .2s;width:100%;}
  .lm-input:focus{border-color:var(--accent);background:#fff;}
  .lm-select{-webkit-appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%23888' stroke-width='1.5' fill='none'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right .75rem center;padding-right:2rem;}
  .lm-textarea{resize:vertical;min-height:90px;}
  .lm-img-previews{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:1rem;}
  .lm-img-thumb{position:relative;width:76px;height:76px;border-radius:10px;overflow:hidden;border:1px solid var(--border);}
  .lm-img-thumb img{width:100%;height:100%;object-fit:cover;}
  .lm-img-rm{position:absolute;top:3px;right:3px;width:20px;height:20px;border-radius:50%;background:rgba(0,0,0,.6);color:#fff;border:none;cursor:pointer;font-size:.6rem;display:flex;align-items:center;justify-content:center;}
  .lm-img-main{position:absolute;bottom:3px;left:3px;font-size:.58rem;font-weight:600;background:rgba(0,0,0,.55);color:#fff;padding:1px 5px;border-radius:4px;}
  .lm-img-add{width:76px;height:76px;border:1.5px dashed #ccc;border-radius:10px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;cursor:pointer;color:#aaa;font-size:.7rem;transition:border-color .2s,color .2s;}
  .lm-img-add:hover{border-color:var(--accent);color:var(--accent);}
  .lm-add-trigger{display:inline-flex;align-items:center;gap:.35rem;padding:.35rem .75rem;border-radius:8px;border:1.5px solid var(--border);background:none;font-size:.76rem;font-weight:500;color:var(--muted);cursor:pointer;transition:all .15s;}
  .lm-add-trigger:hover{border-color:var(--accent);color:var(--accent);}
  .lm-color-picker{background:var(--bg);border:1px solid var(--border);border-radius:12px;padding:1rem;margin-top:.75rem;}
  .lm-cp-presets{display:grid;grid-template-columns:repeat(8,1fr);gap:6px;margin-bottom:.85rem;}
  .lm-cp-swatch{width:100%;aspect-ratio:1;border-radius:50%;border:2px solid transparent;cursor:pointer;transition:transform .15s,border-color .15s;}
  .lm-cp-swatch:hover{transform:scale(1.2);border-color:var(--accent);}
  .lm-cp-custom{display:flex;align-items:center;gap:.5rem;flex-wrap:wrap;padding-top:.75rem;border-top:1px solid var(--border);}
  .lm-cp-custom-preview{width:36px;height:36px;border-radius:50%;flex-shrink:0;border:1.5px solid var(--border);cursor:pointer;transition:transform .15s;}
  .lm-cp-custom-preview:hover{transform:scale(1.1);}
  .lm-cp-hex{width:110px!important;font-size:.78rem!important;padding:.45rem .65rem!important;}
  .lm-cp-name{flex:1;min-width:90px;font-size:.78rem!important;padding:.45rem .65rem!important;}
  .lm-chips{display:flex;flex-wrap:wrap;gap:.5rem;margin-top:.5rem;min-height:28px;}
  .lm-color-chip{display:inline-flex;align-items:center;gap:.35rem;background:var(--bg);border:1px solid var(--border);border-radius:20px;padding:.25rem .65rem .25rem .4rem;font-size:.76rem;}
  .lm-cc-swatch{width:14px;height:14px;border-radius:50%;flex-shrink:0;}
  .lm-cc-rm{background:none;border:none;cursor:pointer;color:var(--muted);font-size:.7rem;padding:0;line-height:1;}
  .lm-cc-rm:hover{color:#dc2626;}
  .lm-size-input-row{display:flex;align-items:center;gap:.5rem;flex-wrap:wrap;margin-bottom:.75rem;}
  .lm-size-name-in{width:140px;}.lm-size-stock-in{width:90px;}
  .lm-size-list{display:flex;flex-direction:column;gap:.5rem;}
  .lm-size-row{display:flex;align-items:center;gap:.75rem;background:var(--bg);border:1px solid var(--border);border-radius:10px;padding:.6rem 1rem;}
  .lm-size-label{font-weight:600;font-size:.88rem;min-width:60px;}
  .lm-size-stock-wrap{display:flex;align-items:center;gap:.35rem;}
  .lm-stock-btn{width:28px;height:28px;border-radius:6px;border:1.5px solid var(--border);background:#fff;font-size:1rem;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .15s;}
  .lm-stock-btn:hover{border-color:var(--accent);color:var(--accent);}
  .lm-stock-input{width:64px;text-align:center;padding:.4rem .5rem;border:1.5px solid var(--border);border-radius:6px;font-size:.875rem;font-weight:600;outline:none;}
  .lm-stock-input:focus{border-color:var(--accent);}
  .lm-size-unit{font-size:.72rem;color:var(--muted);}
  .lm-size-rm{margin-left:auto;width:24px;height:24px;border-radius:50%;background:none;border:none;cursor:pointer;color:var(--muted);display:flex;align-items:center;justify-content:center;transition:color .15s,background .15s;}
  .lm-size-rm:hover{color:#dc2626;background:#fef2f2;}
  .lm-btn-sm{padding:.4rem .85rem;border-radius:7px;font-size:.78rem;font-weight:500;cursor:pointer;white-space:nowrap;transition:all .15s;}
  .lm-btn-primary{background:var(--accent,#1a1a1a);color:#fff;border:none;}.lm-btn-primary:hover{opacity:.85;}
  .lm-btn-outline{background:none;border:1.5px solid var(--border);color:var(--muted);}.lm-btn-outline:hover{border-color:var(--accent);color:var(--accent);}
  .lm-footer{display:flex;gap:.75rem;}
  .lm-btn-outline-full{flex:1;padding:.75rem;border-radius:10px;border:1.5px solid var(--border);background:none;font-size:.875rem;font-weight:500;cursor:pointer;transition:all .15s;}
  .lm-btn-outline-full:hover{border-color:var(--accent);color:var(--accent);}
  .lm-btn-submit{flex:2;padding:.75rem;border-radius:10px;background:var(--accent,#1a1a1a);color:#fff;border:none;font-size:.9rem;font-weight:600;cursor:pointer;transition:opacity .2s;display:inline-flex;align-items:center;justify-content:center;}
  .lm-btn-submit:hover{opacity:.88;}.lm-btn-submit:disabled{opacity:.5;cursor:not-allowed;}

  /* ══════════════════════════════
     CROP MODAL STİLLƏRİ
  ══════════════════════════════ */
  .lm-crop-overlay{position:fixed;inset:0;z-index:600;background:rgba(10,8,5,.75);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;opacity:0;pointer-events:none;transition:opacity .3s;padding:1rem;}
  .lm-crop-overlay.lm-open{opacity:1;pointer-events:all;}
  .lm-crop-modal{background:#fff;border-radius:20px;width:100%;max-width:520px;box-shadow:0 32px 96px rgba(0,0,0,.24);transform:translateY(24px) scale(.97);transition:transform .35s cubic-bezier(.34,1.56,.64,1);overflow:hidden;}
  .lm-crop-overlay.lm-open .lm-crop-modal{transform:translateY(0) scale(1);}
  .lm-crop-header{display:flex;align-items:center;justify-content:space-between;padding:1.25rem 1.5rem 1rem;border-bottom:1px solid var(--border);}
  .lm-crop-header-left{display:flex;align-items:center;gap:.75rem;}
  .lm-crop-icon{width:36px;height:36px;background:var(--bg,#f7f4f0);border:1px solid var(--border);border-radius:10px;display:flex;align-items:center;justify-content:center;color:var(--accent);flex-shrink:0;}
  .lm-crop-title{font-family:'Playfair Display',serif;font-size:1rem;font-weight:600;color:var(--accent);}
  .lm-crop-subtitle{font-size:.72rem;color:var(--muted);margin-top:.1rem;}
  .lm-crop-body{padding:1.25rem 1.5rem;}
  .lm-crop-viewport-wrap{border-radius:14px;overflow:hidden;border:1.5px solid var(--border);background:#0a0a0a;margin-bottom:1rem;}
  .lm-crop-viewport{position:relative;width:100%;height:420px;cursor:grab;overflow:hidden;user-select:none;-webkit-user-select:none;touch-action:none;}
  .lm-crop-viewport:active{cursor:grabbing;}
  #lmCropCanvas{display:block;width:100%;height:100%;}
  .lm-crop-frame{position:absolute;pointer-events:none;box-sizing:border-box;border:2px solid rgba(255,255,255,.92);border-radius:2px;}
  .lm-crop-corner{position:absolute;width:18px;height:18px;border-color:#fff;border-style:solid;}
  .lm-crop-corner-tl{top:-2px;left:-2px;border-width:3px 0 0 3px;}
  .lm-crop-corner-tr{top:-2px;right:-2px;border-width:3px 3px 0 0;}
  .lm-crop-corner-bl{bottom:-2px;left:-2px;border-width:0 0 3px 3px;}
  .lm-crop-corner-br{bottom:-2px;right:-2px;border-width:0 3px 3px 0;}
  .lm-crop-grid{position:absolute;inset:0;}
  .lm-crop-grid-line{position:absolute;background:rgba(255,255,255,.18);}
  .lm-crop-grid-h{width:100%;height:1px;left:0;}
  .lm-crop-grid-v{height:100%;width:1px;top:0;}
  .lm-crop-controls{display:flex;align-items:center;gap:.75rem;padding:.25rem 0;}
  .lm-crop-zoom-slider{flex:1;-webkit-appearance:none;appearance:none;height:4px;border-radius:4px;background:var(--border);outline:none;cursor:pointer;}
  .lm-crop-zoom-slider::-webkit-slider-thumb{-webkit-appearance:none;width:18px;height:18px;border-radius:50%;background:var(--accent,#1a1a1a);cursor:pointer;box-shadow:0 2px 6px rgba(0,0,0,.18);transition:transform .15s;}
  .lm-crop-zoom-slider::-webkit-slider-thumb:hover{transform:scale(1.15);}
  .lm-crop-zoom-val{font-size:.72rem;font-weight:600;color:var(--muted);min-width:38px;text-align:right;}
  .lm-crop-footer{display:flex;gap:.75rem;padding:1rem 1.5rem 1.5rem;border-top:1px solid var(--border);}

  @media(max-width:640px){
    .lm-modal{border-radius:20px 20px 0 0;max-height:95vh;}
    .lm-overlay{align-items:flex-end;padding:0;}
    .lm-crop-modal{border-radius:20px 20px 0 0;max-height:96vh;}
    .lm-crop-overlay{align-items:flex-end;padding:0;}
    .lm-crop-viewport{height:320px;}
    .lm-row2{grid-template-columns:1fr;}
    .lst-grid{grid-template-columns:repeat(auto-fill,minmax(160px,1fr));}
    .lm-cp-presets{grid-template-columns:repeat(6,1fr);}
  }
  `;
  document.head.appendChild(style);
}
