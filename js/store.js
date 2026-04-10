/* ═══════════════════════════════════════════════
   store.js — Mağaza səhifəsi məntiqi
   store.html-ə əlavə et: <script src="js/store.js"></script>
   ═══════════════════════════════════════════════ */

let storeUid      = null;
let storeData     = {};
let storeListings = [];
let isFollowing   = false;

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
    /* Vendor + user məlumatları paralel çək */
    const [vSnap, uSnap] = await Promise.all([
      fbDb.collection('vendors').doc(storeUid).get(),
      fbDb.collection('users').doc(storeUid).get()
    ]);

    const v = vSnap.exists ? vSnap.data() : {};
    const u = uSnap.exists ? uSnap.data() : {};

    const fullName = ((u.firstName || '') + ' ' + (u.lastName || '')).trim();

    storeData = {
      uid:          storeUid,
      storeName:    v.storeName || u.storeName || fullName || 'Mağaza',
      photoURL:     v.photoURL  || u.photoURL  || '',
      desc:         v.desc || v.description || u.desc || '',
      email:        u.email || '',
      phone:        v.phone || u.phone || '',
      category:     v.category || '',
      createdAt:    v.createdAt || u.createdAt || null,
      followerCount: 0,
    };

    /* Listings + Followers paralel */
    const [listSnap, followSnap] = await Promise.all([
      fbDb.collection('listings')
        .where('userId', '==', storeUid)
        .orderBy('createdAt', 'desc')
        .get(),
      fbDb.collection('follows')
        .where('storeId', '==', storeUid)
        .get()
    ]);

    storeListings = listSnap.docs.map(d => ({
      id: d.id,
      ...d.data(),
      _fromFirebase: true
    }));
    storeData.followerCount = followSnap.size;

    /* Cari istifadəçi izləyirmi? */
    const cu = fbAuth.currentUser;
    if (cu) {
      const myFollow = await fbDb.collection('follows')
        .doc(`${cu.uid}_${storeUid}`)
        .get();
      isFollowing = myFollow.exists;
    }

    renderStorePage();

  } catch (err) {
    document.getElementById('storePageContent').innerHTML =
      `<p style="color:var(--danger);text-align:center;padding:4rem 0;font-size:.875rem;">Xəta: ${err.message}</p>`;
  }
}

