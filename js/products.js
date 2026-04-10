/* ═══════════════════════════════════════════════════
   products.js — Məhsullar (Firebase + Elan əlavə et)
   ═══════════════════════════════════════════════════ */

const STATIC_PRODUCTS = [
  {
    id: "s1", brand: "Zara", name: "Yüngül Pambıq Köynek",
    price: 89, oldPrice: 120, badge: "Endirim", category: "qadin",
    imgs: ["https://images.unsplash.com/photo-1594938298603-c8148c4b4087?w=400&q=80"],
    _static: true
  },
  {
    id: "s2", brand: "H&M", name: "Slim Fit Cins Şalvar",
    price: 75, oldPrice: null, badge: "Yeni", category: "kisi",
    imgs: ["https://images.unsplash.com/photo-1542272454315-4c01d7abdf4a?w=400&q=80"],
    _static: true
  },
  {
    id: "s3", brand: "Mango", name: "Kətan Palto",
    price: 210, oldPrice: 280, badge: "Endirim", category: "qadin",
    imgs: ["https://images.unsplash.com/photo-1544022613-e87ca75a784a?w=400&q=80"],
    _static: true
  },
  {
    id: "s4", brand: "Pull&Bear", name: "Oversize Hoodie",
    price: 65, oldPrice: null, badge: "Yeni", category: "unisex",
    imgs: ["https://images.unsplash.com/photo-1614975059251-992f11792b9f?w=400&q=80"],
    _static: true
  },
  {
    id: "s5", brand: "Bershka", name: "Çiçəkli Yay Donu",
    price: 55, oldPrice: 85, badge: "Endirim", category: "qadin",
    imgs: ["https://images.unsplash.com/photo-1572804013427-4d7ca7268217?w=400&q=80"],
    _static: true
  },
  {
    id: "s6", brand: "Zara", name: "Dəri Ceket",
    price: 185, oldPrice: null, badge: "Yeni", category: "kisi",
    imgs: ["https://images.unsplash.com/photo-1551028719-00167b16eac5?w=400&q=80"],
    _static: true
  },
  {
    id: "s7", brand: "H&M", name: "Trikotaj Kazak",
    price: 48, oldPrice: 70, badge: "Endirim", category: "qadin",
    imgs: ["https://images.unsplash.com/photo-1620799139507-2a76f79a2f4d?w=400&q=80"],
    _static: true
  },
  {
    id: "s8", brand: "Mango", name: "Klassik Blazer",
    price: 155, oldPrice: null, badge: "Yeni", category: "qadin",
    imgs: ["https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=400&q=80"],
    _static: true
  }
];

let PRODUCTS = [...STATIC_PRODUCTS];

/* ══════════════════════════════
   FİREBASE-DƏN ELANLAR
   ══════════════════════════════ */
async function loadListings() {
  try {
    const snap = await fbDb.collection('listings')
      .orderBy('createdAt', 'desc')
      .get();

    const listings = snap.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      _fromFirebase: true
    }));

    PRODUCTS = [...listings, ...STATIC_PRODUCTS];
    renderProducts(PRODUCTS);
    const countEl = document.getElementById('productCount');
    if (countEl) countEl.textContent = `${PRODUCTS.length} məhsul`;
  } catch (err) {
    console.warn('Elanlar yüklənmədi:', err.message);
    renderProducts(STATIC_PRODUCTS);
  }
}

/* ══════════════════════════════
   MAĞAZAYA KEÇİD
   ══════════════════════════════ */
function goToStore(uid) {
  if (uid) window.location.href = 'store.html?uid=' + uid;
}

/* ══════════════════════════════
   MƏHSUL KART HTML
   ══════════════════════════════ */
