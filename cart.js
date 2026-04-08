/* ═══════════════════════════════════════════
   products.js — Məhsul məlumatları və render
   ═══════════════════════════════════════════ */

/* ══════════════════════════════
   MƏHSUL VERİLƏNLƏRİ
   TODO: Firebase Firestore ilə əvəz ediləcək
   ══════════════════════════════ */
const PRODUCTS = [
  {
    id: 1,
    brand: "Zara",
    name: "Yüngül Pambıq Köynek",
    price: 89,
    oldPrice: 120,
    badge: "Endirim",
    category: "qadin",
    sizes: ["XS","S","M","L","XL"],
    img: "https://images.unsplash.com/photo-1594938298603-c8148c4b4087?w=400&q=80",
    description: "Yüngül pambıq parçadan hazırlanmış bu köynek yay ayları üçün ideal seçimdir."
  },
  {
    id: 2,
    brand: "H&M",
    name: "Slim Fit Cins Şalvar",
    price: 75,
    oldPrice: null,
    badge: "Yeni",
    category: "kisi",
    sizes: ["28","30","32","34","36"],
    img: "https://images.unsplash.com/photo-1542272454315-4c01d7abdf4a?w=400&q=80",
    description: "Klassik slim fit kəsim, hər gün üçün mükəmməl denim."
  },
  {
    id: 3,
    brand: "Mango",
    name: "Kətan Palto",
    price: 210,
    oldPrice: 280,
    badge: "Endirim",
    category: "qadin",
    sizes: ["S","M","L"],
    img: "https://images.unsplash.com/photo-1544022613-e87ca75a784a?w=400&q=80",
    description: "Keçid mövsümü üçün ideal kətan palto."
  },
  {
    id: 4,
    brand: "Pull&Bear",
    name: "Oversize Hoodie",
    price: 65,
    oldPrice: null,
    badge: "Yeni",
    category: "unisex",
    sizes: ["S","M","L","XL","XXL"],
    img: "https://images.unsplash.com/photo-1614975059251-992f11792b9f?w=400&q=80",
    description: "Rahat oversize kəsim, yumşaq fleece parça."
  },
  {
    id: 5,
    brand: "Bershka",
    name: "Çiçəkli Yay Donu",
    price: 55,
    oldPrice: 85,
    badge: "Endirim",
    category: "qadin",
    sizes: ["XS","S","M","L"],
    img: "https://images.unsplash.com/photo-1572804013427-4d7ca7268217?w=400&q=80",
    description: "Rəngli çiçək baskısı ilə yay mövsümünün ən sevimli donu."
  },
  {
    id: 6,
    brand: "Zara",
    name: "Dəri Ceket",
    price: 185,
    oldPrice: null,
    badge: "Yeni",
    category: "kisi",
    sizes: ["S","M","L","XL"],
    img: "https://images.unsplash.com/photo-1551028719-00167b16eac5?w=400&q=80",
    description: "Ekoloji dəridan hazırlanmış klassik moto ceket."
  },
  {
    id: 7,
    brand: "H&M",
    name: "Trikotaj Kazak",
    price: 48,
    oldPrice: 70,
    badge: "Endirim",
    category: "qadin",
    sizes: ["XS","S","M","L","XL"],
    img: "https://images.unsplash.com/photo-1620799139507-2a76f79a2f4d?w=400&q=80",
    description: "Yumşaq trikotaj toxuması ilə rahatlıq və üslub bir arada."
  },
  {
    id: 8,
    brand: "Mango",
    name: "Klassik Blazer",
    price: 155,
    oldPrice: null,
    badge: "Yeni",
    category: "qadin",
    sizes: ["XS","S","M","L"],
    img: "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=400&q=80",
    description: "İş həyatından günlük istifadəyə uyğun klassik blazer."
  }
];

/* ══════════════════════════════
   MƏHSUL KART HTML-i
   ══════════════════════════════ */
function createProductCard(p) {
  const isSale = p.oldPrice !== null;
  const isNew  = p.badge === "Yeni";

  return `
    <div class="card" data-id="${p.id}">
      <div class="card-img-wrap">
        <img src="${p.img}" alt="${p.name}" loading="lazy" />
        <span class="badge ${isNew ? 'badge-new' : 'badge-sale'}">${p.badge}</span>
        <button class="fav-btn" onclick="toggleFav(this)" aria-label="Sevimlilərə əlavə et">
          <svg viewBox="0 0 24 24" fill="none" stroke="#888" stroke-width="2">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
        </button>
      </div>
      <div class="card-body">
        <div class="card-brand">${p.brand}</div>
        <div class="card-name">${p.name}</div>
        <div class="card-footer">
          <div class="price-wrap">
            ${p.oldPrice ? `<span class="price-old">${p.oldPrice} ₼</span>` : ''}
            <span class="price-new ${isSale ? 'sale' : ''}">${p.price} ₼</span>
          </div>
          <button class="cart-btn" onclick="addToCart(${p.id})" title="Səbətə əlavə et">
            <svg viewBox="0 0 24 24"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4zM3 6h18M16 10a4 4 0 01-8 0" fill="none" stroke="white" stroke-width="2"/></svg>
          </button>
        </div>
      </div>
    </div>
  `;
}

/* ══════════════════════════════
   GRID RENDER
   ══════════════════════════════ */
function renderProducts(products, containerId = 'productGrid') {
  const grid = document.getElementById(containerId);
  if (!grid) return;
  grid.innerHTML = products.map(createProductCard).join('');
}

/* ══════════════════════════════
   ƏMƏLIYYATLAR
   ══════════════════════════════ */
function addToCart(productId) {
  const product = PRODUCTS.find(p => p.id === productId);
  if (product) cart.add(product);
}

function toggleFav(btn) {
  btn.classList.toggle('active');
  const svg = btn.querySelector('svg');
  if (btn.classList.contains('active')) {
    svg.setAttribute('fill', '#e63946');
    svg.setAttribute('stroke', '#e63946');
  } else {
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', '#888');
  }
}
