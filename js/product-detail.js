/* ═══════════════════════════════════════════════════
   product-detail.js — Məhsul detal paneli
   index.html və store.html-ə əlavə et:
     <script src="js/product-detail.js"></script>
   products.js-dən ƏVVƏL yox, SONRA yükləyin.
   ═══════════════════════════════════════════════════ */

/* ══════════════════════════════════════
   STATE
══════════════════════════════════════ */
const pdState = {
  product:      null,
  currentImg:   0,
  selectedColor: null,
  selectedSize:  null,
  reviews:      [],
  storeData:    null,
};

/* ══════════════════════════════════════
   KART CLICK — products.js-dəki
   createProductCard funksiyasına .card
   üzərinə onclick əlavə edir.
   DOMContentLoaded-dan SONRA çağırılır.
══════════════════════════════════════ */
function initProductCardClicks() {
  document.addEventListener('click', e => {
    const card = e.target.closest('.card');
    if (!card) return;
    /* Əgər fav, cart, delete, store link klikləndisə — keç */
    if (
      e.target.closest('.fav-btn')    ||
      e.target.closest('.cart-btn')   ||
      e.target.closest('.delete-btn') ||
      e.target.closest('.card-brand[onclick]')
    ) return;

    const id = card.dataset.id;
    const product = PRODUCTS.find(p => String(p.id) === String(id));
    if (product) openProductDetail(product);
  });
}

/* ══════════════════════════════════════
   MODAL INJECT (bir dəfə)
══════════════════════════════════════ */
function injectProductDetailModal() {
  if (document.getElementById('pdOverlay')) return;

  /* ── Overlay ── */
  const overlay = document.createElement('div');
  overlay.id        = 'pdOverlay';
  overlay.className = 'pd-overlay';
  overlay.addEventListener('click', e => {
    if (e.target === overlay) closeProductDetail();
  });

  overlay.innerHTML = `
    <div class="pd-panel" id="pdPanel">

      <!-- Bağla düyməsi -->
      <button class="pd-close-btn" onclick="closeProductDetail()" aria-label="Bağla">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
             stroke="currentColor" stroke-width="2.2">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>

      <!-- Kampaniya şeridi (yalnız varsa görünür) -->
      <div class="pd-campaign-bar" id="pdCampaignBar" style="display:none;"></div>

      <!-- ── ANA BÖLÜM ── -->
      <div class="pd-main" id="pdMain">

        <!-- Sol: Şəkil qalereyası -->
        <div class="pd-gallery" id="pdGallery">
          <div class="pd-img-main-wrap">
            <img id="pdMainImg" src="" alt="" />
            <button class="pd-img-nav pd-img-prev" onclick="pdImgNav(-1)">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                   stroke="currentColor" stroke-width="2.2">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
            </button>
            <button class="pd-img-nav pd-img-next" onclick="pdImgNav(1)">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                   stroke="currentColor" stroke-width="2.2">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </button>
            <div class="pd-img-counter" id="pdImgCounter"></div>
          </div>
          <div class="pd-thumbs" id="pdThumbs"></div>
        </div>

        <!-- Sağ: Məlumatlar -->
        <div class="pd-info" id="pdInfo">

          <!-- Mağaza adı -->
          <div class="pd-store-link" id="pdStoreLink"></div>

          <!-- Məhsul adı -->
          <h2 class="pd-product-name" id="pdProductName"></h2>

          <!-- Açıqlama -->
          <p class="pd-desc" id="pdDesc"></p>

          <!-- Rənglər -->
          <div class="pd-section" id="pdColorsSection">
            <div class="pd-section-label">Rəng: <span class="pd-sel-label" id="pdColorLabel">—</span></div>
            <div class="pd-colors-row" id="pdColorsRow"></div>
          </div>

          <!-- Ölçülər -->
          <div class="pd-section" id="pdSizesSection">
            <div class="pd-section-label">Ölçü: <span class="pd-sel-label" id="pdSizeLabel">—</span></div>
            <div class="pd-sizes-row" id="pdSizesRow"></div>
          </div>

          <!-- Qiymət -->
          <div class="pd-price-wrap" id="pdPriceWrap"></div>

          <!-- Səbətə əlavə et -->
          <button class="pd-cart-btn" id="pdCartBtn" onclick="pdAddToCart()">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" stroke-width="2">
              <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4zM3 6h18M16 10a4 4 0 01-8 0"/>
            </svg>
            Səbətə əlavə et
          </button>

          <!-- Çatdırılma -->
          <div class="pd-delivery-box">
            <div class="pd-delivery-row">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                   stroke="currentColor" stroke-width="2">
                <rect x="1" y="3" width="15" height="13" rx="1"/>
                <path d="M16 8h4l3 5v4h-7V8z"/>
                <circle cx="5.5" cy="18.5" r="2.5"/>
                <circle cx="18.5" cy="18.5" r="2.5"/>
              </svg>
              <span><strong>Pulsuz çatdırılma</strong> — 50 AZN üzərindəki sifarişlərə</span>
            </div>
            <div class="pd-delivery-row">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                   stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>
              <span>Təxmini çatdırılma: <strong>2–4 iş günü</strong></span>
            </div>
          </div>

        </div><!-- /pd-info -->
      </div><!-- /pd-main -->

      <!-- ── YORUMLAR ── -->
      <div class="pd-reviews-section" id="pdReviewsSection">
        <div class="pd-reviews-header">
          <h3 class="pd-reviews-title">Şərhlər & Suallar</h3>
          <span class="pd-reviews-count" id="pdReviewsCount"></span>
        </div>

        <!-- Yeni şərh formu -->
        <div class="pd-review-form" id="pdReviewForm">
          <div class="pd-review-form-inner">
            <div class="pd-avatar-placeholder" id="pdReviewAvatar">?</div>
            <div style="flex:1;display:flex;flex-direction:column;gap:.6rem;">
              <div class="pd-rating-row" id="pdRatingRow">
                ${[1,2,3,4,5].map(i =>
                  `<button class="pd-star-btn" data-val="${i}" onclick="pdSetRating(${i})">
                    <svg width="18" height="18" viewBox="0 0 24 24"
                         fill="none" stroke="#d4b896" stroke-width="1.8">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14
                                       18.18 21.02 12 17.77 5.82 21.02
                                       7 14.14 2 9.27 8.91 8.26 12 2"/>
                    </svg>
                  </button>`
                ).join('')}
                <span class="pd-rating-hint" id="pdRatingHint">Qiymət verin</span>
              </div>
              <textarea class="pd-review-input" id="pdReviewText"
                placeholder="Məhsul haqqında şərh və ya sual yazın…" rows="2"></textarea>
              <button class="pd-review-submit-btn" onclick="pdSubmitReview()">Göndər</button>
            </div>
          </div>
          <div class="pd-login-hint" id="pdLoginHint" style="display:none;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="8" r="4"/>
              <path d="M4 20c0-4 3.58-7 8-7s8 3 8 7"/>
            </svg>
            Şərh yazmaq üçün
            <button onclick="modal.open('authModal')" class="pd-login-link">daxil olun</button>
          </div>
        </div>

        <!-- Mövcud şərhlər -->
        <div class="pd-reviews-list" id="pdReviewsList">
          <div class="pd-reviews-loading">
            <div class="pd-spinner"></div>
          </div>
        </div>
      </div>

    </div><!-- /pd-panel -->
  `;

  document.body.appendChild(overlay);
  injectProductDetailStyles();
}

