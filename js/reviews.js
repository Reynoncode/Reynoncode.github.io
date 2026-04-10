/* ═══════════════════════════════════════════════════
   reviews.js — Yorum sistemi
   index.html + store.html + profile.html-ə əlavə et:
   <script src="js/reviews.js"></script>
   ═══════════════════════════════════════════════════ */

/* ══════════════════════════════════════════════════
   MƏHSUL KART — DROPDOWN-DA YORUM BÖLÜMÜ
   products.js-dəki createProductCard() funksiyasına
   card click hadisəsini əlavə etmək lazımdır.

   index.html-ə card click əlavə etmək üçün:
   renderProducts() çağrıldıqdan sonra initCardClicks() çağırın.
   ══════════════════════════════════════════════════ */

/* ── Kart kliklərini işlət ── */
function initCardClicks() {
  document.querySelectorAll('.card[data-id]').forEach(card => {
    card.addEventListener('click', e => {
      if (
        e.target.closest('.fav-btn') ||
        e.target.closest('.cart-btn') ||
        e.target.closest('.delete-btn') ||
        e.target.closest('.card-brand')
      ) return;
      const id = card.dataset.id;
      const product = PRODUCTS.find(p => String(p.id) === String(id));
      if (product) openProductDropdown(product);
    });
  });
}

/* ══════════════════════════════════════════════════
   MƏHSUL DROPDOWN — PANEL
   ══════════════════════════════════════════════════ */
let _dropdownProduct = null;

async function openProductDropdown(product) {
  _dropdownProduct = product;
  injectReviewStyles();

  let overlay = document.getElementById('pdOverlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'pdOverlay';
    overlay.className = 'pd-overlay';
    overlay.innerHTML = `
      <div class="pd-panel" id="pdPanel">

        <!-- Bağla -->
        <button class="pd-close" onclick="closeProductDropdown()">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>

        <!-- Məhsul məlumatı -->
        <div class="pd-product-header" id="pdProductHeader"></div>

        <!-- Tab-lar -->
        <div class="pd-tabs">
          <button class="pd-tab active" onclick="pdSwitchTab('info',this)">Məlumat</button>
          <button class="pd-tab" onclick="pdSwitchTab('reviews',this)">
            Yorumlar <span class="pd-review-count" id="pdReviewCount"></span>
          </button>
        </div>

        <!-- Məlumat tab -->
        <div class="pd-tab-content" id="pdTabInfo"></div>

        <!-- Yorumlar tab -->
        <div class="pd-tab-content" id="pdTabReviews" style="display:none;">
          <!-- Yorum yazma forması -->
          <div id="pdReviewForm"></div>
          <!-- Yorum siyahısı -->
          <div id="pdReviewList"></div>
        </div>

      </div>`;
    document.body.appendChild(overlay);
    overlay.addEventListener('click', e => {
      if (e.target === overlay) closeProductDropdown();
    });
  }

  // Məhsul başlığı
  const p = product;
  const imgSrc = (p.imgs && p.imgs[0]) || p.img || '';
  const isSale = p.oldPrice != null && p.oldPrice > p.price;

  document.getElementById('pdProductHeader').innerHTML = `
    <div class="pd-prod-img-wrap">
      ${imgSrc ? `<img src="${imgSrc}" alt="${p.name}">` : '<div class="pd-prod-no-img">👗</div>'}
    </div>
    <div class="pd-prod-info">
      <div class="pd-prod-brand">${p.brand || p.storeName || ''}</div>
      <div class="pd-prod-name">${p.name}</div>
      <div class="pd-prod-price-row">
        ${isSale ? `<span class="pd-old-price">${p.oldPrice} ₼</span>` : ''}
        <span class="pd-price ${isSale ? 'sale' : ''}">${p.price} ₼</span>
      </div>
      ${p.sizes && p.sizes.length ? `
        <div class="pd-sizes">
          ${p.sizes.map(s => `<span class="pd-size-chip">${s.label}</span>`).join('')}
        </div>` : ''}
    </div>
  `;

  // Məlumat tab
  document.getElementById('pdTabInfo').innerHTML = `
    <div class="pd-info-grid">
      ${p.desc ? `<div class="pd-info-block"><div class="pd-info-label">Açıqlama</div><p class="pd-info-text">${p.desc}</p></div>` : ''}
      ${p.material ? `<div class="pd-info-block"><div class="pd-info-label">Material</div><p class="pd-info-text">${p.material}</p></div>` : ''}
      ${p.condition ? `<div class="pd-info-block"><div class="pd-info-label">Vəziyyət</div><p class="pd-info-text">${conditionLabel(p.condition)}</p></div>` : ''}
      ${p.colors && p.colors.length ? `
        <div class="pd-info-block">
          <div class="pd-info-label">Rənglər</div>
          <div class="pd-colors-row">
            ${p.colors.map(c => `<span class="pd-color-dot" style="background:${c.hex};${c.hex==='#FFFFFF'?'border:1px solid #ddd':''}" title="${c.name}"></span>`).join('')}
          </div>
        </div>` : ''}
      ${p.storeName && p._fromFirebase ? `
        <div class="pd-info-block">
          <div class="pd-info-label">Mağaza</div>
          <p class="pd-info-text pd-store-link" onclick="goToStore('${p.userId}')">${p.storeName} →</p>
        </div>` : ''}
    </div>
  `;

  // Açılış animasiyası
  overlay.classList.add('open');
  requestAnimationFrame(() => {
    document.getElementById('pdPanel').classList.add('open');
  });

  // Yorumları yüklə
  await loadReviews(p.id);
}

