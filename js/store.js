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

  // Cari istifadəçi bu mağazanın sahibidirsə — satıcı panelini göstər
  const cu = fbAuth.currentUser;
  if (cu && cu.uid === storeUid) {
    await loadVendorDashboard(storeUid);
    return;
  }

  try {
    const [vSnap, uSnap] = await Promise.all([
      fbDb.collection('vendors').doc(storeUid).get(),
      fbDb.collection('users').doc(storeUid).get()
    ]);

    const v = vSnap.exists ? vSnap.data() : {};
    const u = uSnap.exists ? uSnap.data() : {};
    const fullName = ((u.firstName || '') + ' ' + (u.lastName || '')).trim();

    storeData = {
      uid: storeUid,
      storeName: v.storeName || u.storeName || fullName || 'Mağaza',
      photoURL:  v.photoURL  || u.photoURL  || '',
      desc:      v.desc || v.description || u.desc || '',
      email:     u.email || '',
      phone:     v.phone || u.phone || '',
      category:  v.category || '',
      createdAt: v.createdAt || u.createdAt || null,
      followerCount: 0,
    };

    const [listSnap, followSnap] = await Promise.all([
      fbDb.collection('listings').where('userId', '==', storeUid).orderBy('createdAt', 'desc').get(),
      fbDb.collection('follows').where('storeId', '==', storeUid).get()
    ]);

    storeListings = listSnap.docs.map(d => ({ id: d.id, ...d.data(), _fromFirebase: true }));
    storeData.followerCount = followSnap.size;

    if (cu) {
      const myFollow = await fbDb.collection('follows').doc(`${cu.uid}_${storeUid}`).get();
      isFollowing = myFollow.exists;
    }

    renderStorePage();

  } catch (err) {
    document.getElementById('storePageContent').innerHTML =
      `<p style="color:var(--danger);text-align:center;padding:4rem 0;font-size:.875rem;">Xəta: ${err.message}</p>`;
  }
}