/* ══════════════════════════════════════
   AÇMA
══════════════════════════════════════ */
async function openProductDetail(product) {
  injectProductDetailModal();

  pdState.product       = product;
  pdState.currentImg    = 0;
  pdState.selectedColor = null;
  pdState.selectedSize  = null;
  pdState.reviews       = [];
  pdState.storeData     = null;

  /* Overlay aç */
  const overlay = document.getElementById('pdOverlay');
  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';

  /* Render */
  pdRenderGallery();
  pdRenderInfo();
  pdRenderColors();
  pdRenderSizes();
  pdRenderPrice();
  pdRenderReviewForm();

  /* Async: kampaniya + şərhlər */
  pdLoadCampaign();
  pdLoadReviews();
}

/* ══════════════════════════════════════
   BAĞLAMA
══════════════════════════════════════ */
function closeProductDetail() {
  const overlay = document.getElementById('pdOverlay');
  if (overlay) overlay.classList.remove('open');
  document.body.style.overflow = '';
  setTimeout(() => {
    pdState.product = null;
  }, 350);
}

/* ══════════════════════════════════════
   QALEREYa
══════════════════════════════════════ */
function pdRenderGallery() {
  const p    = pdState.product;
  const imgs = (p.imgs && p.imgs.length > 0) ? p.imgs : (p.img ? [p.img] : ['']);

  const mainImg = document.getElementById('pdMainImg');
  mainImg.src = imgs[pdState.currentImg] || '';
  mainImg.alt = p.name;

  /* Sayaç */
  const counter = document.getElementById('pdImgCounter');
  if (imgs.length > 1) {
    counter.textContent = `${pdState.currentImg + 1} / ${imgs.length}`;
    counter.style.display = 'block';
  } else {
    counter.style.display = 'none';
  }

  /* Nav düymələri */
  document.querySelector('.pd-img-prev').style.display = imgs.length > 1 ? 'flex' : 'none';
  document.querySelector('.pd-img-next').style.display = imgs.length > 1 ? 'flex' : 'none';

  /* Kiçik şəkillər */
  const thumbs = document.getElementById('pdThumbs');
  thumbs.innerHTML = imgs.map((src, i) => `
    <div class="pd-thumb ${i === pdState.currentImg ? 'active' : ''}"
         onclick="pdSetImg(${i})">
      <img src="${src}" alt="şəkil ${i+1}" loading="lazy" />
    </div>
  `).join('');
}