function closeProductDropdown() {
  const overlay = document.getElementById('pdOverlay');
  const panel   = document.getElementById('pdPanel');
  if (!overlay) return;
  panel.classList.remove('open');
  setTimeout(() => { overlay.classList.remove('open'); }, 320);
}

function pdSwitchTab(tab, btn) {
  document.querySelectorAll('.pd-tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('pdTabInfo').style.display    = tab === 'info'    ? 'block' : 'none';
  document.getElementById('pdTabReviews').style.display = tab === 'reviews' ? 'block' : 'none';
}

/* ══════════════════════════════════════════════════
   YORUM SİSTEMİ — FİREBASE
   ══════════════════════════════════════════════════ */

/* ── Yorumları yüklə ── */
async function loadReviews(productId) {
  const formEl = document.getElementById('pdReviewForm');
  const listEl = document.getElementById('pdReviewList');
  const countEl = document.getElementById('pdReviewCount');
  if (!formEl || !listEl) return;

  listEl.innerHTML = '<div class="rv-loading"><div class="rv-spinner"></div></div>';

  try {
    const snap = await fbDb.collection('reviews')
      .where('productId', '==', String(productId))
      .orderBy('createdAt', 'desc')
      .get();

    const reviews = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    if (countEl) countEl.textContent = reviews.length > 0 ? reviews.length : '';

    // Yorum forması
    renderReviewForm(productId, formEl);

    // Yorum siyahısı
    if (reviews.length === 0) {
      listEl.innerHTML = `
        <div class="rv-empty">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
          </svg>
          <p>Hələ yorum yoxdur. İlk yorumu siz yazın!</p>
        </div>`;
    } else {
      listEl.innerHTML = reviews.map(rv => renderReviewCard(rv, productId)).join('');
      // Cavab formlarını inisialllaşdır
      reviews.forEach(rv => {
        const replyForm = document.getElementById(`replyForm_${rv.id}`);
        if (replyForm) initReplyFormEvents(rv.id, productId);
      });
    }
  } catch (err) {
    if (err.code === 'failed-precondition' || err.message.includes('index')) {
      listEl.innerHTML = `
        <div class="rv-index-error">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          <div>
            <strong>Firebase Index lazımdır</strong>
            <p>Firestore-da <code>reviews</code> kolleksiyası üçün <em>productId + createdAt</em> composite index yaradın.</p>
            <a href="https://console.firebase.google.com/v1/r/project/almoda-62b1e/firestore/indexes?create_composite=CkxwcIm9qZWNOcy9hbGlvZGEtNjJibGUvZmlyZXN0b3JlL2luZGV4ZXMQARoNCgdwcm9kdWN0SWQQARoLCgljcmVhdGVkQXQQAhoMCghfX25hbWVfXxAC" target="_blank" class="rv-index-link">
              Buraya kliklə → Index yarat
            </a>
          </div>
        </div>`;
      renderReviewForm(productId, formEl);
    } else {
      listEl.innerHTML = `<p class="rv-error">Xəta: ${err.message}</p>`;
    }
  }
}

/* ── Yorum forması ── */
function renderReviewForm(productId, container) {
  const user = fbAuth.currentUser;
  if (!user) {
    container.innerHTML = `
      <div class="rv-login-prompt">
        <p>Yorum yazmaq üçün <button class="rv-login-btn" onclick="modal.open('authModal');closeProductDropdown()">daxil olun</button></p>
      </div>`;
    return;
  }

  container.innerHTML = `
    <div class="rv-form-wrap">
      <div class="rv-form-title">Yorum yaz</div>
      <div class="rv-stars-input" id="rvStarsInput" data-rating="0">
        ${[1,2,3,4,5].map(n => `
          <button type="button" class="rv-star-btn" data-val="${n}" onclick="rvSetRating(${n})">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
            </svg>
          </button>`).join('')}
      </div>
      <textarea class="rv-textarea" id="rvText" placeholder="Məhsul haqqında fikirlerinizi yazın..."></textarea>
      <button class="rv-submit-btn" onclick="submitReview('${productId}')">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
        </svg>
        Yorumu göndər
      </button>
    </div>
  `;
}

/* ── Ulduz reytinq ── */
function rvSetRating(val) {
  const wrap = document.getElementById('rvStarsInput');
  if (!wrap) return;
  wrap.dataset.rating = val;
  wrap.querySelectorAll('.rv-star-btn').forEach((btn, i) => {
    const svg = btn.querySelector('svg polygon, svg path');
    if (i < val) {
      btn.querySelector('svg').setAttribute('fill', '#f59e0b');
      btn.querySelector('svg').setAttribute('stroke', '#f59e0b');
    } else {
      btn.querySelector('svg').setAttribute('fill', 'none');
      btn.querySelector('svg').setAttribute('stroke', '#d1d5db');
    }
  });
}

/* ── Yorum göndər ── */
async function submitReview(productId) {
  const user = fbAuth.currentUser;
  if (!user) { showToast && showToast('Daxil olun'); return; }

  const rating  = parseInt(document.getElementById('rvStarsInput')?.dataset.rating || '0');
  const text    = document.getElementById('rvText')?.value.trim();

  if (!rating) { showToast ? showToast('Ulduz reytinq seçin') : alert('Ulduz reytinq seçin'); return; }
  if (!text)   { showToast ? showToast('Yorum mətni yazın')   : alert('Yorum mətni yazın'); return; }

  // İstifadəçi məlumatlarını al
  let displayName = user.displayName || user.email.split('@')[0];
  let isStoreOwner = false;
  let storeOwnerName = '';

  try {
    const [vSnap, uSnap] = await Promise.all([
      fbDb.collection('vendors').doc(user.uid).get(),
      fbDb.collection('users').doc(user.uid).get()
    ]);
    const v = vSnap.exists ? vSnap.data() : {};
    const u = uSnap.exists ? uSnap.data() : {};

    // Mağaza sahibi yoxla: bu məhsul onun elanıdırmı?
    const product = PRODUCTS.find(p => String(p.id) === String(productId));
    if (product && product._fromFirebase && product.userId === user.uid) {
      isStoreOwner = true;
      storeOwnerName = v.storeName || u.storeName || displayName;
    }

    if (!isStoreOwner) {
      const fn = (u.firstName || '').trim();
      const ln = (u.lastName  || '').trim();
      displayName = (fn + ' ' + ln).trim() || user.displayName || user.email.split('@')[0];
    }
  } catch(e) {}

  const submitBtn = document.querySelector('.rv-submit-btn');
  if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Göndərilir...'; }

  try {
    await fbDb.collection('reviews').add({
      productId:    String(productId),
      userId:       user.uid,
      userName:     isStoreOwner ? storeOwnerName : displayName,
      isStoreOwner: isStoreOwner,
      rating,
      text,
      createdAt:    firebase.firestore.FieldValue.serverTimestamp(),
      replies:      []
    });

    if (typeof toast !== 'undefined') toast.show('Yorum əlavə edildi ✓', 'success');
    await loadReviews(productId);
  } catch (err) {
    if (typeof toast !== 'undefined') toast.show('Xəta: ' + err.message, 'error');
    if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Yorumu göndər'; }
  }
}

/* ── Yorum kartı render ── */
function renderReviewCard(rv, productId) {
  const user = fbAuth.currentUser;
  const canReply = user && !rv.isStoreOwner; // mağaza sahibi cavab verə bilər
  const isOwner  = user && rv.userId === user.uid;

  // Mağaza sahibinin cavab verə biləcəyini yoxla
  const product = PRODUCTS.find(p => String(p.id) === String(productId));
  const isStoreOwner = user && product && product._fromFirebase && product.userId === user.uid;

  const starsHTML = Array.from({length:5}, (_,i) => `
    <svg width="13" height="13" viewBox="0 0 24 24"
      fill="${i < rv.rating ? '#f59e0b' : 'none'}"
      stroke="${i < rv.rating ? '#f59e0b' : '#d1d5db'}"
      stroke-width="2">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    </svg>`).join('');

  const timeStr = rv.createdAt?.toDate
    ? rv.createdAt.toDate().toLocaleDateString('az-AZ', { day:'2-digit', month:'short', year:'numeric' })
    : '';

  const repliesHTML = (rv.replies || []).map(r => `
    <div class="rv-reply">
      <div class="rv-reply-header">
        <span class="rv-reply-author ${r.isStoreOwner ? 'rv-store-badge' : ''}">
          ${r.isStoreOwner ? '🏪 ' : ''}${r.userName}
        </span>
        <span class="rv-reply-time">${r.createdAt ? new Date(r.createdAt.seconds*1000).toLocaleDateString('az-AZ',{day:'2-digit',month:'short'}) : ''}</span>
      </div>
      <p class="rv-reply-text">${r.text}</p>
    </div>`).join('');

  return `
    <div class="rv-card" id="rvCard_${rv.id}">
      <div class="rv-card-header">
        <div class="rv-user-info">
          <div class="rv-avatar">${(rv.userName||'?')[0].toUpperCase()}</div>
          <div>
            <div class="rv-username ${rv.isStoreOwner ? 'rv-store-badge' : ''}">
              ${rv.isStoreOwner ? '🏪 ' : ''}${rv.userName}
            </div>
            <div class="rv-stars-row">${starsHTML}<span class="rv-time">${timeStr}</span></div>
          </div>
        </div>
        ${isOwner ? `
          <button class="rv-delete-btn" onclick="deleteReview('${rv.id}','${productId}')" title="Sil">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6m5 0V4h4v2"/>
            </svg>
          </button>` : ''}
      </div>
      <p class="rv-text">${rv.text}</p>

      <!-- Cavablar -->
      ${repliesHTML ? `<div class="rv-replies">${repliesHTML}</div>` : ''}

      <!-- Cavab ver düyməsi — mağaza sahibinə göstər -->
      ${(isStoreOwner && !rv.isStoreOwner) ? `
        <button class="rv-reply-toggle" onclick="toggleReplyForm('${rv.id}')">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="9 17 4 12 9 7"/><path d="M20 18v-2a4 4 0 00-4-4H4"/>
          </svg>
          Cavab ver
        </button>
        <div id="replyForm_${rv.id}" class="rv-reply-form" style="display:none;">
          <textarea class="rv-textarea rv-reply-textarea" id="replyText_${rv.id}" placeholder="Cavabınızı yazın..."></textarea>
          <div style="display:flex;gap:.5rem;justify-content:flex-end;margin-top:.5rem;">
            <button class="rv-cancel-reply" onclick="toggleReplyForm('${rv.id}')">Ləğv et</button>
            <button class="rv-send-reply" onclick="sendReply('${rv.id}','${productId}')">Göndər</button>
          </div>
        </div>` : ''}
    </div>`;
}

/* ── Cavab forması göstər/gizlə ── */
function toggleReplyForm(reviewId) {
  const form = document.getElementById(`replyForm_${reviewId}`);
  if (!form) return;
  const isOpen = form.style.display !== 'none';
  form.style.display = isOpen ? 'none' : 'block';
  if (!isOpen) document.getElementById(`replyText_${reviewId}`)?.focus();
}

function initReplyFormEvents(reviewId, productId) { /* Hazırda onclick-lə idarə olunur */ }

/* ── Cavab göndər ── */
async function sendReply(reviewId, productId) {
  const user = fbAuth.currentUser;
  if (!user) return;

  const text = document.getElementById(`replyText_${reviewId}`)?.value.trim();
  if (!text) { showToast ? showToast('Cavab mətni yazın') : alert('Cavab mətni yazın'); return; }

  let storeName = user.displayName || '';
  try {
    const [vSnap, uSnap] = await Promise.all([
      fbDb.collection('vendors').doc(user.uid).get(),
      fbDb.collection('users').doc(user.uid).get()
    ]);
    const v = vSnap.exists ? vSnap.data() : {};
    const u = uSnap.exists ? uSnap.data() : {};
    storeName = v.storeName || u.storeName || storeName;
  } catch(e) {}

  const btn = document.querySelector(`#replyForm_${reviewId} .rv-send-reply`);
  if (btn) { btn.disabled = true; btn.textContent = 'Göndərilir...'; }

  try {
    const reply = {
      userId:       user.uid,
      userName:     storeName,
      isStoreOwner: true,
      text,
      createdAt:    firebase.firestore.Timestamp.now()
    };

    await fbDb.collection('reviews').doc(reviewId).update({
      replies: firebase.firestore.FieldValue.arrayUnion(reply)
    });

    if (typeof toast !== 'undefined') toast.show('Cavab göndərildi ✓', 'success');
    await loadReviews(productId);
  } catch (err) {
    if (typeof toast !== 'undefined') toast.show('Xəta: ' + err.message, 'error');
    if (btn) { btn.disabled = false; btn.textContent = 'Göndər'; }
  }
}

/* ── Yorum sil ── */
async function deleteReview(reviewId, productId) {
  if (!confirm('Bu yorumu silmək istəyirsiniz?')) return;
  try {
    await fbDb.collection('reviews').doc(reviewId).delete();
    if (typeof toast !== 'undefined') toast.show('Yorum silindi', 'success');
    await loadReviews(productId);
  } catch (err) {
    if (typeof toast !== 'undefined') toast.show('Xəta: ' + err.message, 'error');
  }
}

/* ══════════════════════════════════════════════════
   LİSTİNGS.JS-ə ƏLAVƏ — "Yorumlar" KARTI
   loadListingsTab() funksiyasına əlavə et.
   Aşağıdakı loadListingReviewsCard() funksiyasını
   fetchUserListings()-dən sonra çağırın.
   ══════════════════════════════════════════════════ */
async function loadListingReviewsCard(uid) {
  injectReviewStyles();

  const container = document.getElementById('tab-listings');
  if (!container) return;

  // Mövcud "yorumlar kartı" varsa çıxart
  const existing = document.getElementById('listingReviewsCard');
  if (existing) existing.remove();

  const card = document.createElement('div');
  card.id = 'listingReviewsCard';
  card.className = 'section-card';
  card.style.marginTop = '1.5rem';
  card.innerHTML = `
    <div class="section-title" style="padding-bottom:0.75rem;border-bottom:1px solid var(--border);margin-bottom:1rem;">
      💬 Məhsullarıma gələn yorumlar
    </div>
    <div id="listingReviewsBody">
      <div class="rv-loading"><div class="rv-spinner"></div></div>
    </div>
  `;
  container.appendChild(card);

  try {
    // İstifadəçinin bütün elanlarını al
    const listSnap = await fbDb.collection('listings')
      .where('userId', '==', uid)
      .get();

    if (listSnap.empty) {
      document.getElementById('listingReviewsBody').innerHTML =
        '<p style="color:var(--muted);font-size:.875rem;text-align:center;padding:1.5rem 0;">Hələ elanınız yoxdur</p>';
      return;
    }

    const listings = listSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const listingIds = listings.map(l => String(l.id));

    // Bütün yorumları yüklə (Firebase-də 'in' max 10 element dəstəkləyir)
    let allReviews = [];
    const chunks = [];
    for (let i = 0; i < listingIds.length; i += 10) {
      chunks.push(listingIds.slice(i, i + 10));
    }

    for (const chunk of chunks) {
      const snap = await fbDb.collection('reviews')
        .where('productId', 'in', chunk)
        .orderBy('createdAt', 'desc')
        .get();
      allReviews = allReviews.concat(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }

    if (allReviews.length === 0) {
      document.getElementById('listingReviewsBody').innerHTML =
        '<p style="color:var(--muted);font-size:.875rem;text-align:center;padding:1.5rem 0;">Heç bir məhsulunuza yorum gəlməyib</p>';
      return;
    }

    // Yorumları məhsula görə qruplaşdır
    const grouped = {};
    allReviews.forEach(rv => {
      if (!grouped[rv.productId]) grouped[rv.productId] = [];
      grouped[rv.productId].push(rv);
    });

    const listingMap = {};
    listings.forEach(l => { listingMap[l.id] = l; });

    let html = '';
    for (const [productId, reviews] of Object.entries(grouped)) {
      const listing = listingMap[productId];
      if (!listing) continue;
      const img = (listing.imgs && listing.imgs[0]) || '';
      const avgRating = (reviews.reduce((s,r) => s + (r.rating||0), 0) / reviews.length).toFixed(1);

      html += `
        <div class="lrv-product-block">
          <div class="lrv-product-header">
            <div class="lrv-product-img">
              ${img ? `<img src="${img}" alt="${listing.name}">` : '<div class="lrv-no-img">👗</div>'}
            </div>
            <div class="lrv-product-meta">
              <div class="lrv-product-name">${listing.name}</div>
              <div class="lrv-product-stats">
                <span class="lrv-avg-stars">${renderStarsSmall(parseFloat(avgRating))}</span>
                <span class="lrv-avg-num">${avgRating}</span>
                <span class="lrv-review-cnt">${reviews.length} yorum</span>
              </div>
            </div>
          </div>
          <div class="lrv-reviews-list">
            ${reviews.map(rv => renderListingReviewRow(rv, productId)).join('')}
          </div>
        </div>`;
    }

    document.getElementById('listingReviewsBody').innerHTML = html;

  } catch (err) {
    const body = document.getElementById('listingReviewsBody');
    if (err.code === 'failed-precondition' || err.message.includes('index')) {
      body.innerHTML = `
        <div class="rv-index-error">
          <strong>Firebase Index lazımdır</strong>
          <p>Firestore console-da <code>reviews</code> kolleksiyası üçün <b>productId (Asc) + createdAt (Desc)</b> composite index yaradın.</p>
          <a href="https://console.firebase.google.com/project/almoda-62b1e/firestore/indexes" target="_blank" class="rv-index-link">Firebase Console-a keç →</a>
        </div>`;
    } else {
      body.innerHTML = `<p style="color:var(--danger);font-size:.875rem;">Xəta: ${err.message}</p>`;
    }
  }
}

/* ── Listings-də yorum sətri ── */
function renderListingReviewRow(rv, productId) {
  const starsHTML = renderStarsSmall(rv.rating);
  const timeStr   = rv.createdAt?.toDate
    ? rv.createdAt.toDate().toLocaleDateString('az-AZ', {day:'2-digit',month:'short',year:'numeric'})
    : '';

  const hasReplies = rv.replies && rv.replies.length > 0;

  return `
    <div class="lrv-row">
      <div class="lrv-row-left">
        <div class="lrv-row-avatar">${(rv.userName||'?')[0].toUpperCase()}</div>
        <div class="lrv-row-meta">
          <span class="lrv-row-name">${rv.userName}</span>
          <span class="lrv-row-stars">${starsHTML}</span>
        </div>
      </div>
      <div class="lrv-row-right">
        <p class="lrv-row-text">${rv.text}</p>
        ${hasReplies ? `
          <div class="lrv-existing-replies">
            ${rv.replies.map(r => `
              <div class="lrv-reply-preview">
                <span class="lrv-reply-you">Siz:</span> ${r.text}
              </div>`).join('')}
          </div>` : ''}
        <div style="display:flex;align-items:center;gap:.5rem;flex-wrap:wrap;margin-top:.35rem;">
          <span class="lrv-time">${timeStr}</span>
          <button class="rv-reply-toggle lrv-reply-btn" onclick="toggleLrvReply('${rv.id}','${productId}')">
            ${hasReplies ? '✏️ Yenidən cavabla' : '💬 Cavab ver'}
          </button>
        </div>
      </div>
    </div>
    <div id="lrvReply_${rv.id}" class="rv-reply-form" style="display:none;margin-left:2.5rem;">
      <textarea class="rv-textarea rv-reply-textarea" id="lrvReplyText_${rv.id}" placeholder="Cavabınızı yazın..."></textarea>
      <div style="display:flex;gap:.5rem;justify-content:flex-end;margin-top:.5rem;">
        <button class="rv-cancel-reply" onclick="toggleLrvReply('${rv.id}','${productId}')">Ləğv et</button>
        <button class="rv-send-reply" onclick="sendLrvReply('${rv.id}','${productId}')">Göndər</button>
      </div>
    </div>`;
}

function toggleLrvReply(reviewId, productId) {
  const form = document.getElementById(`lrvReply_${reviewId}`);
  if (!form) return;
  const isOpen = form.style.display !== 'none';
  form.style.display = isOpen ? 'none' : 'block';
  if (!isOpen) document.getElementById(`lrvReplyText_${reviewId}`)?.focus();
}

async function sendLrvReply(reviewId, productId) {
  const user = fbAuth.currentUser;
  if (!user) return;
  const text = document.getElementById(`lrvReplyText_${reviewId}`)?.value.trim();
  if (!text) { showToast ? showToast('Cavab mətni yazın') : alert('Cavab yazın'); return; }

  let storeName = user.displayName || '';
  try {
    const [vSnap, uSnap] = await Promise.all([
      fbDb.collection('vendors').doc(user.uid).get(),
      fbDb.collection('users').doc(user.uid).get()
    ]);
    const v = vSnap.exists ? vSnap.data() : {};
    const u = uSnap.exists ? uSnap.data() : {};
    storeName = v.storeName || u.storeName || storeName;
  } catch(e) {}

  const btn = document.querySelector(`#lrvReply_${reviewId} .rv-send-reply`);
  if (btn) { btn.disabled = true; btn.textContent = 'Göndərilir...'; }

  try {
    const reply = {
      userId: user.uid, userName: storeName,
      isStoreOwner: true, text,
      createdAt: firebase.firestore.Timestamp.now()
    };
    await fbDb.collection('reviews').doc(reviewId).update({
      replies: firebase.firestore.FieldValue.arrayUnion(reply)
    });
    if (typeof toast !== 'undefined') toast.show('Cavab göndərildi ✓', 'success');
    // Yorumlar kartını yenilə
    const uid = fbAuth.currentUser?.uid;
    if (uid) await loadListingReviewsCard(uid);
  } catch (err) {
    if (typeof toast !== 'undefined') toast.show('Xəta: ' + err.message, 'error');
    if (btn) { btn.disabled = false; btn.textContent = 'Göndər'; }
  }
}

/* ── Kiçik ulduz render ── */
function renderStarsSmall(rating) {
  return Array.from({length:5}, (_,i) => `
    <svg width="11" height="11" viewBox="0 0 24 24"
      fill="${i < Math.round(rating) ? '#f59e0b' : 'none'}"
      stroke="${i < Math.round(rating) ? '#f59e0b' : '#d1d5db'}"
      stroke-width="2" style="display:inline;vertical-align:middle">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    </svg>`).join('');
}

/* ── Vəziyyət labeli ── */
function conditionLabel(v) {
  return { new:'Yeni', like_new:'Yeni kimi', good:'Yaxşı', used:'İşlənmiş' }[v] || v;
}

/* ══════════════════════════════════════════════════
   STİLLƏR
   ══════════════════════════════════════════════════ */
function injectReviewStyles() {
  if (document.getElementById('reviewStyles')) return;
  const s = document.createElement('style');
  s.id = 'reviewStyles';
  s.textContent = `
  /* ── Dropdown Overlay ── */
  .pd-overlay {
    position: fixed; inset: 0; z-index: 600;
    background: rgba(10,8,5,.6); backdrop-filter: blur(8px);
    display: flex; align-items: center; justify-content: center;
    opacity: 0; pointer-events: none; transition: opacity .3s;
    padding: 1rem;
  }
  .pd-overlay.open { opacity: 1; pointer-events: all; }

  .pd-panel {
    background: #fff; border-radius: 20px;
    width: 100%; max-width: 560px; max-height: 88vh;
    overflow-y: auto; position: relative;
    box-shadow: 0 32px 80px rgba(0,0,0,.22);
    transform: translateY(24px) scale(.97);
    transition: transform .32s cubic-bezier(.34,1.46,.64,1);
  }
  .pd-panel.open { transform: translateY(0) scale(1); }

  .pd-close {
    position: absolute; top: 1rem; right: 1rem;
    width: 32px; height: 32px; border-radius: 50%;
    border: 1.5px solid var(--border,#e5e0d8);
    background: var(--bg,#faf9f7);
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; color: var(--muted,#888); z-index: 2;
    transition: all .18s;
  }
  .pd-close:hover { background: var(--border); color: #1a1a1a; }

  /* ── Məhsul başlığı ── */
  .pd-product-header {
    display: flex; gap: 1rem; padding: 1.5rem 1.5rem 0;
    align-items: flex-start;
  }
  .pd-prod-img-wrap {
    width: 90px; height: 110px; border-radius: 10px;
    overflow: hidden; flex-shrink: 0;
    border: 1px solid var(--border,#e5e0d8);
  }
  .pd-prod-img-wrap img { width: 100%; height: 100%; object-fit: cover; }
  .pd-prod-no-img { width:100%; height:100%; display:flex; align-items:center; justify-content:center; font-size:2rem; background:#f0ece6; }
  .pd-prod-info { flex: 1; padding-top: .25rem; }
  .pd-prod-brand { font-size: .7rem; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: #b07a4a; margin-bottom: 3px; }
  .pd-prod-name  { font-size: 1rem; font-weight: 600; line-height: 1.35; margin-bottom: .5rem; }
  .pd-prod-price-row { display: flex; align-items: baseline; gap: .5rem; margin-bottom: .5rem; }
  .pd-old-price  { font-size: .8rem; color: var(--muted); text-decoration: line-through; }
  .pd-price      { font-size: 1.05rem; font-weight: 700; }
  .pd-price.sale { color: #dc2626; }
  .pd-sizes      { display: flex; flex-wrap: wrap; gap: .3rem; }
  .pd-size-chip  { font-size: .7rem; padding: 2px 8px; border-radius: 20px; border: 1.5px solid var(--border); }
  .pd-store-link { cursor: pointer; color: #b07a4a; font-weight: 500; }
  .pd-store-link:hover { text-decoration: underline; }

  /* ── Tabs ── */
  .pd-tabs {
    display: flex; gap: .25rem; padding: 1rem 1.5rem .5rem;
    border-bottom: 1px solid var(--border,#e5e0d8);
  }
  .pd-tab {
    padding: .4rem .9rem; border-radius: 20px; border: none;
    background: none; font-size: .82rem; font-weight: 500;
    cursor: pointer; color: var(--muted,#888); transition: all .18s;
    display: flex; align-items: center; gap: .35rem;
  }
  .pd-tab.active { background: var(--accent,#1a1a1a); color: #fff; }
  .pd-review-count {
    display: inline-block; background: #fee2e2; color: #dc2626;
    border-radius: 20px; font-size: .68rem; font-weight: 700;
    padding: 1px 7px; min-width: 18px; text-align: center;
  }

  /* ── Tab içlər ── */
  .pd-tab-content { padding: 1.25rem 1.5rem 1.75rem; }

  .pd-info-grid  { display: flex; flex-direction: column; gap: .85rem; }
  .pd-info-block {}
  .pd-info-label { font-size: .72rem; font-weight: 700; letter-spacing: .05em; text-transform: uppercase; color: var(--muted); margin-bottom: .25rem; }
  .pd-info-text  { font-size: .875rem; line-height: 1.6; color: #333; }
  .pd-colors-row { display: flex; gap: 5px; flex-wrap: wrap; margin-top: .25rem; }
  .pd-color-dot  { width: 18px; height: 18px; border-radius: 50%; }

  /* ── Yorum forması ── */
  .rv-form-wrap {
    background: var(--bg,#faf9f7); border-radius: 12px;
    padding: 1rem; margin-bottom: 1.25rem;
    border: 1.5px solid var(--border,#e5e0d8);
  }
  .rv-form-title { font-size: .8rem; font-weight: 600; margin-bottom: .6rem; color: #555; }
  .rv-stars-input { display: flex; gap: 3px; margin-bottom: .6rem; }
  .rv-star-btn { background: none; border: none; cursor: pointer; padding: 2px; transition: transform .15s; }
  .rv-star-btn:hover { transform: scale(1.2); }
  .rv-star-btn svg { width: 24px; height: 24px; display: block; }
  .rv-textarea {
    width: 100%; padding: .65rem .85rem;
    border: 1.5px solid var(--border,#e5e0d8); border-radius: 8px;
    font-family: inherit; font-size: .875rem; resize: vertical;
    min-height: 80px; outline: none; transition: border-color .18s;
    background: #fff;
  }
  .rv-textarea:focus { border-color: var(--accent,#1a1a1a); }
  .rv-reply-textarea { min-height: 60px; }
  .rv-submit-btn {
    display: flex; align-items: center; gap: .4rem;
    margin-top: .6rem; padding: .55rem 1.1rem;
    background: var(--accent,#1a1a1a); color: #fff;
    border: none; border-radius: 8px; font-size: .82rem;
    font-weight: 600; cursor: pointer; transition: opacity .18s;
    font-family: inherit;
  }
  .rv-submit-btn:hover { opacity: .85; }
  .rv-submit-btn:disabled { opacity: .5; cursor: not-allowed; }

  /* ── Yorum kartları ── */
  .rv-card {
    border: 1px solid var(--border,#e5e0d8); border-radius: 12px;
    padding: 1rem; margin-bottom: .75rem; background: #fff;
  }
  .rv-card-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: .5rem; }
  .rv-user-info   { display: flex; align-items: center; gap: .65rem; }
  .rv-avatar {
    width: 34px; height: 34px; border-radius: 50%;
    background: var(--accent,#1a1a1a); color: #fff;
    display: flex; align-items: center; justify-content: center;
    font-size: .85rem; font-weight: 700; flex-shrink: 0;
  }
  .rv-username    { font-size: .85rem; font-weight: 600; }
  .rv-store-badge { color: #b07a4a; }
  .rv-stars-row   { display: flex; align-items: center; gap: .25rem; margin-top: 2px; }
  .rv-time        { font-size: .7rem; color: var(--muted); margin-left: .35rem; }
  .rv-text        { font-size: .875rem; line-height: 1.6; color: #333; }
  .rv-delete-btn  {
    background: none; border: none; cursor: pointer;
    color: #d1d5db; padding: 4px; border-radius: 6px; transition: color .18s;
  }
  .rv-delete-btn:hover { color: #dc2626; }

  /* ── Cavablar ── */
  .rv-replies { margin: .65rem 0 .5rem 2.5rem; border-left: 2px solid var(--border,#e5e0d8); padding-left: .85rem; }
  .rv-reply { margin-bottom: .5rem; }
  .rv-reply-header { display: flex; align-items: center; gap: .5rem; margin-bottom: .2rem; }
  .rv-reply-author { font-size: .78rem; font-weight: 600; }
  .rv-reply-time   { font-size: .68rem; color: var(--muted); }
  .rv-reply-text   { font-size: .82rem; color: #444; }

  .rv-reply-toggle {
    display: inline-flex; align-items: center; gap: .3rem;
    padding: .3rem .7rem; border-radius: 6px; margin-top: .5rem;
    border: 1.5px solid var(--border); background: none;
    font-size: .75rem; font-weight: 500; cursor: pointer;
    color: var(--muted); transition: all .15s; font-family: inherit;
  }
  .rv-reply-toggle:hover { border-color: var(--accent); color: var(--accent); }

  .rv-reply-form { margin-top: .65rem; padding: .75rem; background: var(--bg,#faf9f7); border-radius: 10px; }
  .rv-cancel-reply, .rv-send-reply {
    padding: .38rem .85rem; border-radius: 7px; font-size: .78rem;
    font-weight: 500; cursor: pointer; transition: all .15s; font-family: inherit;
  }
  .rv-cancel-reply { background: none; border: 1.5px solid var(--border); color: var(--muted); }
  .rv-cancel-reply:hover { border-color: var(--accent); color: var(--accent); }
  .rv-send-reply { background: var(--accent,#1a1a1a); color: #fff; border: none; }
  .rv-send-reply:hover { opacity: .85; }
  .rv-send-reply:disabled { opacity: .5; }

  /* ── Empty / Loading / Error ── */
  .rv-empty {
    text-align: center; padding: 2rem;
    color: var(--muted); display: flex; flex-direction: column;
    align-items: center; gap: .65rem; font-size: .875rem;
  }
  .rv-loading { display: flex; justify-content: center; padding: 2rem; }
  .rv-spinner {
    width: 28px; height: 28px; border-radius: 50%;
    border: 3px solid var(--border); border-top-color: var(--accent,#1a1a1a);
    animation: rvSpin .7s linear infinite;
  }
  @keyframes rvSpin { to { transform: rotate(360deg); } }
  .rv-error { color: var(--danger,#dc2626); font-size: .875rem; text-align: center; padding: 1rem; }

  .rv-index-error {
    display: flex; gap: .75rem; align-items: flex-start;
    background: #fffbeb; border: 1.5px solid #fde68a;
    border-radius: 10px; padding: .9rem 1rem; margin-bottom: .75rem;
  }
  .rv-index-error strong { font-size: .85rem; display: block; margin-bottom: .25rem; }
  .rv-index-error p { font-size: .8rem; color: #555; margin-bottom: .35rem; }
  .rv-index-link {
    display: inline-block; font-size: .78rem; font-weight: 600;
    color: #d97706; text-decoration: underline;
  }

  .rv-login-prompt {
    text-align: center; padding: 1rem;
    font-size: .875rem; color: var(--muted);
    background: var(--bg,#faf9f7); border-radius: 10px;
    margin-bottom: 1rem;
  }
  .rv-login-btn {
    background: none; border: none; color: var(--accent,#1a1a1a);
    font-weight: 700; cursor: pointer; text-decoration: underline;
    font-size: inherit; font-family: inherit;
  }

  /* ── Listings-dəki yorum paneli ── */
  .lrv-product-block {
    border: 1px solid var(--border); border-radius: 12px;
    overflow: hidden; margin-bottom: 1rem;
  }
  .lrv-product-header {
    display: flex; align-items: center; gap: .85rem;
    padding: .85rem 1rem; background: var(--bg,#faf9f7);
    border-bottom: 1px solid var(--border);
  }
  .lrv-product-img {
    width: 52px; height: 64px; border-radius: 8px;
    overflow: hidden; flex-shrink: 0; border: 1px solid var(--border);
  }
  .lrv-product-img img { width: 100%; height: 100%; object-fit: cover; }
  .lrv-no-img { width:100%; height:100%; display:flex; align-items:center; justify-content:center; font-size:1.5rem; background:#f0ece6; }
  .lrv-product-name  { font-size: .88rem; font-weight: 600; margin-bottom: .3rem; }
  .lrv-product-stats { display: flex; align-items: center; gap: .4rem; }
  .lrv-avg-num       { font-size: .78rem; font-weight: 700; color: #f59e0b; }
  .lrv-review-cnt    { font-size: .72rem; color: var(--muted); }

  .lrv-reviews-list { padding: .5rem .75rem; }
  .lrv-row {
    display: flex; gap: .75rem; padding: .7rem 0;
    border-bottom: 1px solid var(--border);
  }
  .lrv-row:last-child { border-bottom: none; }
  .lrv-row-left  { display: flex; align-items: flex-start; gap: .5rem; flex-shrink: 0; }
  .lrv-row-avatar {
    width: 28px; height: 28px; border-radius: 50%;
    background: #e5e0d8; color: #555;
    display: flex; align-items: center; justify-content: center;
    font-size: .72rem; font-weight: 700;
  }
  .lrv-row-meta  { display: flex; flex-direction: column; gap: 2px; }
  .lrv-row-name  { font-size: .78rem; font-weight: 600; }
  .lrv-row-stars { display: flex; }
  .lrv-row-right { flex: 1; }
  .lrv-row-text  { font-size: .82rem; color: #444; line-height: 1.5; margin-bottom: .25rem; }
  .lrv-time      { font-size: .68rem; color: var(--muted); }
  .lrv-reply-btn { padding: .2rem .55rem; font-size: .7rem; }
  .lrv-existing-replies { margin: .3rem 0; }
  .lrv-reply-preview { font-size: .78rem; color: #666; padding: .25rem .5rem; background: var(--bg); border-radius: 6px; margin-bottom: .2rem; }
  .lrv-reply-you { font-weight: 700; color: #b07a4a; }

  @media (max-width: 560px) {
    .pd-panel { border-radius: 20px 20px 0 0; max-height: 92vh; }
    .pd-overlay { align-items: flex-end; padding: 0; }
    .pd-product-header { flex-direction: column; }
    .pd-prod-img-wrap { width: 100%; height: 180px; }
  }
  `;
  document.head.appendChild(s);
}