/* ══════════════════════════════════════════
   SATICI PANELİ
══════════════════════════════════════════ */
async function loadVendorDashboard(uid) {
  const content = document.getElementById('storePageContent');
  if (!content) return;
  content.innerHTML = `<p style="text-align:center;padding:4rem;color:var(--muted)">Yüklənir...</p>`;

  try {
    const [vSnap, uSnap, listSnap, ordersSnap] = await Promise.all([
      fbDb.collection('vendors').doc(uid).get(),
      fbDb.collection('users').doc(uid).get(),
      fbDb.collection('listings').where('userId', '==', uid).get(),
      fbDb.collection('orders').where('vendorId', '==', uid).orderBy('createdAt', 'desc').get()
    ]);

    const v = vSnap.exists ? vSnap.data() : {};
    const u = uSnap.exists ? uSnap.data() : {};
    const storeName = v.storeName || u.storeName || ((u.firstName || '') + ' ' + (u.lastName || '')).trim() || 'Mağaza';
    const category  = v.category || 'Digər';
    const city      = v.city || u.city || 'Bakı';

    const listings = listSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const orders   = ordersSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    const totalRevenue  = orders.filter(o => o.status === 'delivered').reduce((s, o) => s + (o.total || 0), 0);
    const totalOrders   = orders.length;
    const activeListings = listings.filter(l => l.stock > 0 || l.quantity > 0).length || listings.length;
    const pendingOrders  = orders.filter(o => o.status === 'pending').length;

    // Logo initials
    const initials = storeName.split(' ').map(w => w[0] || '').join('').substring(0, 2).toUpperCase();

    const statusLabel = { pending: 'Gözlənilir', shipped: 'Yolda', delivered: 'Çatdırıldı' };
    const statusColor = { pending: '#b07820', shipped: '#1a4fb8', delivered: '#2d7a47' };
    const statusBg    = { pending: '#fdf8f0', shipped: '#eef3fd', delivered: '#f0faf4' };

    content.innerHTML = `
      <div style="display:flex;gap:24px;padding:24px 0;max-width:1100px;margin:0 auto">

        <!-- Sol sidebar -->
        <div style="display:flex;flex-direction:column;gap:4px;min-width:60px;align-items:center;padding:8px 0">
          ${['🏠','👤','📋','❤️','📍','🏬','🗂️','🚪'].map((icon, i) => `
            <button onclick="vendorSidebarClick(${i})" style="width:40px;height:40px;border:none;background:${i===0?'var(--accent)':'transparent'};color:${i===0?'#fff':'var(--muted)'};border-radius:10px;cursor:pointer;font-size:1.1rem;display:flex;align-items:center;justify-content:center;transition:all 0.2s">${icon}</button>
          `).join('')}
        </div>

        <!-- Ana panel -->
        <div style="flex:1">

          <!-- Başlıq -->
          <div style="display:flex;justify-content:space-between;align-items:center;background:#fff;border:1px solid var(--border);border-radius:16px;padding:20px 24px;margin-bottom:16px">
            <div style="display:flex;align-items:center;gap:16px">
              <div style="width:48px;height:48px;border-radius:10px;background:linear-gradient(135deg,#2c2c2c,#1a1a1a);color:#fff;display:flex;align-items:center;justify-content:center;font-family:var(--font-display,serif);font-size:1.2rem;font-weight:600">${initials}</div>
              <div>
                <div style="display:flex;align-items:center;gap:10px">
                  <span style="font-size:1.15rem;font-weight:600">${storeName}</span>
                  <span style="background:#eefaf4;color:#2d7a47;font-size:0.7rem;font-weight:600;padding:2px 10px;border-radius:20px;border:1px solid #a8e6c0">● Aktiv</span>
                </div>
                <div style="font-size:0.8rem;color:var(--muted);margin-top:2px">${category} · ${city}</div>
              </div>
            </div>
            <button style="display:flex;align-items:center;gap:6px;background:none;border:1px solid var(--border);border-radius:10px;padding:8px 14px;font-size:0.82rem;cursor:pointer;color:var(--muted)">
              ⚙️ Parametrlər
            </button>
          </div>

          <!-- Statistika kartları -->
          <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:16px">
            ${[
              { icon:'💰', label:'Ümumi gəlir', value: totalRevenue.toFixed(2) + ' ₼' },
              { icon:'📦', label:'Ümumi sifariş', value: totalOrders },
              { icon:'🏷️', label:'Aktiv elan', value: activeListings },
              { icon:'⏳', label:'Gözləyən sifariş', value: pendingOrders }
            ].map(s => `
              <div style="background:#fff;border:1px solid var(--border);border-radius:14px;padding:18px">
                <div style="font-size:1.5rem;margin-bottom:8px">${s.icon}</div>
                <div style="font-size:1.4rem;font-weight:700;color:var(--text)">${s.value}</div>
                <div style="font-size:0.75rem;color:var(--muted);margin-top:2px">${s.label}</div>
              </div>
            `).join('')}
          </div>

          <!-- Sifarişlər cədvəli -->
          <div style="background:#fff;border:1px solid var(--border);border-radius:16px;padding:20px 24px;margin-bottom:16px">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
              <h3 style="font-size:1rem;font-weight:600">Son sifarişlər</h3>
              <div style="display:flex;gap:8px">
                <select id="orderStatusFilter" onchange="filterVendorOrders()" style="font-size:0.78rem;padding:4px 10px;border:1px solid var(--border);border-radius:8px;background:var(--bg);color:var(--text)">
                  <option value="">Hamısı</option>
                  <option value="pending">Gözlənilir</option>
                  <option value="shipped">Yolda</option>
                  <option value="delivered">Çatdırıldı</option>
                </select>
              </div>
            </div>

            ${orders.length === 0 ? `
              <div style="text-align:center;padding:32px;color:var(--muted);font-size:0.88rem">Hələ sifariş yoxdur</div>
            ` : `
              <div style="overflow-x:auto">
                <table id="ordersTable" style="width:100%;border-collapse:collapse;font-size:0.82rem">
                  <thead>
                    <tr style="border-bottom:1px solid var(--border)">
                      ${['MƏHSUL','SİFARİŞ №','TARİX','MƏBLƏĞ','STATUS',''].map(h =>
                        `<th style="text-align:left;padding:8px 12px;color:var(--muted);font-weight:500;font-size:0.72rem;text-transform:uppercase;letter-spacing:0.04em">${h}</th>`
                      ).join('')}
                    </tr>
                  </thead>
                  <tbody id="ordersTableBody">
                    ${orders.map(order => renderOrderRow(order, statusLabel, statusColor, statusBg)).join('')}
                  </tbody>
                </table>
              </div>
            `}
          </div>

          <!-- Son elanlar -->
          <div style="background:#fff;border:1px solid var(--border);border-radius:16px;padding:20px 24px">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
              <h3 style="font-size:1rem;font-weight:600">Son elanlar</h3>
              <button onclick="window.location.href='profile.html'" style="background:#1a1a1a;color:#fff;border:none;border-radius:10px;padding:7px 14px;font-size:0.78rem;cursor:pointer">
                Bütün elanlar →
              </button>
            </div>
            ${listings.length === 0 ? `
              <div style="text-align:center;padding:24px;color:var(--muted);font-size:0.88rem">Hələ elan yoxdur</div>
            ` : `
              <table style="width:100%;border-collapse:collapse;font-size:0.82rem">
                <thead>
                  <tr style="border-bottom:1px solid var(--border)">
                    ${['MƏHSUL ADI','KATEQORİYA','QİYMƏT','STOK'].map(h =>
                      `<th style="text-align:left;padding:8px 12px;color:var(--muted);font-weight:500;font-size:0.72rem;text-transform:uppercase;letter-spacing:0.04em">${h}</th>`
                    ).join('')}
                  </tr>
                </thead>
                <tbody>
                  ${listings.slice(0, 5).map(l => `
                    <tr style="border-bottom:1px solid var(--border)">
                      <td style="padding:10px 12px;font-weight:500">${l.name || '—'}</td>
                      <td style="padding:10px 12px;color:var(--muted)">${l.category || '—'}</td>
                      <td style="padding:10px 12px;font-weight:600">${(l.price || 0).toFixed(2)} ₼</td>
                      <td style="padding:10px 12px">
                        ${(l.stock > 0 || l.quantity > 0)
                          ? `<span style="background:#eefaf4;color:#2d7a47;font-size:0.72rem;padding:2px 8px;border-radius:20px">${l.stock || l.quantity} ədəd</span>`
                          : `<span style="background:#fdf0f0;color:#a33333;font-size:0.72rem;padding:2px 8px;border-radius:20px">Stok yoxdur</span>`
                        }
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            `}
          </div>

        </div>
      </div>
    `;

    // Sifariş sətirləri üçün data saxla (filter üçün)
    window._vendorOrders = orders;
    window._vendorStatusLabel = statusLabel;
    window._vendorStatusColor = statusColor;
    window._vendorStatusBg    = statusBg;

  } catch (err) {
    content.innerHTML = `<p style="color:var(--danger);text-align:center;padding:4rem;font-size:.875rem;">Xəta: ${err.message}</p>`;
  }
}

/* ── Sifariş sətri render ── */
function renderOrderRow(order, statusLabel, statusColor, statusBg) {
  const status = order.status || 'pending';
  const date   = order.createdAt?.toDate
    ? order.createdAt.toDate().toLocaleDateString('az-AZ')
    : '—';
  const itemNames = (order.items || []).map(i => i.name).join(', ').substring(0, 40);

  return `
    <tr data-status="${status}" style="border-bottom:1px solid var(--border)">
      <td style="padding:10px 12px">
        <div style="font-weight:500;max-width:180px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${itemNames || '—'}</div>
        <div style="font-size:0.72rem;color:var(--muted)">${(order.items || []).length} məhsul</div>
      </td>
      <td style="padding:10px 12px">
        <span style="font-family:monospace;font-weight:600">#${order.orderNumber || '—'}</span>
      </td>
      <td style="padding:10px 12px;color:var(--muted)">${date}</td>
      <td style="padding:10px 12px;font-weight:700">${(order.total || 0).toFixed(2)} ₼</td>
      <td style="padding:10px 12px">
        <span style="background:${statusBg[status]||'#f5f5f5'};color:${statusColor[status]||'#555'};font-size:0.72rem;font-weight:600;padding:3px 10px;border-radius:20px">
          ${statusLabel[status] || status}
        </span>
      </td>
      <td style="padding:10px 12px">
        <button onclick="openOrderStatusModal('${order.id}', '${status}')"
          style="background:none;border:1px solid var(--border);border-radius:8px;padding:4px 10px;font-size:0.75rem;cursor:pointer;color:var(--text);white-space:nowrap">
          Status dəyiş
        </button>
      </td>
    </tr>
  `;
}

/* ── Sifariş filteri ── */
function filterVendorOrders() {
  const filter = document.getElementById('orderStatusFilter')?.value || '';
  const orders = window._vendorOrders || [];
  const sl     = window._vendorStatusLabel;
  const sc     = window._vendorStatusColor;
  const sb     = window._vendorStatusBg;

  const filtered = filter ? orders.filter(o => o.status === filter) : orders;
  const tbody = document.getElementById('ordersTableBody');
  if (tbody) {
    tbody.innerHTML = filtered.length
      ? filtered.map(o => renderOrderRow(o, sl, sc, sb)).join('')
      : `<tr><td colspan="6" style="text-align:center;padding:24px;color:var(--muted)">Nəticə tapılmadı</td></tr>`;
  }
}

/* ── Status dəyişdirmə modalı ── */
function openOrderStatusModal(orderId, currentStatus) {
  const old = document.getElementById('statusChangeModal');
  if (old) old.remove();

  const overlay = document.createElement('div');
  overlay.id = 'statusChangeModal';
  overlay.className = 'overlay';
  overlay.style.cssText = 'display:flex;align-items:center;justify-content:center;z-index:2000';

  const statusFlow = [
    { key: 'pending',   icon: '⏳', label: 'Gözlənilir',  desc: 'Sifariş qəbul edilib, hazırlanır' },
    { key: 'shipped',   icon: '🚚', label: 'Yolda',        desc: 'Sifariş göndərildi, çatdırılır' },
    { key: 'delivered', icon: '✅', label: 'Çatdırıldı',   desc: 'Sifariş alıcıya çatdırıldı' }
  ];

  const currentIdx = statusFlow.findIndex(s => s.key === currentStatus);

  overlay.innerHTML = `
    <div class="modal" style="max-width:440px;width:100%">
      <button class="modal-close" onclick="document.getElementById('statusChangeModal').remove()">✕</button>
      <h3 style="font-family:var(--font-display);margin-bottom:6px">Sifariş statusu</h3>
      <p style="color:var(--muted);font-size:0.83rem;margin-bottom:24px">Sifarişin cari mərhələsini seçin</p>

      <!-- Progress bar -->
      <div style="display:flex;align-items:center;margin-bottom:28px">
        ${statusFlow.map((s, i) => `
          <div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:6px">
            <div style="width:36px;height:36px;border-radius:50%;
              background:${i <= currentIdx ? '#1a1a1a' : 'var(--border)'};
              color:${i <= currentIdx ? '#fff' : 'var(--muted)'};
              display:flex;align-items:center;justify-content:center;font-size:1rem;
              transition:all 0.3s">
              ${i < currentIdx ? '✓' : s.icon}
            </div>
            <div style="font-size:0.72rem;font-weight:${i===currentIdx?'600':'400'};color:${i<=currentIdx?'var(--text)':'var(--muted)'};text-align:center">${s.label}</div>
          </div>
          ${i < statusFlow.length - 1 ? `
            <div style="flex:0 0 40px;height:2px;background:${i < currentIdx ? '#1a1a1a' : 'var(--border)'};margin-top:-18px"></div>
          ` : ''}
        `).join('')}
      </div>

      <!-- Status seçim düymələri -->
      <div style="display:flex;flex-direction:column;gap:10px;margin-bottom:24px">
        ${statusFlow.map(s => `
          <button onclick="updateOrderStatus('${orderId}', '${s.key}')"
            style="display:flex;align-items:center;gap:12px;padding:12px 16px;
              border:2px solid ${s.key === currentStatus ? 'var(--accent)' : 'var(--border)'};
              border-radius:12px;background:${s.key === currentStatus ? 'rgba(201,168,108,0.08)' : 'transparent'};
              cursor:${s.key === currentStatus ? 'default' : 'pointer'};text-align:left;width:100%;
              font-family:inherit;transition:all 0.2s">
            <span style="font-size:1.2rem">${s.icon}</span>
            <div>
              <div style="font-weight:600;font-size:0.88rem">${s.label}</div>
              <div style="font-size:0.75rem;color:var(--muted)">${s.desc}</div>
            </div>
            ${s.key === currentStatus ? `<span style="margin-left:auto;color:var(--accent);font-size:0.75rem;font-weight:600">Cari status</span>` : ''}
          </button>
        `).join('')}
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
  setTimeout(() => overlay.classList.add('open'), 10);
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
}

/* ── Firestore-da statusu yenilə ── */
async function updateOrderStatus(orderId, newStatus) {
  try {
    await fbDb.collection('orders').doc(orderId).update({
      status:    newStatus,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    // Lokal _vendorOrders-u yenilə
    if (window._vendorOrders) {
      const idx = window._vendorOrders.findIndex(o => o.id === orderId);
      if (idx !== -1) window._vendorOrders[idx].status = newStatus;
    }

    document.getElementById('statusChangeModal')?.remove();
    toast.show('Status yeniləndi ✓', 'success');

    // Cədvəli yenilə
    filterVendorOrders();

  } catch (err) {
    toast.show('Xəta: ' + err.message, 'error');
  }
}

function vendorSidebarClick(idx) {
  if (idx === 7) { fbAuth.signOut(); return; }
  // Digər menüler gələcəkdə genişləndirilə bilər
}

/* ══════════════════════════════════════════
   RENDER (müştəri görünüşü)
══════════════════════════════════════════ */
function renderStorePage() {
  const s = storeData;

  const initials = s.storeName.split(' ').map(w => w[0] || '').join('').substring(0, 2).toUpperCase();
  const logoHTML = s.photoURL ? `<img src="${s.photoURL}" alt="${s.storeName}"/>` : initials;
  const joinYear = s.createdAt?.toDate ? s.createdAt.toDate().getFullYear() : null;
  const catTag   = s.category
    ? `<span style="display:inline-block;background:rgba(255,255,255,0.12);color:rgba(255,255,255,0.7);font-size:0.7rem;padding:2px 10px;border-radius:20px;margin-left:0.75rem;letter-spacing:0.04em;vertical-align:middle;">${s.category}</span>`
    : '';

  document.getElementById('storePageContent').innerHTML = `
    <div class="store-hero">
      <div class="store-hero-inner">
        <div class="store-logo">${logoHTML}</div>
        <div class="store-hero-info">
          <div class="store-hero-name">${s.storeName}${catTag}</div>
          ${s.desc ? `<div class="store-hero-desc">${s.desc}</div>` : '<div style="margin-bottom:1.1rem;"></div>'}
          <div class="store-hero-stats">
            <div class="store-stat"><span id="followerCount">${s.followerCount}</span><small>İzləyici</small></div>
            <div class="store-stat"><span>${storeListings.length}</span><small>Məhsul</small></div>
            ${joinYear ? `<div class="store-stat"><span>${joinYear}</span><small>İldən bəri</small></div>` : ''}
          </div>
        </div>
        <button class="store-follow-btn ${isFollowing ? 'following' : ''}" id="storeFollowBtn" onclick="toggleFollow()">
          ${followBtnHTML(isFollowing)}
        </button>
      </div>
    </div>

    <div class="store-content-grid">
      <div>
        <div class="store-products-header">
          <h2 class="store-products-title">Məhsullar</h2>
          <span class="section-count">${storeListings.length} məhsul</span>
        </div>
        ${storeListings.length > 0
          ? `<div class="product-grid" id="storeProductGrid"></div>`
          : `<div class="store-empty"><div style="font-size:3rem;margin-bottom:1rem;">🏷️</div><p>Bu mağazada hələ məhsul yoxdur</p></div>`
        }
      </div>
      <div class="store-side-col">
        ${s.desc ? `<div class="store-side-card"><div class="store-side-title">Haqqımızda</div><p class="store-side-text">${s.desc}</p></div>` : ''}
        <div class="store-side-card campaign-card">
          <div class="store-side-title">Kampaniya</div>
          <div class="campaign-badge">Aktiv deyil</div>
          <div class="campaign-title">Hazırda kampaniya yoxdur</div>
          <p class="store-side-text">Bu mağazanın aktiv kampaniyası olmadıqda burada görünəcək.</p>
        </div>
        ${(s.phone || s.email) ? `
        <div class="store-side-card">
          <div class="store-side-title">Əlaqə</div>
          ${s.phone ? `<div class="store-contact-row"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 01.4 1.18 2 2 0 012 1h3a2 2 0 012 1.72c.13.96.36 1.9.7 2.81a2 2 0 01-.45 2.11L6.09 8.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0122 16.92z"/></svg><span>${s.phone}</span></div>` : ''}
          ${s.email ? `<div class="store-contact-row"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg><span>${s.email}</span></div>` : ''}
        </div>` : ''}
        <div class="store-side-card">
          <div class="store-side-title">Çatdırılma</div>
          <div class="store-delivery-tag">✓ Pulsuz çatdırılma</div>
          <p class="store-side-text">50 AZN üzərindəki sifarişlərə pulsuz çatdırılma.</p>
        </div>
      </div>
    </div>
  `;

  document.title = `${s.storeName} — MODA`;
  if (storeListings.length > 0) renderProducts(storeListings, 'storeProductGrid');
}

function followBtnHTML(following) {
  if (following) return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/><polyline points="17 11 19 13 23 9"/></svg>İzləyirsiniz`;
  return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="16" y1="11" x2="22" y2="11"/></svg>İzlə`;
}

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
      await ref.set({ followerId: cu.uid, storeId: storeUid, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
      isFollowing = true;
      storeData.followerCount++;
    }
    const countEl = document.getElementById('followerCount');
    if (countEl) countEl.textContent = storeData.followerCount;
    btn.className = `store-follow-btn${isFollowing ? ' following' : ''}`;
    btn.innerHTML = followBtnHTML(isFollowing);
    if (typeof toast !== 'undefined') toast.show(isFollowing ? `${storeData.storeName} izlənilir ✓` : 'İzləmə dayandırıldı', 'success');
  } catch (err) {
    if (typeof toast !== 'undefined') toast.show('Xəta: ' + err.message, 'error');
  }
}