/* ══════════════════════════════════════════
   RENDER
══════════════════════════════════════════ */
function renderStorePage() {
  const s = storeData;

  /* Logo */
  const initials = s.storeName
    .split(' ')
    .map(w => w[0] || '')
    .join('')
    .substring(0, 2)
    .toUpperCase();

  const logoHTML = s.photoURL
    ? `<img src="${s.photoURL}" alt="${s.storeName}"/>`
    : initials;

  /* Qoşulma ili */
  const joinYear = s.createdAt?.toDate
    ? s.createdAt.toDate().getFullYear()
    : null;

  /* Kateqoriya etiketi */
  const catTag = s.category
    ? `<span style="display:inline-block;background:rgba(255,255,255,0.12);color:rgba(255,255,255,0.7);
        font-size:0.7rem;padding:2px 10px;border-radius:20px;margin-left:0.75rem;
        letter-spacing:0.04em;vertical-align:middle;">${s.category}</span>`
    : '';

  document.getElementById('storePageContent').innerHTML = `

    <!-- ── HERO ── -->
    <div class="store-hero">
      <div class="store-hero-inner">

        <div class="store-logo">${logoHTML}</div>

        <div class="store-hero-info">
          <div class="store-hero-name">${s.storeName}${catTag}</div>
          ${s.desc
            ? `<div class="store-hero-desc">${s.desc}</div>`
            : '<div style="margin-bottom:1.1rem;"></div>'}
          <div class="store-hero-stats">
            <div class="store-stat">
              <span id="followerCount">${s.followerCount}</span>
              <small>İzləyici</small>
            </div>
            <div class="store-stat">
              <span>${storeListings.length}</span>
              <small>Məhsul</small>
            </div>
            ${joinYear
              ? `<div class="store-stat"><span>${joinYear}</span><small>İldən bəri</small></div>`
              : ''}
          </div>
        </div>

        <button class="store-follow-btn ${isFollowing ? 'following' : ''}"
          id="storeFollowBtn" onclick="toggleFollow()">
          ${followBtnHTML(isFollowing)}
        </button>

      </div>
    </div>

    <!-- ── CONTENT ── -->
    <div class="store-content-grid">

      <!-- Sol: məhsullar -->
      <div>
        <div class="store-products-header">
          <h2 class="store-products-title">Məhsullar</h2>
          <span class="section-count">${storeListings.length} məhsul</span>
        </div>
        ${storeListings.length > 0
          ? `<div class="product-grid" id="storeProductGrid"></div>`
          : `<div class="store-empty">
               <div style="font-size:3rem;margin-bottom:1rem;">🏷️</div>
               <p>Bu mağazada hələ məhsul yoxdur</p>
             </div>`}
      </div>

      <!-- Sağ: info panelləri -->
      <div class="store-side-col">

        ${s.desc ? `
        <div class="store-side-card">
          <div class="store-side-title">Haqqımızda</div>
          <p class="store-side-text">${s.desc}</p>
        </div>` : ''}

        <!-- Kampaniya -->
        <div class="store-side-card campaign-card">
          <div class="store-side-title">Kampaniya</div>
          <div class="campaign-badge">Aktiv deyil</div>
          <div class="campaign-title">Hazırda kampaniya yoxdur</div>
          <p class="store-side-text">
            Bu mağazanın aktiv kampaniyası olmadıqda burada görünəcək.
          </p>
        </div>

        ${(s.phone || s.email) ? `
        <div class="store-side-card">
          <div class="store-side-title">Əlaqə</div>
          ${s.phone ? `
          <div class="store-contact-row">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 01.4 1.18 2 2 0 012 1h3a2 2 0 012 1.72c.13.96.36 1.9.7 2.81a2 2 0 01-.45 2.11L6.09 8.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0122 16.92z"/>
            </svg>
            <span>${s.phone}</span>
          </div>` : ''}
          ${s.email ? `
          <div class="store-contact-row">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
              <polyline points="22,6 12,13 2,6"/>
            </svg>
            <span>${s.email}</span>
          </div>` : ''}
        </div>` : ''}

        <!-- Çatdırılma -->
        <div class="store-side-card">
          <div class="store-side-title">Çatdırılma</div>
          <div class="store-delivery-tag">✓ Pulsuz çatdırılma</div>
          <p class="store-side-text">
            50 AZN üzərindəki sifarişlərə pulsuz çatdırılma. Sifariş verərkən ünvanı daxil edin.
          </p>
        </div>

      </div><!-- /store-side-col -->
    </div><!-- /store-content-grid -->
  `;

  document.title = `${s.storeName} — MODA`;

  /* Məhsulları render et */
  if (storeListings.length > 0) {
    renderProducts(storeListings, 'storeProductGrid');
  }
}

/* ── Follow düyməsinin daxili HTML ── */
function followBtnHTML(following) {
  if (following) {
    return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
      <polyline points="17 11 19 13 23 9"/>
    </svg>İzləyirsiniz`;
  }
  return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
    <line x1="19" y1="8" x2="19" y2="14"/>
    <line x1="16" y1="11" x2="22" y2="11"/>
  </svg>İzlə`;
}

/* ══════════════════════════════════════════
   FOLLOW / UNFOLLOW
══════════════════════════════════════════ */
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
      await ref.set({
        followerId: cu.uid,
        storeId:    storeUid,
        createdAt:  firebase.firestore.FieldValue.serverTimestamp()
      });
      isFollowing = true;
      storeData.followerCount++;
    }

    const countEl = document.getElementById('followerCount');
    if (countEl) countEl.textContent = storeData.followerCount;

    btn.className = `store-follow-btn${isFollowing ? ' following' : ''}`;
    btn.innerHTML = followBtnHTML(isFollowing);

    if (typeof toast !== 'undefined') {
      toast.show(
        isFollowing
          ? `${storeData.storeName} izlənilir ✓`
          : 'İzləmə dayandırıldı',
        'success'
      );
    }
  } catch (err) {
    if (typeof toast !== 'undefined') toast.show('Xəta: ' + err.message, 'error');
  }
}
