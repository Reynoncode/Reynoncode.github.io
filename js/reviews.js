/* ═══════════════════════════════════════════════════
   reviews.js — Yorum sistemi (düzəldilmiş versiya)

   Bu fayl YALNIZ profil səhifəsindəki
   "Məhsullarıma gələn yorumlar" kartını idarə edir.

   ✅ Məhsul kartı klikləri   → product-detail.js
   ✅ Dropdown panel          → product-detail.js
   ✅ Yorum yazma/göstərmə   → product-detail.js
   ✅ Profil/Listings yorumları → reviews.js (bu fayl)

   Script bağlantı sırası HTML-də:
     <script src="js/firebase.js"></script>
     <script src="js/products.js"></script>
     <script src="js/product-detail.js"></script>
     <script src="js/reviews.js"></script>
   ═══════════════════════════════════════════════════ */


/* ══════════════════════════════════════════════════
   PROFİL SƏHİFƏSİ — "Məhsullarıma gələn yorumlar" KARTI
   listings.js-dəki fetchUserListings()-dən sonra çağırın:
     await loadListingReviewsCard(uid);
   ══════════════════════════════════════════════════ */
async function loadListingReviewsCard(uid) {
  injectListingReviewStyles();

  const container = document.getElementById('tab-listings');
  if (!container) return;

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
      <div class="lrv-loading"><div class="lrv-spinner"></div></div>
    </div>
  `;
  container.appendChild(card);

  try {
    const listSnap = await fbDb.collection('listings')
      .where('userId', '==', uid)
      .get();

    if (listSnap.empty) {
      document.getElementById('listingReviewsBody').innerHTML =
        '<p style="color:var(--muted);font-size:.875rem;text-align:center;padding:1.5rem 0;">Hələ elanınız yoxdur</p>';
      return;
    }

    const listings    = listSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const listingIds  = listings.map(l => String(l.id));
    let   allReviews  = [];

    for (let i = 0; i < listingIds.length; i += 10) {
      const chunk = listingIds.slice(i, i + 10);
      const snap  = await fbDb.collection('reviews')
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

    const grouped    = {};
    const listingMap = {};
    allReviews.forEach(rv => {
      if (!grouped[rv.productId]) grouped[rv.productId] = [];
      grouped[rv.productId].push(rv);
    });
    listings.forEach(l => { listingMap[l.id] = l; });

    let html = '';
    for (const [productId, reviews] of Object.entries(grouped)) {
      const listing = listingMap[productId];
      if (!listing) continue;
      const img       = (listing.imgs && listing.imgs[0]) || '';
      const avgRating = (reviews.reduce((s, r) => s + (r.rating || 0), 0) / reviews.length).toFixed(1);

      html += `
        <div class="lrv-product-block">
          <div class="lrv-product-header">
            <div class="lrv-product-img">
              ${img ? `<img src="${img}" alt="${listing.name}">` : '<div class="lrv-no-img">👗</div>'}
            </div>
            <div class="lrv-product-meta">
              <div class="lrv-product-name">${listing.name}</div>
              <div class="lrv-product-stats">
                <span class="lrv-avg-stars">${lrvStars(parseFloat(avgRating))}</span>
                <span class="lrv-avg-num">${avgRating}</span>
                <span class="lrv-review-cnt">${reviews.length} yorum</span>
              </div>
            </div>
          </div>
          <div class="lrv-reviews-list">
            ${reviews.map(rv => lrvReviewRow(rv, productId)).join('')}
          </div>
        </div>`;
    }

    document.getElementById('listingReviewsBody').innerHTML = html;

  } catch (err) {
    const body = document.getElementById('listingReviewsBody');
    if (err.code === 'failed-precondition' || err.message.includes('index')) {
      body.innerHTML = `
        <div class="lrv-index-error">
          <strong>⚠️ Firebase Index lazımdır</strong>
          <p>Firestore-da <code>reviews</code> kolleksiyası üçün
             <b>productId (Asc) + createdAt (Desc)</b> composite index yaradın.</p>
          <a href="https://console.firebase.google.com/project/almoda-62b1e/firestore/indexes"
             target="_blank" class="lrv-index-link">Firebase Console-a keç →</a>
        </div>`;
    } else {
      body.innerHTML =
        `<p style="color:var(--danger,#e63946);font-size:.875rem;padding:1rem 0;">Xəta: ${err.message}</p>`;
    }
  }
}

/* ── Yorum sətri ── */
function lrvReviewRow(rv, productId) {
  const timeStr    = rv.createdAt?.toDate
    ? rv.createdAt.toDate().toLocaleDateString('az-AZ', { day: '2-digit', month: 'short', year: 'numeric' })
    : '';
  const hasReplies = rv.replies && rv.replies.length > 0;

  return `
    <div class="lrv-row">
      <div class="lrv-row-left">
        <div class="lrv-row-avatar">${(rv.userName || '?')[0].toUpperCase()}</div>
        <div class="lrv-row-meta">
          <span class="lrv-row-name">${rv.userName}</span>
          <span class="lrv-row-stars">${lrvStars(rv.rating)}</span>
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
          <button class="lrv-reply-btn" onclick="lrvToggleReply('${rv.id}')">
            ${hasReplies ? '✏️ Yenidən cavabla' : '💬 Cavab ver'}
          </button>
        </div>
      </div>
    </div>
    <div id="lrvReply_${rv.id}" class="lrv-reply-form" style="display:none;margin-left:2.5rem;">
      <textarea class="lrv-reply-textarea" id="lrvReplyText_${rv.id}"
        placeholder="Cavabınızı yazın..."></textarea>
      <div style="display:flex;gap:.5rem;justify-content:flex-end;margin-top:.5rem;">
        <button class="lrv-cancel-btn" onclick="lrvToggleReply('${rv.id}')">Ləğv et</button>
        <button class="lrv-send-btn" onclick="lrvSendReply('${rv.id}','${productId}')">Göndər</button>
      </div>
    </div>`;
}

/* ── Cavab forması aç / bağla ── */
function lrvToggleReply(reviewId) {
  const form = document.getElementById(`lrvReply_${reviewId}`);
  if (!form) return;
  const isOpen = form.style.display !== 'none';
  form.style.display = isOpen ? 'none' : 'block';
  if (!isOpen) document.getElementById(`lrvReplyText_${reviewId}`)?.focus();
}

/* ── Cavab göndər ── */
async function lrvSendReply(reviewId, productId) {
  const user = fbAuth.currentUser;
  if (!user) return;

  const text = document.getElementById(`lrvReplyText_${reviewId}`)?.value.trim();
  if (!text) { toast.show('Cavab mətni yazın', 'default'); return; }

  let storeName = user.displayName || '';
  try {
    const [vSnap, uSnap] = await Promise.all([
      fbDb.collection('vendors').doc(user.uid).get(),
      fbDb.collection('users').doc(user.uid).get()
    ]);
    storeName = vSnap.data()?.storeName || uSnap.data()?.storeName || storeName;
  } catch (e) {}

  const btn = document.querySelector(`#lrvReply_${reviewId} .lrv-send-btn`);
  if (btn) { btn.disabled = true; btn.textContent = 'Göndərilir...'; }

  try {
    await fbDb.collection('reviews').doc(reviewId).update({
      replies: firebase.firestore.FieldValue.arrayUnion({
        userId:       user.uid,
        userName:     storeName,
        isStoreOwner: true,
        text,
        createdAt:    firebase.firestore.Timestamp.now()
      })
    });
    toast.show('Cavab göndərildi ✓', 'success');
    const currentUid = fbAuth.currentUser?.uid;
    if (currentUid) await loadListingReviewsCard(currentUid);
  } catch (err) {
    toast.show('Xəta: ' + err.message, 'error');
    if (btn) { btn.disabled = false; btn.textContent = 'Göndər'; }
  }
}