function pdSetImg(i) {
  const p    = pdState.product;
  const imgs = (p.imgs && p.imgs.length > 0) ? p.imgs : (p.img ? [p.img] : ['']);
  pdState.currentImg = (i + imgs.length) % imgs.length;
  pdRenderGallery();
}

function pdImgNav(dir) {
  const p    = pdState.product;
  const imgs = (p.imgs && p.imgs.length > 0) ? p.imgs : (p.img ? [p.img] : ['']);
  pdState.currentImg = (pdState.currentImg + dir + imgs.length) % imgs.length;
  pdRenderGallery();
}

/* ══════════════════════════════════════
   MƏLUMATLAR
══════════════════════════════════════ */
function pdRenderInfo() {
  const p = pdState.product;

  /* Mağaza linki */
  const storeLink = document.getElementById('pdStoreLink');
  const storeName = p.storeName || p.brand || '';
  const storeUid  = p.userId || null;
  if (storeName) {
    storeLink.innerHTML = storeUid
      ? `<a class="pd-store-name" href="store.html?uid=${storeUid}">${storeName}</a>`
      : `<span class="pd-store-name">${storeName}</span>`;
    storeLink.style.display = 'block';
  } else {
    storeLink.style.display = 'none';
  }

  document.getElementById('pdProductName').textContent = p.name || '';

  const descEl = document.getElementById('pdDesc');
  if (p.desc) {
    descEl.textContent    = p.desc;
    descEl.style.display  = 'block';
  } else {
    descEl.style.display  = 'none';
  }
}

/* ══════════════════════════════════════
   RƏNGLƏR
══════════════════════════════════════ */
function pdRenderColors() {
  const p      = pdState.product;
  const colors = p.colors || [];
  const sec    = document.getElementById('pdColorsSection');

  if (!colors.length) { sec.style.display = 'none'; return; }
  sec.style.display = 'block';

  const row = document.getElementById('pdColorsRow');
  row.innerHTML = colors.map((c, i) => `
    <button class="pd-color-swatch ${pdState.selectedColor === i ? 'selected' : ''}"
            style="background:${c.hex};${c.hex==='#FFFFFF'?'border:1.5px solid #ccc;':''}"
            title="${c.name}"
            onclick="pdSelectColor(${i})">
    </button>
  `).join('');

  document.getElementById('pdColorLabel').textContent =
    pdState.selectedColor !== null ? colors[pdState.selectedColor].name : '—';
}

function pdSelectColor(i) {
  pdState.selectedColor = i;
  pdRenderColors();
}

/* ══════════════════════════════════════
   ÖLÇÜLƏR
══════════════════════════════════════ */
function pdRenderSizes() {
  const p     = pdState.product;
  const sizes = p.sizes || [];
  const sec   = document.getElementById('pdSizesSection');

  if (!sizes.length) { sec.style.display = 'none'; return; }
  sec.style.display = 'block';

  const row = document.getElementById('pdSizesRow');
  row.innerHTML = sizes.map((s, i) => {
    const outOfStock = (parseInt(s.stock) || 0) === 0;
    const selected   = pdState.selectedSize === i;
    return `
      <button class="pd-size-btn
               ${selected   ? 'selected'    : ''}
               ${outOfStock ? 'out-of-stock': ''}"
              onclick="${outOfStock ? '' : `pdSelectSize(${i})`}"
              ${outOfStock ? 'disabled title="Stokda yoxdur"' : ''}>
        ${s.label}
        ${outOfStock ? '<span class="pd-size-x">✕</span>' : ''}
      </button>
    `;
  }).join('');

  document.getElementById('pdSizeLabel').textContent =
    pdState.selectedSize !== null ? sizes[pdState.selectedSize].label : '—';
}

function pdSelectSize(i) {
  pdState.selectedSize = i;
  pdRenderSizes();
}

/* ══════════════════════════════════════
   QİYMƏT
══════════════════════════════════════ */
function pdRenderPrice() {
  const p    = pdState.product;
  const wrap = document.getElementById('pdPriceWrap');
  const isSale = p.oldPrice && p.oldPrice > p.price;
  wrap.innerHTML = `
    <div class="pd-price-inner">
      ${isSale ? `<span class="pd-price-old">${p.oldPrice.toFixed(2)} ₼</span>` : ''}
      <span class="pd-price-new ${isSale ? 'sale' : ''}">${(p.price||0).toFixed(2)} ₼</span>
      ${isSale
        ? `<span class="pd-discount-badge">
             -${Math.round((1 - p.price/p.oldPrice)*100)}%
           </span>`
        : ''}
    </div>
  `;
}