function createProductCard(p, favIds = []) {
  const isSale     = p.oldPrice != null && p.oldPrice > p.price;
  const badge      = p.badge || 'Yeni';
  const isNew      = badge === 'Yeni';
  const imgSrc     = (p.imgs && p.imgs[0]) || p.img || '';
  const currentUid = fbAuth.currentUser?.uid || null;
  const canDelete  = p._fromFirebase && currentUid && p.userId === currentUid;
  const isFav      = favIds.includes(String(p.id));

  const brandLabel     = p.brand || p.storeName || '';
  const storeClickable = p._fromFirebase && !!p.userId;

  return `
    <div class="card" data-id="${p.id}">
      <div class="card-img-wrap">
        <img src="${imgSrc}" alt="${p.name}" loading="lazy" />
        <span class="badge ${isNew ? 'badge-new' : 'badge-sale'}">${badge}</span>
        <button class="fav-btn ${isFav ? 'active' : ''}" onclick="toggleFav(this, '${p.id}')" aria-label="Sevimlilərə əlavə et">
          <svg viewBox="0 0 24 24"
            fill="${isFav ? '#e63946' : 'none'}"
            stroke="${isFav ? '#e63946' : '#888'}"
            stroke-width="2">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
        </button>
      </div>
      <div class="card-body">
        <div class="card-brand"
          ${storeClickable
            ? `onclick="event.stopPropagation();goToStore('${p.userId}')"
               style="cursor:pointer;"
               title="${brandLabel} mağazasına bax"`
            : ''}
        >${brandLabel}</div>
        <div class="card-name">${p.name}</div>
        <div class="card-footer">
          <div class="price-wrap">
            ${isSale ? `<span class="price-old">${p.oldPrice} ₼</span>` : ''}
            <span class="price-new ${isSale ? 'sale' : ''}">${p.price} ₼</span>
          </div>
          <div style="display:flex;align-items:center;gap:6px">
            ${canDelete ? `
              <button class="delete-btn" onclick="deleteListing('${p.id}')" title="Elanı sil"
                style="position:static;width:36px;height:36px;border-radius:var(--radius-sm)">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
                  <polyline points="3 6 5 6 21 6"/>
                  <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
                  <path d="M10 11v6M14 11v6"/>
                  <path d="M9 6V4h6v2"/>
                </svg>
              </button>` : ''}
            <button class="cart-btn" onclick="addToCart('${p.id}')" title="Səbətə əlavə et">
              <svg viewBox="0 0 24 24"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4zM3 6h18M16 10a4 4 0 01-8 0" fill="none" stroke="white" stroke-width="2"/></svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
}

/* ══════════════════════════════
   GRID RENDER
   ══════════════════════════════ */
async function renderProducts(products, containerId = 'productGrid') {
  const grid = document.getElementById(containerId);
  if (!grid) return;

  let favIds = [];
  const user = fbAuth.currentUser;
  if (user) {
    try {
      const snap = await fbDb.collection('wishlists').doc(user.uid).get();
      if (snap.exists) {
        favIds = (snap.data().items || []).map(i => String(i.id));
      }
    } catch (e) {}
  }

  // ✅ initCardClicks() BURADAN SİLİNDİ — product-detail.js idarə edir
  grid.innerHTML = products.map(p => createProductCard(p, favIds)).join('');
}

/* ══════════════════════════════
   ELAN SİL
   ══════════════════════════════ */
async function deleteListing(id) {
  if (!confirm('Bu elanı silmək istəyirsiniz?')) return;
  try {
    await fbDb.collection('listings').doc(id).delete();
    toast.show('Elan silindi', 'success');
    loadListings();
  } catch (err) {
    toast.show('Silinmədi: ' + err.message, 'error');
  }
}

/* ══════════════════════════════
   ƏMƏLIYYATLAR
   ══════════════════════════════ */
function addToCart(productId) {
  const product = PRODUCTS.find(p => p.id == productId);
  if (product) cart.add(product);
}

/* ══════════════════════════════
   FAVORİT — Firebase ilə sinxron
   ══════════════════════════════ */
async function toggleFav(btn, productId) {
  const user = fbAuth.currentUser;
  if (!user) {
    if (typeof modal !== 'undefined') modal.open('authModal');
    if (typeof toast !== 'undefined') toast.show('Sevimlilərə əlavə etmək üçün daxil olun', 'default');
    return;
  }

  const product = PRODUCTS.find(p => String(p.id) === String(productId));
  if (!product) return;

  const isActive = btn.classList.contains('active');
  const svg      = btn.querySelector('svg');
  const ref      = fbDb.collection('wishlists').doc(user.uid);

  btn.classList.toggle('active');
  if (!isActive) {
    svg.setAttribute('fill', '#e63946');
    svg.setAttribute('stroke', '#e63946');
  } else {
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', '#888');
  }

  try {
    const snap  = await ref.get();
    const items = snap.exists ? (snap.data().items || []) : [];

    let newItems;
    if (!isActive) {
      const alreadyExists = items.some(i => String(i.id) === String(productId));
      if (alreadyExists) return;
      newItems = [...items, {
        id:    String(product.id),
        name:  product.name,
        price: product.price,
        image: (product.imgs && product.imgs[0]) || product.img || '',
        brand: product.brand || ''
      }];
      if (typeof toast !== 'undefined') toast.show(`${product.name} istək siyahısına əlavə edildi ❤️`, 'success');
    } else {
      newItems = items.filter(i => String(i.id) !== String(productId));
      if (typeof toast !== 'undefined') toast.show(`${product.name} istək siyahısından çıxarıldı`, 'default');
    }

    await ref.set({ items: newItems }, { merge: false });
  } catch (err) {
    btn.classList.toggle('active');
    if (isActive) {
      svg.setAttribute('fill', '#e63946');
      svg.setAttribute('stroke', '#e63946');
    } else {
      svg.setAttribute('fill', 'none');
      svg.setAttribute('stroke', '#888');
    }
    if (typeof toast !== 'undefined') toast.show('Xəta baş verdi', 'error');
  }
}

/* ══════════════════════════════
   ELAN ƏLAVƏ ET — MODAL
   ══════════════════════════════ */
const listing = {
  selectedImages: [],

  open() {
    const user = fbAuth.currentUser;
    if (!user) {
      toast.show('Elan əlavə etmək üçün daxil olun', 'error');
      modal.open('authModal');
      return;
    }
    document.getElementById('listingModal').classList.add('open');
    this.reset();
  },

  close() {
    document.getElementById('listingModal').classList.remove('open');
    this.reset();
  },

  reset() {
    document.getElementById('listingForm').reset();
    this.selectedImages = [];
    this.renderPreviews();
  },

  handleImages(files) {
    const remaining = 5 - this.selectedImages.length;
    const toProcess = Array.from(files).slice(0, remaining);
    toProcess.forEach(file => {
      if (!file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        this.selectedImages.push(e.target.result);
        this.renderPreviews();
      };
      reader.readAsDataURL(file);
    });
  },

  renderPreviews() {
    const wrap = document.getElementById('imgPreviews');
    if (!wrap) return;
    wrap.innerHTML = '';
    this.selectedImages.forEach((src, i) => {
      const div = document.createElement('div');
      div.className = 'img-preview';
      div.innerHTML = `
        <img src="${src}" alt="şəkil ${i+1}" />
        <button type="button" onclick="listing.removeImg(${i})">✕</button>`;
      wrap.appendChild(div);
    });
    if (this.selectedImages.length < 5) {
      const add = document.createElement('label');
      add.className = 'img-add-btn';
      add.htmlFor   = 'imgInput';
      add.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="22" height="22">
          <rect x="3" y="3" width="18" height="18" rx="3"/>
          <line x1="12" y1="8" x2="12" y2="16"/>
          <line x1="8" y1="12" x2="16" y2="12"/>
        </svg>
        <span>${this.selectedImages.length}/5</span>`;
      wrap.appendChild(add);
    }
  },

  removeImg(i) {
    this.selectedImages.splice(i, 1);
    this.renderPreviews();
  },

  async submit() {
    const brand = document.getElementById('lBrand').value.trim();
    const name  = document.getElementById('lName').value.trim();
    const price = parseFloat(document.getElementById('lPrice').value);

    if (!name)               { toast.show('Məhsul adını daxil edin', 'error'); return; }
    if (!brand)              { toast.show('Marka adını daxil edin', 'error'); return; }
    if (!price || price <= 0){ toast.show('Düzgün qiymət daxil edin', 'error'); return; }

    const btn = document.getElementById('listingSubmitBtn');
    btn.disabled    = true;
    btn.textContent = 'Əlavə edilir...';

    try {
      const user = fbAuth.currentUser;
      await fbDb.collection('listings').add({
        brand,
        name,
        price,
        badge:     'Yeni',
        imgs:      this.selectedImages,
        userId:    user.uid,
        userEmail: user.email,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });

      toast.show('Elan uğurla əlavə edildi ✓', 'success');
      this.close();
      loadListings();
    } catch (err) {
      toast.show('Xəta: ' + err.message, 'error');
    } finally {
      btn.disabled    = false;
      btn.textContent = 'Elanı Yayımla';
    }
  }
};