/* ── Ulduz render ── */
function lrvStars(rating) {
  return Array.from({ length: 5 }, (_, i) => `
    <svg width="11" height="11" viewBox="0 0 24 24"
      fill="${i < Math.round(rating) ? '#f59e0b' : 'none'}"
      stroke="${i < Math.round(rating) ? '#f59e0b' : '#d1d5db'}"
      stroke-width="2" style="display:inline;vertical-align:middle">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02
                       12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    </svg>`).join('');
}


/* ══════════════════════════════════════════════════
   STİLLƏR — yalnız listings/profil kartı üçün
   (pd-overlay, pd-panel stilləri product-detail.js-dədir)
   ══════════════════════════════════════════════════ */
function injectListingReviewStyles() {
  if (document.getElementById('lrvStyles')) return;
  const s  = document.createElement('style');
  s.id     = 'lrvStyles';
  s.textContent = `
  .lrv-loading {
    display:flex; justify-content:center; padding:2rem;
  }
  .lrv-spinner {
    width:28px; height:28px; border-radius:50%;
    border:3px solid var(--border,#e5e0d8);
    border-top-color:var(--accent,#c9a86c);
    animation:lrvSpin .7s linear infinite;
  }
  @keyframes lrvSpin { to { transform:rotate(360deg); } }

  /* Məhsul bloku */
  .lrv-product-block {
    border:1px solid var(--border,#e5e0d8); border-radius:12px;
    overflow:hidden; margin-bottom:1rem;
  }
  .lrv-product-header {
    display:flex; align-items:center; gap:.85rem;
    padding:.85rem 1rem; background:var(--bg,#f7f4f0);
    border-bottom:1px solid var(--border,#e5e0d8);
  }
  .lrv-product-img {
    width:52px; height:64px; border-radius:8px;
    overflow:hidden; flex-shrink:0;
    border:1px solid var(--border,#e5e0d8);
  }
  .lrv-product-img img { width:100%; height:100%; object-fit:cover; }
  .lrv-no-img {
    width:100%; height:100%; display:flex;
    align-items:center; justify-content:center;
    font-size:1.5rem; background:#f0ece6;
  }
  .lrv-product-name  { font-size:.88rem; font-weight:600; margin-bottom:.3rem; }
  .lrv-product-stats { display:flex; align-items:center; gap:.4rem; }
  .lrv-avg-num       { font-size:.78rem; font-weight:700; color:#f59e0b; }
  .lrv-review-cnt    { font-size:.72rem; color:var(--muted,#7a7a7a); }

  /* Yorum sətirləri */
  .lrv-reviews-list { padding:.5rem .75rem; }
  .lrv-row {
    display:flex; gap:.75rem; padding:.7rem 0;
    border-bottom:1px solid var(--border,#e5e0d8);
  }
  .lrv-row:last-child { border-bottom:none; }
  .lrv-row-left  { display:flex; align-items:flex-start; gap:.5rem; flex-shrink:0; }
  .lrv-row-avatar {
    width:28px; height:28px; border-radius:50%;
    background:#e5e0d8; color:#555;
    display:flex; align-items:center; justify-content:center;
    font-size:.72rem; font-weight:700;
  }
  .lrv-row-meta  { display:flex; flex-direction:column; gap:2px; }
  .lrv-row-name  { font-size:.78rem; font-weight:600; }
  .lrv-row-stars { display:flex; }
  .lrv-row-right { flex:1; }
  .lrv-row-text  { font-size:.82rem; color:#444; line-height:1.5; margin-bottom:.25rem; }
  .lrv-time      { font-size:.68rem; color:var(--muted,#7a7a7a); }

  /* Cavab düyməsi */
  .lrv-reply-btn {
    display:inline-flex; align-items:center; gap:.3rem;
    padding:.2rem .6rem; border-radius:6px;
    border:1.5px solid var(--border,#e5e0d8); background:none;
    font-size:.72rem; font-weight:500; cursor:pointer;
    color:var(--muted,#7a7a7a); transition:all .15s; font-family:inherit;
  }
  .lrv-reply-btn:hover {
    border-color:var(--accent,#c9a86c); color:var(--accent,#c9a86c);
  }

  /* Mövcud cavablar */
  .lrv-existing-replies { margin:.3rem 0; }
  .lrv-reply-preview {
    font-size:.78rem; color:#666; padding:.25rem .5rem;
    background:var(--bg,#f7f4f0); border-radius:6px; margin-bottom:.2rem;
  }
  .lrv-reply-you { font-weight:700; color:var(--accent,#c9a86c); }

  /* Cavab forması */
  .lrv-reply-form {
    margin-top:.5rem; padding:.75rem;
    background:var(--bg,#f7f4f0); border-radius:10px;
  }
  .lrv-reply-textarea {
    width:100%; padding:.55rem .8rem; min-height:60px;
    border:1.5px solid var(--border,#e5e0d8); border-radius:8px;
    font-family:inherit; font-size:.875rem; resize:vertical;
    outline:none; transition:border-color .18s; background:#fff;
    box-sizing:border-box;
  }
  .lrv-reply-textarea:focus { border-color:var(--accent,#c9a86c); }

  .lrv-cancel-btn, .lrv-send-btn {
    padding:.38rem .85rem; border-radius:7px; font-size:.78rem;
    font-weight:500; cursor:pointer; transition:all .15s; font-family:inherit;
  }
  .lrv-cancel-btn {
    background:none; border:1.5px solid var(--border,#e5e0d8);
    color:var(--muted,#7a7a7a);
  }
  .lrv-cancel-btn:hover { border-color:var(--accent,#c9a86c); color:var(--accent,#c9a86c); }
  .lrv-send-btn   { background:var(--accent,#c9a86c); color:#fff; border:none; }
  .lrv-send-btn:hover    { opacity:.85; }
  .lrv-send-btn:disabled { opacity:.5; cursor:not-allowed; }

  /* Index xəta */
  .lrv-index-error {
    background:#fffbeb; border:1.5px solid #fde68a;
    border-radius:10px; padding:1rem; font-size:.82rem;
  }
  .lrv-index-error strong { display:block; margin-bottom:.35rem; }
  .lrv-index-error p { color:#555; margin-bottom:.5rem; }
  .lrv-index-link { color:#d97706; font-weight:600; text-decoration:underline; }
  `;
  document.head.appendChild(s);
}