/* ══════════════════════════════════════
   SƏBƏTƏ ƏLAVƏ ET
══════════════════════════════════════ */
function pdAddToCart() {
  const p       = pdState.product;
  const sizes   = p.sizes || [];
  const colors  = p.colors || [];

  if (sizes.length > 0 && pdState.selectedSize === null) {
    toast.show('Zəhmət olmasa ölçü seçin', 'default');
    document.getElementById('pdSizesSection').scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }
  if (colors.length > 0 && pdState.selectedColor === null) {
    toast.show('Zəhmət olmasa rəng seçin', 'default');
    document.getElementById('pdColorsSection').scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }

  const cartProduct = {
    ...p,
    selectedSize:  pdState.selectedSize !== null ? sizes[pdState.selectedSize]  : null,
    selectedColor: pdState.selectedColor !== null ? colors[pdState.selectedColor] : null,
  };

  if (typeof cart !== 'undefined') {
    cart.add(cartProduct);
  }
}

/* ══════════════════════════════════════
   KAMPANİYA — Async yüklə
══════════════════════════════════════ */
async function pdLoadCampaign() {
  const bar = document.getElementById('pdCampaignBar');
  const uid = pdState.product?.userId;
  if (!uid) { bar.style.display = 'none'; return; }

  try {
    const snap = await fbDb.collection('campaigns')
      .where('vendorId', '==', uid)
      .where('active', '==', true)
      .limit(1)
      .get();

    if (!snap.empty) {
      const c = snap.docs[0].data();
      bar.innerHTML = `
        <span class="pd-campaign-icon">🏷️</span>
        <span class="pd-campaign-text">${c.title || 'Aktiv kampaniya'}</span>
        ${c.discount ? `<span class="pd-campaign-pill">${c.discount}% endirim</span>` : ''}
      `;
      bar.style.display = 'flex';
    } else {
      bar.style.display = 'none';
    }
  } catch {
    bar.style.display = 'none';
  }
}

/* ══════════════════════════════════════
   ŞƏRH FORMU RENDER
══════════════════════════════════════ */
function pdRenderReviewForm() {
  const user       = fbAuth.currentUser;
  const loginHint  = document.getElementById('pdLoginHint');
  const formInner  = document.querySelector('.pd-review-form-inner');
  const avatar     = document.getElementById('pdReviewAvatar');

  if (user) {
    loginHint.style.display  = 'none';
    formInner.style.display  = 'flex';
    avatar.textContent = user.displayName
      ? user.displayName.charAt(0).toUpperCase()
      : (user.email ? user.email.charAt(0).toUpperCase() : '?');
  } else {
    loginHint.style.display  = 'flex';
    formInner.style.display  = 'none';
  }

  /* Rating sıfırla */
  pdState.reviewRating = 0;
  pdUpdateStars(0);
}

let _pdRating = 0;

function pdSetRating(val) {
  _pdRating = val;
  pdUpdateStars(val);
  const hint = document.getElementById('pdRatingHint');
  const labels = ['', 'Çox pis', 'Pis', 'Normal', 'Yaxşı', 'Əla'];
  if (hint) hint.textContent = labels[val] || '';
}

function pdUpdateStars(val) {
  document.querySelectorAll('.pd-star-btn svg').forEach((svg, i) => {
    const filled = i < val;
    svg.setAttribute('fill',   filled ? '#c9a86c' : 'none');
    svg.setAttribute('stroke', filled ? '#c9a86c' : '#d4b896');
  });
}

/* ══════════════════════════════════════
   ŞƏRH SUBMIT
══════════════════════════════════════ */
async function pdSubmitReview() {
  const user = fbAuth.currentUser;
  if (!user) { modal.open('authModal'); return; }

  const text = (document.getElementById('pdReviewText')?.value || '').trim();
  if (!text) { toast.show('Şərh mətnini daxil edin', 'default'); return; }

  const productId = String(pdState.product.id);
  const btn = document.querySelector('.pd-review-submit-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Göndərilir...'; }

  try {
    await fbDb.collection('reviews').add({
      productId,
      userId:      user.uid,
      userName:    user.displayName || user.email?.split('@')[0] || 'İstifadəçi',
      userInitial: (user.displayName || user.email || '?').charAt(0).toUpperCase(),
      rating:      _pdRating || 0,
      text,
      createdAt:   firebase.firestore.FieldValue.serverTimestamp(),
    });

    document.getElementById('pdReviewText').value = '';
    _pdRating = 0;
    pdUpdateStars(0);
    const hint = document.getElementById('pdRatingHint');
    if (hint) hint.textContent = 'Qiymət verin';
    toast.show('Şərhiniz əlavə edildi ✓', 'success');
    pdLoadReviews();
  } catch (err) {
    toast.show('Xəta: ' + err.message, 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Göndər'; }
  }
}

/* ══════════════════════════════════════
   ŞƏRHLƏR YüKLƏ
══════════════════════════════════════ */
async function pdLoadReviews() {
  const list = document.getElementById('pdReviewsList');
  if (!list) return;

  list.innerHTML = `<div class="pd-reviews-loading"><div class="pd-spinner"></div></div>`;

  const productId = String(pdState.product.id);

  try {
    const snap = await fbDb.collection('reviews')
      .where('productId', '==', productId)
      .orderBy('createdAt', 'desc')
      .get();

    pdState.reviews = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    const countEl = document.getElementById('pdReviewsCount');
    if (countEl) countEl.textContent = `${pdState.reviews.length} şərh`;

    if (pdState.reviews.length === 0) {
      list.innerHTML = `
        <div class="pd-reviews-empty">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" stroke-width="1.5" style="color:var(--border,#e0d8ce)">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
          </svg>
          <p>Hələ şərh yoxdur. İlk şərhi siz yazın!</p>
        </div>
      `;
      return;
    }

    list.innerHTML = pdState.reviews.map(r => pdReviewCard(r)).join('');

  } catch (err) {
    list.innerHTML = `
      <p style="color:var(--danger,#e63946);font-size:.82rem;padding:1rem 0;">
        Şərhlər yüklənmədi: ${err.message}
      </p>
    `;
  }
}

function pdReviewCard(r) {
  const stars = r.rating
    ? Array.from({length:5}, (_,i) =>
        `<svg width="13" height="13" viewBox="0 0 24 24"
              fill="${i < r.rating ? '#c9a86c' : 'none'}"
              stroke="${i < r.rating ? '#c9a86c' : '#d4b896'}" stroke-width="1.8">
           <polygon points="12 2 15.09 8.26 22 9.27 17 14.14
                            18.18 21.02 12 17.77 5.82 21.02
                            7 14.14 2 9.27 8.91 8.26 12 2"/>
         </svg>`
      ).join('')
    : '';

  const dateStr = r.createdAt?.toDate
    ? r.createdAt.toDate().toLocaleDateString('az-AZ', {day:'numeric',month:'long',year:'numeric'})
    : '';

  return `
    <div class="pd-review-card">
      <div class="pd-review-avatar">${r.userInitial || '?'}</div>
      <div class="pd-review-body">
        <div class="pd-review-top">
          <span class="pd-review-name">${r.userName}</span>
          ${stars ? `<span class="pd-review-stars">${stars}</span>` : ''}
          ${dateStr ? `<span class="pd-review-date">${dateStr}</span>` : ''}
        </div>
        <p class="pd-review-text">${r.text}</p>
      </div>
    </div>
  `;
}

/* ══════════════════════════════════════
   STİLLƏR
══════════════════════════════════════ */
function injectProductDetailStyles() {
  if (document.getElementById('pdStyles')) return;
  const style = document.createElement('style');
  style.id = 'pdStyles';
  style.textContent = `

  /* ── Overlay ── */
  .pd-overlay {
    position: fixed;
    inset: 0;
    z-index: 300;
    background: rgba(15,10,5,.58);
    backdrop-filter: blur(6px);
    opacity: 0;
    pointer-events: none;
    transition: opacity .3s;
    display: flex;
    flex-direction: column;
    /* Header yüksəkliyini boşluq olaraq burax */
    padding-top: 72px;
  }
  .pd-overlay.open {
    opacity: 1;
    pointer-events: all;
  }

  /* ── Panel ── */
  .pd-panel {
    background: var(--surface, #faf9f7);
    width: 100%;
    height: 100%;
    overflow-y: auto;
    transform: translateY(30px);
    transition: transform .35s cubic-bezier(.22,1,.36,1);
    position: relative;
    border-radius: 20px 20px 0 0;
  }
  .pd-overlay.open .pd-panel {
    transform: translateY(0);
  }

  /* ── Bağla ── */
  .pd-close-btn {
    position: sticky;
    top: 16px;
    left: calc(100% - 52px);
    display: flex;
    z-index: 10;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    border: 1.5px solid var(--border, #e5e0d8);
    background: var(--surface, #faf9f7);
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: var(--muted, #7a7a7a);
    margin: 14px 16px 0 auto;
    flex-shrink: 0;
    transition: background .2s, color .2s;
  }
  .pd-close-btn:hover {
    background: var(--border, #e5e0d8);
    color: var(--accent, #c9a86c);
  }

  /* ── Kampaniya şeridi ── */
  .pd-campaign-bar {
    display: flex;
    align-items: center;
    gap: .6rem;
    padding: .6rem var(--page-x, 1.5rem);
    background: linear-gradient(90deg, #2c1f0e, #3a2810);
    color: #f5e8c8;
    font-size: .82rem;
    font-weight: 500;
  }
  .pd-campaign-icon { font-size: 1rem; }
  .pd-campaign-text { flex: 1; }
  .pd-campaign-pill {
    background: var(--accent, #c9a86c);
    color: #fff;
    font-size: .72rem;
    font-weight: 700;
    padding: 2px 10px;
    border-radius: 20px;
    letter-spacing: .03em;
  }

  /* ── Ana bölüm ── */
  .pd-main {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0;
    max-width: 1200px;
    margin: 0 auto;
    padding: 1.5rem var(--page-x, 1.5rem) 2rem;
    min-height: 50vh;
  }

  /* ── Qalereya ── */
  .pd-gallery {
    display: flex;
    flex-direction: column;
    gap: .75rem;
    padding-right: 2rem;
  }

  .pd-img-main-wrap {
    position: relative;
    aspect-ratio: 3/4;
    background: #f0ece6;
    border-radius: 16px;
    overflow: hidden;
    max-height: 50vh;
  }
  .pd-img-main-wrap img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: opacity .25s;
  }

  /* Nav düymələri */
  .pd-img-nav {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: rgba(255,255,255,.88);
    border: none;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: var(--text, #1a1a1a);
    box-shadow: 0 2px 8px rgba(0,0,0,.14);
    transition: background .2s;
  }
  .pd-img-nav:hover { background: #fff; }
  .pd-img-prev { left: 10px; }
  .pd-img-next { right: 10px; }

  .pd-img-counter {
    position: absolute;
    bottom: 10px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(0,0,0,.45);
    color: #fff;
    font-size: .72rem;
    padding: 3px 10px;
    border-radius: 20px;
    backdrop-filter: blur(4px);
  }

  /* Kiçik şəkillər */
  .pd-thumbs {
    display: flex;
    gap: .5rem;
    flex-wrap: wrap;
  }
  .pd-thumb {
    width: 60px;
    height: 60px;
    border-radius: 8px;
    overflow: hidden;
    border: 2px solid transparent;
    cursor: pointer;
    transition: border-color .2s, transform .15s;
    flex-shrink: 0;
    background: #f0ece6;
  }
  .pd-thumb img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .pd-thumb.active {
    border-color: var(--accent, #c9a86c);
  }
  .pd-thumb:hover { transform: scale(1.06); }

  /* ── Məlumatlar bölümü ── */
  .pd-info {
    display: flex;
    flex-direction: column;
    gap: .75rem;
    padding-left: 1rem;
    /* Qalereya ilə eyni hündürlüyü tut */
    max-height: calc(50vh + 60px + .75rem);
    overflow-y: auto;
    scrollbar-width: thin;
    scrollbar-color: var(--border,#e5e0d8) transparent;
  }
  .pd-info::-webkit-scrollbar { width: 4px; }
  .pd-info::-webkit-scrollbar-thumb {
    background: var(--border,#e5e0d8);
    border-radius: 4px;
  }

  /* Mağaza adı */
  .pd-store-link { margin-bottom: -.25rem; }
  .pd-store-name {
    font-size: .78rem;
    font-weight: 700;
    letter-spacing: .08em;
    text-transform: uppercase;
    color: var(--accent, #c9a86c);
    text-decoration: none;
    transition: opacity .2s;
  }
  .pd-store-name:hover { opacity: .75; }

  /* Məhsul adı */
  .pd-product-name {
    font-family: var(--font-display, 'Playfair Display', serif);
    font-size: clamp(1.2rem, 2.5vw, 1.7rem);
    font-weight: 700;
    line-height: 1.25;
    color: var(--text, #1a1a1a);
    margin: 0;
  }

  /* Açıqlama */
  .pd-desc {
    font-size: .875rem;
    color: var(--muted, #7a7a7a);
    line-height: 1.65;
    margin: 0;
  }

  /* Bölüm başlığı */
  .pd-section { display: flex; flex-direction: column; gap: .5rem; }
  .pd-section-label {
    font-size: .76rem;
    font-weight: 600;
    color: var(--text, #1a1a1a);
    letter-spacing: .02em;
  }
  .pd-sel-label {
    font-weight: 400;
    color: var(--muted, #7a7a7a);
  }

  /* Rəng swatchlar */
  .pd-colors-row { display: flex; flex-wrap: wrap; gap: .5rem; }
  .pd-color-swatch {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    border: 2px solid transparent;
    cursor: pointer;
    transition: transform .15s, border-color .2s, box-shadow .2s;
    outline: none;
  }
  .pd-color-swatch:hover {
    transform: scale(1.15);
    box-shadow: 0 0 0 3px rgba(201,168,108,.3);
  }
  .pd-color-swatch.selected {
    border-color: var(--accent, #c9a86c);
    box-shadow: 0 0 0 3px rgba(201,168,108,.25);
    transform: scale(1.1);
  }

  /* Ölçü düymələri */
  .pd-sizes-row { display: flex; flex-wrap: wrap; gap: .45rem; }
  .pd-size-btn {
    position: relative;
    min-width: 42px;
    padding: .38rem .7rem;
    border-radius: 8px;
    border: 1.5px solid var(--border, #e5e0d8);
    background: var(--bg, #f7f4f0);
    font-size: .82rem;
    font-weight: 600;
    cursor: pointer;
    color: var(--text, #1a1a1a);
    transition: all .18s;
  }
  .pd-size-btn:hover:not(.out-of-stock) {
    border-color: var(--accent, #c9a86c);
    color: var(--accent, #c9a86c);
  }
  .pd-size-btn.selected {
    background: var(--text, #1a1a1a);
    border-color: var(--text, #1a1a1a);
    color: #fff;
  }
  .pd-size-btn.out-of-stock {
    opacity: .42;
    cursor: not-allowed;
    text-decoration: line-through;
  }
  .pd-size-x {
    font-size: .6rem;
    vertical-align: super;
    margin-left: 2px;
    color: var(--danger, #e63946);
  }

  /* Qiymət */
  .pd-price-wrap { margin: .25rem 0; }
  .pd-price-inner {
    display: flex;
    align-items: baseline;
    gap: .6rem;
    flex-wrap: wrap;
  }
  .pd-price-old {
    font-size: .88rem;
    color: var(--muted, #7a7a7a);
    text-decoration: line-through;
  }
  .pd-price-new {
    font-size: 1.6rem;
    font-weight: 700;
    color: var(--text, #1a1a1a);
    font-family: var(--font-display, 'Playfair Display', serif);
  }
  .pd-price-new.sale { color: var(--danger, #e63946); }
  .pd-discount-badge {
    background: var(--danger, #e63946);
    color: #fff;
    font-size: .72rem;
    font-weight: 700;
    padding: 3px 9px;
    border-radius: 20px;
    letter-spacing: .04em;
  }

  /* Səbətə əlavə et düyməsi */
  .pd-cart-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: .5rem;
    width: 100%;
    padding: .85rem 1.5rem;
    background: var(--text, #1a1a1a);
    color: #fff;
    border: none;
    border-radius: 12px;
    font-size: .95rem;
    font-weight: 600;
    cursor: pointer;
    font-family: var(--font-body, 'DM Sans', sans-serif);
    transition: background .2s, transform .15s;
    letter-spacing: .02em;
  }
  .pd-cart-btn:hover {
    background: #333;
    transform: translateY(-1px);
  }
  .pd-cart-btn:active { transform: translateY(0); }

  /* Çatdırılma */
  .pd-delivery-box {
    background: var(--bg, #f7f4f0);
    border: 1px solid var(--border, #e5e0d8);
    border-radius: 10px;
    padding: .75rem 1rem;
    display: flex;
    flex-direction: column;
    gap: .5rem;
  }
  .pd-delivery-row {
    display: flex;
    align-items: center;
    gap: .5rem;
    font-size: .78rem;
    color: var(--muted, #7a7a7a);
  }
  .pd-delivery-row strong { color: var(--text, #1a1a1a); }
  .pd-delivery-row svg { flex-shrink: 0; }

  /* ════════════════
     ŞƏRHLƏR BÖLÜMü
     ════════════════ */
  .pd-reviews-section {
    max-width: 1200px;
    margin: 0 auto;
    padding: 1.5rem var(--page-x, 1.5rem) 3rem;
    border-top: 1px solid var(--border, #e5e0d8);
  }

  .pd-reviews-header {
    display: flex;
    align-items: baseline;
    gap: .75rem;
    margin-bottom: 1.25rem;
  }
  .pd-reviews-title {
    font-family: var(--font-display, 'Playfair Display', serif);
    font-size: 1.2rem;
    font-weight: 700;
    color: var(--text, #1a1a1a);
    margin: 0;
  }
  .pd-reviews-count {
    font-size: .8rem;
    color: var(--muted, #7a7a7a);
  }

  /* Forma */
  .pd-review-form {
    background: var(--bg, #f7f4f0);
    border: 1px solid var(--border, #e5e0d8);
    border-radius: 14px;
    padding: 1rem 1.25rem;
    margin-bottom: 1.25rem;
  }
  .pd-review-form-inner {
    display: flex;
    gap: .85rem;
    align-items: flex-start;
  }
  .pd-avatar-placeholder {
    width: 38px;
    height: 38px;
    border-radius: 50%;
    background: linear-gradient(135deg,#2c2c2c,#1a1a1a);
    color: #fff;
    font-family: var(--font-display, 'Playfair Display', serif);
    font-size: 1rem;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .pd-rating-row {
    display: flex;
    align-items: center;
    gap: 3px;
  }
  .pd-star-btn {
    background: none;
    border: none;
    cursor: pointer;
    padding: 0 1px;
    display: flex;
    align-items: center;
    transition: transform .15s;
  }
  .pd-star-btn:hover { transform: scale(1.25); }
  .pd-rating-hint {
    font-size: .72rem;
    color: var(--muted, #7a7a7a);
    margin-left: .35rem;
  }

  .pd-review-input {
    width: 100%;
    padding: .55rem .85rem;
    border: 1.5px solid var(--border, #e5e0d8);
    border-radius: 8px;
    font-family: var(--font-body, 'DM Sans', sans-serif);
    font-size: .875rem;
    color: var(--text, #1a1a1a);
    background: var(--surface, #faf9f7);
    resize: none;
    outline: none;
    transition: border-color .2s;
  }
  .pd-review-input:focus { border-color: var(--accent, #c9a86c); }
  .pd-review-input::placeholder { color: #bbb; }

  .pd-review-submit-btn {
    align-self: flex-end;
    padding: .45rem 1.1rem;
    background: var(--accent, #c9a86c);
    color: #fff;
    border: none;
    border-radius: 8px;
    font-size: .82rem;
    font-weight: 600;
    cursor: pointer;
    font-family: var(--font-body, 'DM Sans', sans-serif);
    transition: opacity .2s;
  }
  .pd-review-submit-btn:hover { opacity: .85; }
  .pd-review-submit-btn:disabled { opacity: .5; cursor: not-allowed; }

  /* Giriş hint */
  .pd-login-hint {
    display: flex;
    align-items: center;
    gap: .4rem;
    font-size: .82rem;
    color: var(--muted, #7a7a7a);
  }
  .pd-login-link {
    background: none;
    border: none;
    color: var(--accent, #c9a86c);
    font-weight: 600;
    cursor: pointer;
    font-size: .82rem;
    padding: 0;
    font-family: inherit;
  }
  .pd-login-link:hover { text-decoration: underline; }

  /* Şərh kartları */
  .pd-reviews-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  .pd-review-card {
    display: flex;
    gap: .85rem;
    padding: 1rem 1.1rem;
    background: var(--surface, #faf9f7);
    border: 1px solid var(--border, #e5e0d8);
    border-radius: 12px;
    animation: pdFadeIn .3s ease;
  }
  @keyframes pdFadeIn {
    from { opacity: 0; transform: translateY(8px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .pd-review-avatar {
    width: 38px;
    height: 38px;
    border-radius: 50%;
    background: linear-gradient(135deg,#2c2c2c,#1a1a1a);
    color: #fff;
    font-family: var(--font-display, 'Playfair Display', serif);
    font-size: 1rem;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .pd-review-body { flex: 1; }
  .pd-review-top {
    display: flex;
    align-items: center;
    gap: .6rem;
    flex-wrap: wrap;
    margin-bottom: .4rem;
  }
  .pd-review-name {
    font-size: .84rem;
    font-weight: 600;
    color: var(--text, #1a1a1a);
  }
  .pd-review-stars {
    display: flex;
    align-items: center;
    gap: 1px;
  }
  .pd-review-date {
    font-size: .72rem;
    color: var(--muted, #7a7a7a);
    margin-left: auto;
  }
  .pd-review-text {
    font-size: .875rem;
    color: var(--muted, #5a5a5a);
    line-height: 1.6;
    margin: 0;
  }

  /* Boş / Loading */
  .pd-reviews-empty {
    text-align: center;
    padding: 2.5rem 1rem;
    color: var(--muted, #7a7a7a);
    font-size: .875rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: .75rem;
  }
  .pd-reviews-loading {
    display: flex;
    justify-content: center;
    padding: 2rem 0;
  }
  .pd-spinner {
    width: 28px; height: 28px;
    border: 2.5px solid var(--border, #e5e0d8);
    border-top-color: var(--accent, #c9a86c);
    border-radius: 50%;
    animation: pdSpin .7s linear infinite;
  }
  @keyframes pdSpin {
    to { transform: rotate(360deg); }
  }

  /* ── Responsive ── */
  @media (max-width: 768px) {
    .pd-overlay { padding-top: 60px; }

    .pd-main {
      grid-template-columns: 1fr;
      padding: 1rem;
      gap: 1.25rem;
    }

    .pd-gallery { padding-right: 0; }

    .pd-img-main-wrap { max-height: 55vw; }

    .pd-info {
      padding-left: 0;
      max-height: none;
      overflow-y: visible;
    }

    .pd-thumbs { gap: .4rem; }
    .pd-thumb  { width: 50px; height: 50px; }

    .pd-reviews-section { padding: 1rem 1rem 2.5rem; }
  }

  @media (max-width: 480px) {
    .pd-product-name { font-size: 1.25rem; }
    .pd-price-new    { font-size: 1.35rem; }
  }
  `;
  document.head.appendChild(style);
}

/* ══════════════════════════════════════
   BAŞLAT
══════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  initProductCardClicks();
});
