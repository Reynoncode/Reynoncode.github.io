/* ════════════════════════════════════════
   QLOBAL STATE
════════════════════════════════════════ */
let currentAdmin          = null;
let adminEditCurrentData  = null;
let adminStockCurrentData = null;
let salesChartRef         = null;
let catChartRef           = null;
let userRoleChartRef      = null;
let currentPeriod         = 7;
let analyticsLoaded       = false;

/* ════════════════════════════════════════
   KATEQORİYA SİSTEMİ — DATA
════════════════════════════════════════ */
const DEFAULT_MAIN_CATEGORIES = [
  { id:'elektronika', icon:'📱', label:'Elektronika',             subCats:['Telefonlar','Noutbuklar','Planşetlər','Aksesuarlar','Qulaqlıqlar','Smartwatch','Kameralar','Oyun konsulları'] },
  { id:'geyim',       icon:'👗', label:'Geyim və Moda',           subCats:['Donlar','Köynəklər','Şalvarlar','Gödəkçələr','Palto','Kazaklar','Kostyumlar','Blazerlər','İdman geyimi','Yay geyimi','Alt paltarı','Pijama'] },
  { id:'ev',          icon:'🏠', label:'Ev və Yaşam',             subCats:['Mebel','Dekor','Yataq dəstləri','Mətbəx əşyaları','Bağ əşyaları','Aydınlatma','Xalça','Pərdə','Vanna otağı'] },
  { id:'gozellik',    icon:'💄', label:'Gözəllik və Baxım',       subCats:['Parfüm','Kosmetika','Saç qulluğu','Dəri qulluğu','Dırnaq qulluğu','Makiyaj','Kişi qulluğu','Ağız qulluğu'] },
  { id:'saglamliq',   icon:'💊', label:'Sağlamlıq və Vitaminlər', subCats:['Vitaminlər','Əlavə qidalar','Proteinlər','Tibbi avadanlıq','Masaj','Arıqlamaq üçün','Enerji içkiləri'] },
  { id:'usaq',        icon:'🧸', label:'Uşaq və Oyuncaqlar',      subCats:['Oyuncaqlar','Uşaq geyimi','Kitablar','Uşaq arabaları','Məktəb ləvazimatı','Uşaq qidası','Beşik & Mebel'] },
  { id:'avto',        icon:'🚗', label:'Avto və Moto',            subCats:['Ehtiyat hissələri','Aksesuarlar','Avtomobil qulluğu','Navigasiya','Motosiklet','Şinlər','Akkumulyator'] },
  { id:'idman',       icon:'⚽', label:'İdman və Outdoor',         subCats:['Fitness avadanlığı','Futbol','Basketbol','Üzgüçülük','Dağ idmanı','Velosiped','Kempinq','Yoga'] },
  { id:'kitab',       icon:'📚', label:'Kitablar və Ofis',         subCats:['Bədii ədəbiyyat','Elmi kitablar','Uşaq kitabları','Dərsliklər','Kançelyariya','Ofis avadanlığı','Sənət ləvazimatı'] },
  { id:'hediyye',     icon:'🎁', label:'Hədiyyələr və Digər',      subCats:['Hədiyyə dəstləri','Zərgərlik','Suvenirlər','Çiçəklər','Şirniyyat','Digər'] },
];

const ICON_OPTIONS = [
  '📱','💻','🖥️','⌨️','🖱️','📷','🎮','🎧','📺','📡',
  '👗','👔','👕','👖','🧥','👠','👟','🧣','👒','🎩',
  '🏠','🛋️','🛏️','🚿','🍳','🪴','💡','🧹','🛒',
  '💄','💋','🧴','🧼','💅','🪞','🧽',
  '💊','🩺','🏥','💉','🧬','🩹',
  '🧸','🪀','🎠','🚂','✏️','📚','🎒',
  '🚗','🏍️','🚌','✈️','⛽','🔧','🛞',
  '⚽','🏀','🎾','🏊','🚴','🧘','🏋️','🤸',
  '📖','📝','📋','✂️','🖊️','📐','🗂️',
  '🎁','🎀','💍','💎','🌹','🍫','🪅',
  '🔑','🏷️','🛍️','📦','🔔','⭐','✨','🌟',
];

const DEFAULT_COMMISSIONS = [
  { category:'Elektronika',  rate:8,  active:true },
  { category:'Geyim və Moda',rate:12, active:true },
  { category:'Ev və Yaşam',  rate:10, active:true },
  { category:'Gözəllik',     rate:13, active:true },
  { category:'Sağlamlıq',    rate:10, active:true },
  { category:'Uşaq',         rate:8,  active:true },
  { category:'Avto',         rate:7,  active:true },
  { category:'İdman',        rate:10, active:true },
  { category:'Kitab',        rate:8,  active:true },
  { category:'Digər',        rate:10, active:true },
];

let platformMainCategories = JSON.parse(JSON.stringify(DEFAULT_MAIN_CATEGORIES));
let platformCommissions    = JSON.parse(JSON.stringify(DEFAULT_COMMISSIONS));
let editMcatIdx = null;

/* ════════════════════════════════════════
   Admin yoxlaması
════════════════════════════════════════ */
fbAuth.onAuthStateChanged(async (user) => {
  if (!user) { window.location.href = 'index.html'; return; }
  try {
    const snap = await fbDb.collection('users').doc(user.uid).get();
    const role = snap.exists ? snap.data().role : null;
    if (role !== 'admin') { window.location.href = 'profile.html'; return; }
    currentAdmin = user;
    document.getElementById('loadingOverlay').style.display = 'none';
    initAdmin();
  } catch(e) { window.location.href = 'profile.html'; }
});

function initAdmin() {
  loadStats();
  loadRecentUsers();
}

/* ════════════════════════════════════════
   İSTİFADƏÇİLƏR
════════════════════════════════════════ */
async function loadStats() {
  try {
    const [uSnap, lSnap, oSnap] = await Promise.all([
      fbDb.collection('users').get(),
      fbDb.collection('listings').get(),
      fbDb.collection('orders').get()
    ]);
    const vendors = uSnap.docs.filter(d => d.data().role === 'vendor').length;
    document.getElementById('s-totalUsers').textContent = uSnap.size;
    document.getElementById('s-vendors').textContent    = vendors;
    document.getElementById('s-listings').textContent   = lSnap.size;
    document.getElementById('s-orders').textContent     = oSnap.size;
  } catch(e) { console.warn('Stats xətası', e); }
}

async function loadRecentUsers() {
  const el = document.getElementById('recentUsers');
  try {
    const snap = await fbDb.collection('users').get();
    if (snap.empty) {
      el.innerHTML = '<div class="empty" style="grid-column:1/-1"><p>Hələ heç bir istifadəçi yoxdur</p></div>';
      return;
    }
    const sorted = snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter(u => u.createdAt)
      .sort((a, b) => {
        const ta = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
        const tb = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
        return tb - ta;
      })
      .slice(0, 5);
    const fallback = snap.docs.map(d => ({ id: d.id, ...d.data() })).slice(0, 5);
    const toShow = sorted.length > 0 ? sorted : fallback;
    el.className = 'recent-grid';
    el.innerHTML = toShow.map(u => userMiniCard(u.id, u)).join('');
  } catch(e) {
    el.innerHTML = '<div class="empty" style="grid-column:1/-1"><p>Yüklənərkən xəta baş verdi</p></div>';
  }
}

function userMiniCard(uid, u) {
  const first = u.firstName || '', last = u.lastName || '';
  const fullName = (first + ' ' + last).trim() || u.displayName || u.email || 'İstifadəçi';
  const initial  = (first[0] || u.email?.[0] || '?').toUpperCase();
  const blocked  = u.blocked, role = blocked ? 'blocked' : (u.role || 'customer');
  const ROLES = { admin:'Admin', vendor:'Satıcı', customer:'Müştəri', blocked:'Bloklanıb' };
  const avatarHtml = u.photoURL ? `<img src="${u.photoURL}" alt="">` : initial;
  return `<div class="user-mini-card">
    <div class="u-avatar">${avatarHtml}</div>
    <div style="min-width:0;flex:1;">
      <div class="u-name">${escHtml(fullName)}</div>
      <div class="u-email">${escHtml(u.email||'—')}</div>
      <span class="badge badge-${role}" style="margin-top:5px;">${ROLES[role]||role}</span>
    </div>
  </div>`;
}

async function searchUsers() {
  const term = document.getElementById('userSearchInput').value.toLowerCase().trim();
  const el   = document.getElementById('userResults');
  if (!term) {
    el.innerHTML = '<div class="empty"><div class="empty-icon">🔍</div><p>Axtarış üçün bir şey daxil edin</p></div>';
    return;
  }
  el.innerHTML = '<div style="text-align:center;padding:2rem;"><div class="spinner-sm" style="margin:0 auto;"></div></div>';
  try {
    const allSnap = await fbDb.collection('users').get();
    const results = allSnap.docs.map(d => ({ id: d.id, ...d.data() })).filter(u =>
      (u.email||'').toLowerCase().includes(term) ||
      (u.firstName||'').toLowerCase().includes(term) ||
      (u.lastName||'').toLowerCase().includes(term) ||
      (u.displayName||'').toLowerCase().includes(term)
    );
    if (!results.length) {
      el.innerHTML = '<div class="empty"><div class="empty-icon">😶</div><p>Heç bir nəticə tapılmadı</p></div>';
      return;
    }
    el.innerHTML = `<div style="overflow-x:auto;"><table class="data-table">
      <thead><tr><th>İstifadəçi</th><th>Email</th><th>Rol</th><th>Status</th><th>Əməliyyatlar</th></tr></thead>
      <tbody>${results.map(u => userRow(u)).join('')}</tbody>
    </table></div>`;
  } catch(e) {
    el.innerHTML = `<div class="empty"><div class="empty-icon">⚠️</div><p>Xəta: ${escHtml(e.message)}</p></div>`;
  }
}

function userRow(u) {
  const first = u.firstName || '', last = u.lastName || '';
  const fullName = (first + ' ' + last).trim() || u.displayName || '—';
  const initial  = (first[0] || u.email?.[0] || '?').toUpperCase();
  const blocked  = u.blocked, role = u.role || 'customer';
  const avatarHtml = u.photoURL
    ? `<img src="${u.photoURL}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`
    : initial;
  return `<tr>
    <td><div style="display:flex;align-items:center;gap:0.6rem;">
      <div class="u-avatar" style="width:30px;height:30px;font-size:0.8rem;flex-shrink:0;">${avatarHtml}</div>
      <span style="font-weight:500;">${escHtml(fullName)}</span>
    </div></td>
    <td style="color:var(--muted);font-size:0.8rem;">${escHtml(u.email||'—')}</td>
    <td><select class="role-select" onchange="changeRole('${u.id}', this.value)">
      <option value="customer" ${role==='customer'?'selected':''}>Müştəri</option>
      <option value="vendor"   ${role==='vendor'  ?'selected':''}>Satıcı</option>
      <option value="admin"    ${role==='admin'   ?'selected':''}>Admin</option>
    </select></td>
    <td><span class="badge badge-${blocked?'blocked':'customer'}">${blocked?'Bloklanıb':'Aktiv'}</span></td>
    <td><div class="td-actions">
      <button class="btn btn-outline btn-sm" onclick="toggleBlock('${u.id}',${!blocked})">${blocked?'Bloku aç':'Blokla'}</button>
      <button class="btn btn-danger btn-sm" onclick="confirmDeleteUser('${u.id}','${escAttr(fullName)}')">Sil</button>
    </div></td>
  </tr>`;
}

async function changeRole(uid, role) {
  try {
    await fbDb.collection('users').doc(uid).update({ role });
    showToast('Rol yeniləndi ✓', 'success');
  } catch(e) { showToast('Xəta: ' + e.message, 'error'); }
}

async function toggleBlock(uid, block) {
  try {
    await fbDb.collection('users').doc(uid).update({
      blocked: block,
      blockedAt: block ? firebase.firestore.FieldValue.serverTimestamp() : null
    });
    showToast(block ? 'Hesab bloklandı' : 'Blok açıldı', block ? 'error' : 'success');
    searchUsers();
    loadRecentUsers();
  } catch(e) { showToast('Xəta: ' + e.message, 'error'); }
}

function confirmDeleteUser(uid, name) {
  if (!confirm(`"${name}" hesabını bütün məlumatları ilə birlikdə silmək istəyirsiniz?\n\nBu əməliyyat geri alına bilməz.`)) return;
  (async () => {
    try {
      const lSnap = await fbDb.collection('listings').where('userId','==',uid).get();
      const batch = fbDb.batch();
      lSnap.docs.forEach(d => batch.delete(d.ref));
      batch.delete(fbDb.collection('users').doc(uid));
      await batch.commit();
      showToast('Hesab silindi', 'success');
      searchUsers(); loadRecentUsers(); loadStats();
    } catch(e) { showToast('Xəta: ' + e.message, 'error'); }
  })();
}

/* ════════════════════════════════════════
   ELAN MODERASİYASI
════════════════════════════════════════ */
async function searchListings() {
  const term = document.getElementById('listingSearchInput').value.toLowerCase().trim();
  const el   = document.getElementById('listingResults');
  if (!term) {
    el.innerHTML = '<div class="empty"><div class="empty-icon">📦</div><p>Axtarış üçün bir şey daxil edin</p></div>';
    return;
  }
  el.innerHTML = '<div style="text-align:center;padding:2rem;"><div class="spinner-sm" style="margin:0 auto;"></div></div>';
  try {
    const allSnap = await fbDb.collection('listings').get();
    const results = allSnap.docs.map(d => ({ id: d.id, ...d.data() })).filter(l =>
      (l.name||l.title||'').toLowerCase().includes(term) ||
      (l.storeName||l.vendorName||'').toLowerCase().includes(term) ||
      (l.brand||'').toLowerCase().includes(term) ||
      (l.category||'').toLowerCase().includes(term)
    );
    if (!results.length) {
      el.innerHTML = '<div class="empty"><div class="empty-icon">🙈</div><p>Heç bir elan tapılmadı</p></div>';
      return;
    }
    el.innerHTML = `<div class="listing-grid">${results.map(listingCard).join('')}</div>`;
  } catch(e) {
    el.innerHTML = `<div class="empty"><div class="empty-icon">⚠️</div><p>Xəta: ${escHtml(e.message)}</p></div>`;
  }
}

function listingCard(l) {
  const img = (l.imgs && l.imgs[0]) || (l.images && l.images[0]) || l.image || '';
  const imgHtml = img ? `<img src="${img}" alt="" loading="lazy">` : '🛍️';
  const sizes = l.sizes || [];
  const totalStock = sizes.reduce((s, x) => s + (parseInt(x.stock) || 0), 0) || parseInt(l.stock) || 0;
  const name = escHtml(l.name || l.title || '—');
  const storeName = escHtml(l.storeName || l.vendorName || l.brand || 'Mağaza');
  const isSale = l.oldPrice && l.oldPrice > l.price;
  const colors = l.colors || [];
  const colorsHtml = colors.length ? `<div class="listing-colors">${colors.slice(0,6).map(c =>
    `<span class="listing-color-dot" style="background:${c.hex};${c.hex==='#FFFFFF'?'border:1px solid #ddd;':''}" title="${escAttr(c.name)}"></span>`
  ).join('')}${colors.length>6?`<span style="font-size:0.65rem;color:var(--muted);">+${colors.length-6}</span>`:''}</div>` : '';
  return `<div class="listing-card">
    <div class="listing-img">${imgHtml}</div>
    <div class="listing-body">
      <div class="listing-vendor">${storeName}</div>
      <div class="listing-title">${name}</div>
      <div class="listing-price">${l.price != null ? l.price.toFixed(2)+' ₼' : '—'}</div>
      ${isSale ? `<div class="listing-old-price">${l.oldPrice.toFixed(2)} ₼</div>` : ''}
      ${colorsHtml}
      <div class="listing-stock ${totalStock===0?'out':''}">Stok: ${totalStock>0?totalStock+' ədəd':'Yoxdur'}</div>
      <div class="listing-actions">
        <button class="btn btn-outline btn-sm" onclick="adminOpenEdit('${l.id}')">Redaktə</button>
        <button class="btn btn-warn btn-sm" onclick="adminOpenStock('${l.id}')">Stok</button>
        <button class="btn btn-danger btn-sm" onclick="confirmDeleteListing('${l.id}')">Sil</button>
      </div>
    </div>
  </div>`;
}

async function adminOpenEdit(id) {
  try {
    const snap = await fbDb.collection('listings').doc(id).get();
    if (!snap.exists) { showToast('Elan tapılmadı', 'error'); return; }
    adminEditCurrentData = { id, ...snap.data() };
    const l = adminEditCurrentData;
    document.getElementById('editId').value       = id;
    document.getElementById('editName').value     = l.name || l.title || '';
    document.getElementById('editPrice').value    = l.price || '';
    document.getElementById('editOldPrice').value = l.oldPrice || '';
    document.getElementById('editBrand').value    = l.brand || '';
    document.getElementById('editDesc').value     = l.desc || l.description || '';
    document.getElementById('editModal').classList.add('open');
  } catch(e) { showToast('Xəta: ' + e.message, 'error'); }
}

async function saveListing() {
  const id = document.getElementById('editId').value; if (!id) return;
  const name     = document.getElementById('editName').value.trim();
  const price    = parseFloat(document.getElementById('editPrice').value);
  const oldPrice = parseFloat(document.getElementById('editOldPrice').value) || null;
  const brand    = document.getElementById('editBrand').value.trim();
  const desc     = document.getElementById('editDesc').value.trim();
  if (!name)       { showToast('Məhsul adını daxil edin', 'error'); return; }
  if (isNaN(price) || price <= 0) { showToast('Düzgün qiymət daxil edin', 'error'); return; }
  try {
    await fbDb.collection('listings').doc(id).update({
      name, title: name, price,
      oldPrice: (oldPrice && oldPrice > price) ? oldPrice : null,
      brand, desc, description: desc,
      badge: (oldPrice && oldPrice > price) ? 'Endirim' : null,
      updatedByAdmin: true,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    showToast('Elan yeniləndi ✓', 'success');
    closeModal('editModal'); searchListings();
  } catch(e) { showToast('Xəta: ' + e.message, 'error'); }
}

async function adminOpenStock(id) {
  try {
    const snap = await fbDb.collection('listings').doc(id).get();
    if (!snap.exists) { showToast('Elan tapılmadı', 'error'); return; }
    adminStockCurrentData = { id, ...snap.data() };
    const l = adminStockCurrentData;
    document.getElementById('stockId').value = id;
    document.getElementById('stockModalProductName').textContent = l.name || l.title || '';
    const body  = document.getElementById('stockModalBody');
    const sizes = l.sizes || [];
    if (sizes.length > 0) {
      body.innerHTML = sizes.map((s, i) => `
        <div class="admin-size-row">
          <span class="admin-size-label">${escHtml(s.label)}</span>
          <div class="admin-size-ctrl">
            <button type="button" class="admin-stock-btn" onclick="adminStockStep(${i},-1)">−</button>
            <input type="number" class="admin-stock-inp" id="adminStock-${i}" value="${parseInt(s.stock)||0}" min="0">
            <button type="button" class="admin-stock-btn" onclick="adminStockStep(${i},1)">+</button>
          </div>
          <span style="font-size:0.72rem;color:var(--muted);">ədəd</span>
        </div>`).join('');
    } else {
      body.innerHTML = `<div class="form-group">
        <label>Ümumi stok miqdarı</label>
        <input type="number" id="adminStockFlat" value="${parseInt(l.stock)||0}" min="0"
          style="font-family:'DM Sans',sans-serif;font-size:0.875rem;width:100%;padding:0.62rem 0.85rem;border:1px solid var(--border);border-radius:8px;background:var(--bg);color:var(--accent);outline:none;">
      </div>
      <p style="font-size:0.75rem;color:var(--muted);margin-top:0.5rem;">Bu elana ölçü əlavə edilməyib.</p>`;
    }
    document.getElementById('stockModal').classList.add('open');
  } catch(e) { showToast('Xəta: ' + e.message, 'error'); }
}

function adminStockStep(i, delta) {
  const inp = document.getElementById(`adminStock-${i}`);
  if (inp) inp.value = Math.max(0, (parseInt(inp.value)||0) + delta);
}

async function saveStock() {
  const id = document.getElementById('stockId').value;
  if (!id || !adminStockCurrentData) return;
  try {
    const sizes = adminStockCurrentData.sizes || [];
    let updateData = { updatedByAdmin:true, updatedAt:firebase.firestore.FieldValue.serverTimestamp() };
    if (sizes.length > 0) {
      updateData.sizes = sizes.map((s, i) => ({
        ...s,
        stock: Math.max(0, parseInt(document.getElementById(`adminStock-${i}`)?.value) || 0)
      }));
    } else {
      updateData.stock = Math.max(0, parseInt(document.getElementById('adminStockFlat')?.value) || 0);
    }
    await fbDb.collection('listings').doc(id).update(updateData);
    showToast('Stok yeniləndi ✓', 'success');
    closeModal('stockModal'); searchListings();
  } catch(e) { showToast('Xəta: ' + e.message, 'error'); }
}

function confirmDeleteListing(id) {
  if (!confirm('Bu elanı silmək istəyirsiniz?\n\nBu əməliyyat geri alına bilməz.')) return;
  fbDb.collection('listings').doc(id).delete()
    .then(() => { showToast('Elan silindi', 'success'); searchListings(); })
    .catch(e => showToast('Xəta: ' + e.message, 'error'));
}

/* ════════════════════════════════════════════════════════
   PLATFORMA AYARLARI — LOAD / SAVE
════════════════════════════════════════════════════════ */
async function loadPlatformSettings() {
  document.getElementById('platformLoader').style.display  = 'flex';
  document.getElementById('platformContent').style.display = 'none';

  try {
    const snap = await fbDb.collection('admin').doc('platformSettings').get();
    if (snap.exists) {
      const d = snap.data();
      document.getElementById('cfg-siteName').value      = d.siteName     ?? 'MODA';
      document.getElementById('cfg-freeShipping').value  = d.freeShipping ?? 50;
      document.getElementById('cfg-minOrder').value      = d.minOrder     ?? 5;
      document.getElementById('cfg-maxImages').value     = d.maxImages    ?? 8;
      document.getElementById('cfg-maintenance').checked = !!d.maintenance;
      document.getElementById('cfg-allowReg').checked    = d.allowReg !== false;
      document.getElementById('cfg-reviewMod').checked   = !!d.reviewMod;
      document.getElementById('cfg-autoVendor').checked  = !!d.autoVendor;
      document.getElementById('cfg-wishlist').checked    = d.wishlist !== false;
      document.getElementById('cfg-reviews').checked     = d.reviews  !== false;

      if (Array.isArray(d.mainCategories) && d.mainCategories.length)
        platformMainCategories = d.mainCategories;
      else if (Array.isArray(d.categories) && d.categories.length)
        platformMainCategories = d.categories; // köhnə format fallback

      if (Array.isArray(d.commissions) && d.commissions.length)
        platformCommissions = d.commissions;

      if (d.updatedAt) {
        const ts = d.updatedAt.toDate ? d.updatedAt.toDate() : new Date(d.updatedAt);
        document.getElementById('platformLastSaved').textContent =
          ts.toLocaleDateString('az-AZ', { day:'numeric', month:'long', year:'numeric', hour:'2-digit', minute:'2-digit' });
      }
    } else {
      platformMainCategories = JSON.parse(JSON.stringify(DEFAULT_MAIN_CATEGORIES));
      platformCommissions    = JSON.parse(JSON.stringify(DEFAULT_COMMISSIONS));
    }
  } catch(e) {
    console.warn('Platforma ayarları yüklənmədi:', e.message);
    showToast('Ayarlar yüklənərkən xəta: ' + e.message, 'error');
  }

  renderMainCategoryList();
  renderCommissionTable();
  document.getElementById('platformLoader').style.display  = 'none';
  document.getElementById('platformContent').style.display = 'block';
}

async function savePlatformSettings() {
  const btn = document.getElementById('platformSaveBtn');
  if (btn) { btn.disabled = true; btn.textContent = 'Saxlanır...'; }
 
  try {
    syncCommissionsFromDOM();
 
    const payload = {
      siteName:       document.getElementById('cfg-siteName').value.trim() || 'MODA',
      maintenance:    document.getElementById('cfg-maintenance').checked,
      allowReg:       document.getElementById('cfg-allowReg').checked,
      freeShipping:   parseFloat(document.getElementById('cfg-freeShipping').value) || 0,
      minOrder:       parseFloat(document.getElementById('cfg-minOrder').value) || 0,
      reviewMod:      document.getElementById('cfg-reviewMod').checked,
      autoVendor:     document.getElementById('cfg-autoVendor').checked,
      wishlist:       document.getElementById('cfg-wishlist').checked,
      reviews:        document.getElementById('cfg-reviews').checked,
      maxImages:      parseInt(document.getElementById('cfg-maxImages').value) || 8,
      mainCategories: platformMainCategories,   // ← yeni format
      categories:     platformMainCategories,   // ← köhnə uyğunluq
      commissions:    platformCommissions,
      updatedAt:      firebase.firestore.FieldValue.serverTimestamp(),
      updatedBy:      currentAdmin?.uid || 'admin'
    };
 
    // 1. Admin collection-a yaz (köhnə kimi)
    await fbDb.collection('admin').doc('platformSettings').set(payload, { merge: true });
 
    // 2. PUBLIC collection-a yaz — bütün istifadəçilər oxuya bilsin
    //    Firestore rules-da: match /settings/{doc} { allow read: if true; allow write: if request.auth != null && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin'; }
    await fbDb.collection('settings').doc('categories').set({
      items: platformMainCategories,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedBy: currentAdmin?.uid || 'admin'
    });
 
    const now = new Date();
    const formatted = now.toLocaleDateString('az-AZ', {
      day: 'numeric', month: 'long', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
    document.getElementById('platformLastSaved').textContent = formatted;
    showToast('Ayarlar saxlandı ✓', 'success');
 
  } catch(e) {
    showToast('Xəta: ' + e.message, 'error');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:13px;height:13px;">
        <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/>
        <polyline points="17 21 17 13 7 13 7 21"/>
        <polyline points="7 3 7 8 15 8"/>
      </svg>Ayarları Saxla`;
    }
  }
}
 
/* ════════════════════════════════════════════════════════
   ANA KATEQORİYA — RENDER
════════════════════════════════════════════════════════ */
function renderMainCategoryList() {
  const container = document.getElementById('mainCatContainer');
  if (!container) return;

  if (!platformMainCategories.length) {
    container.innerHTML = '<div style="text-align:center;padding:1.5rem;color:var(--muted);font-size:0.82rem;">Kateqoriya yoxdur</div>';
    return;
  }

  container.innerHTML = platformMainCategories.map((cat, i) => `
    <div class="mcat-item" id="mcat-${i}">
      <div class="mcat-header">
        <div class="mcat-left">
          <span class="mcat-icon-badge">${cat.icon || '📁'}</span>
          <span class="mcat-name-text">${escHtml(cat.label)}</span>
          <span class="mcat-sub-count">${(cat.subCats||[]).length} alt</span>
        </div>
        <div class="mcat-btns">
          <button class="mcat-expand-btn" onclick="toggleMcat(${i})" title="Alt kateqoriyalar göstər">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
          </button>
          <button class="cat-action-btn" onclick="openEditMcat(${i})" title="Düzəlt" style="font-size:0.8rem;">✎</button>
          <button class="cat-action-btn del" onclick="deleteMainCategory(${i})" title="Sil">✕</button>
        </div>
      </div>

      <div class="mcat-subs-panel" id="mcat-subs-${i}" style="display:none;">
        <div id="sub-list-${i}" class="sub-chips-list">
          ${renderSubCatChips(i)}
        </div>
        <div class="add-sub-row">
          <input type="text" class="add-sub-input" id="sub-input-${i}"
            placeholder="Yeni alt kateqoriya..."
            onkeydown="if(event.key==='Enter')addSubCat(${i})">
          <button class="btn btn-dark btn-sm" onclick="addSubCat(${i})">+ Əlavə et</button>
        </div>
      </div>
    </div>
  `).join('');
}

function renderSubCatChips(catIdx) {
  const subs = (platformMainCategories[catIdx] || {}).subCats || [];
  if (!subs.length) return '<p style="font-size:0.78rem;color:var(--muted);margin:.25rem 0;">Alt kateqoriya yoxdur</p>';
  return `<div class="sub-chip-wrap">${subs.map((sub, si) => `
    <div class="sub-chip">
      <span>${escHtml(sub)}</span>
      <button class="sub-chip-rm" onclick="deleteSubCat(${catIdx},${si})" title="Sil">✕</button>
    </div>
  `).join('')}</div>`;
}

function toggleMcat(i) {
  const panel = document.getElementById(`mcat-subs-${i}`);
  const btn   = document.querySelector(`#mcat-${i} .mcat-expand-btn svg`);
  if (!panel) return;
  const isOpen = panel.style.display !== 'none';
  panel.style.display = isOpen ? 'none' : 'block';
  if (btn) btn.style.transform = isOpen ? '' : 'rotate(180deg)';
}

function addSubCat(catIdx) {
  const inp = document.getElementById(`sub-input-${catIdx}`);
  const val = inp.value.trim();
  if (!val) { showToast('Alt kateqoriya adını daxil edin', 'error'); return; }
  if (!platformMainCategories[catIdx].subCats) platformMainCategories[catIdx].subCats = [];
  if (platformMainCategories[catIdx].subCats.map(s => s.toLowerCase()).includes(val.toLowerCase())) {
    showToast('Bu alt kateqoriya artıq var', 'error'); return;
  }
  platformMainCategories[catIdx].subCats.push(val);
  inp.value = '';
  document.getElementById(`sub-list-${catIdx}`).innerHTML = renderSubCatChips(catIdx);
  updateSubCount(catIdx);
  showToast(`"${val}" əlavə edildi`, 'success');
}

function deleteSubCat(catIdx, subIdx) {
  const name = platformMainCategories[catIdx].subCats[subIdx];
  if (!confirm(`"${name}" silinsin?`)) return;
  platformMainCategories[catIdx].subCats.splice(subIdx, 1);
  document.getElementById(`sub-list-${catIdx}`).innerHTML = renderSubCatChips(catIdx);
  updateSubCount(catIdx);
  showToast(`"${name}" silindi`, 'success');
}

function updateSubCount(catIdx) {
  const el = document.querySelector(`#mcat-${catIdx} .mcat-sub-count`);
  if (el) el.textContent = `${(platformMainCategories[catIdx].subCats||[]).length} alt`;
}

function deleteMainCategory(i) {
  const cat = platformMainCategories[i];
  if (!cat) return;
  if (!confirm(`"${cat.label}" kateqoriyası və bütün alt kateqoriyaları silinsin?`)) return;
  platformMainCategories.splice(i, 1);
  renderMainCategoryList();
  showToast(`"${cat.label}" silindi`, 'success');
}

/* ════════════════════════════════════════════════════════
   ANA KATEQORİYA — MODAL (Əlavə et / Düzəlt)
════════════════════════════════════════════════════════ */
function openAddMcat() {
  editMcatIdx = null;
  document.getElementById('mcatModalTitle').textContent = 'Yeni Ana Kateqoriya';
  document.getElementById('mcatLabelInput').value = '';
  document.getElementById('mcatIconDisplay').textContent = '📁';
  document.getElementById('mcatSelectedIcon').value = '📁';
  document.getElementById('mcatCustomIconInput').value = '';
  renderIconGrid('📁');
  document.getElementById('mcatModal').classList.add('open');
}

function openEditMcat(i) {
  editMcatIdx = i;
  const cat = platformMainCategories[i];
  document.getElementById('mcatModalTitle').textContent = 'Kateqoriyanı Düzəlt';
  document.getElementById('mcatLabelInput').value = cat.label;
  document.getElementById('mcatIconDisplay').textContent = cat.icon;
  document.getElementById('mcatSelectedIcon').value = cat.icon;
  document.getElementById('mcatCustomIconInput').value = '';
  renderIconGrid(cat.icon);
  document.getElementById('mcatModal').classList.add('open');
}

function closeMcatModal() {
  document.getElementById('mcatModal').classList.remove('open');
  editMcatIdx = null;
}

function saveMcat() {
  const label = document.getElementById('mcatLabelInput').value.trim();
  const icon  = document.getElementById('mcatSelectedIcon').value || '📁';
  if (!label) { showToast('Kateqoriya adını daxil edin', 'error'); return; }

  if (editMcatIdx !== null) {
    platformMainCategories[editMcatIdx].label = label;
    platformMainCategories[editMcatIdx].icon  = icon;
    showToast(`"${label}" yeniləndi`, 'success');
  } else {
    const id = 'cat_' + Date.now();
    platformMainCategories.push({ id, icon, label, subCats: [] });
    showToast(`"${label}" əlavə edildi`, 'success');
  }

  renderMainCategoryList();
  closeMcatModal();
}

/* ── İcon Grid ── */
function renderIconGrid(selected) {
  const grid = document.getElementById('mcatIconGrid');
  if (!grid) return;
  grid.innerHTML = ICON_OPTIONS.map(ic => `
    <button type="button"
      class="icon-opt${ic === selected ? ' icon-opt-selected' : ''}"
      onclick="selectMcatIcon('${ic}')"
      title="${ic}">${ic}</button>
  `).join('');
}

function selectMcatIcon(ic) {
  document.getElementById('mcatIconDisplay').textContent = ic;
  document.getElementById('mcatSelectedIcon').value = ic;
  document.getElementById('mcatCustomIconInput').value = ic;
  document.querySelectorAll('.icon-opt').forEach(b => {
    b.classList.toggle('icon-opt-selected', b.textContent.trim() === ic);
  });
}

function applyCustomIcon() {
  const val = document.getElementById('mcatCustomIconInput').value.trim();
  if (!val) return;
  const ic = [...val][0] || val; // İlk emoji/simvol
  selectMcatIcon(ic);
}

/* ════════════════════════════════════════════════════════
   KOMİSSİYA
════════════════════════════════════════════════════════ */
function syncCommissionsFromDOM() {
  const rows = document.querySelectorAll('#commissionTableBody tr[data-ci]');
  rows.forEach(row => {
    const i   = parseInt(row.dataset.ci);
    const inp = row.querySelector('.commission-input');
    const tog = row.querySelector('input[type="checkbox"]');
    if (!isNaN(i) && platformCommissions[i]) {
      platformCommissions[i].rate   = parseFloat(inp?.value) || 0;
      platformCommissions[i].active = tog ? tog.checked : true;
    }
  });
}

function renderCommissionTable() {
  const tbody = document.getElementById('commissionTableBody');
  if (!tbody) return;
  if (!platformCommissions.length) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;padding:1.5rem;color:var(--muted);font-size:0.82rem;">Komissiya sətri yoxdur</td></tr>`;
    return;
  }
  tbody.innerHTML = platformCommissions.map((c, i) => `
    <tr data-ci="${i}">
      <td style="font-weight:500;">${escHtml(c.category)}</td>
      <td style="text-align:center;">
        <div style="display:flex;align-items:center;justify-content:center;gap:4px;">
          <input type="number" class="commission-input" value="${c.rate}" min="0" max="100" step="0.5"/>
          <span style="font-size:0.78rem;color:var(--muted);">%</span>
        </div>
      </td>
      <td style="text-align:center;">
        <label class="toggle" style="margin:0 auto;">
          <input type="checkbox" ${c.active ? 'checked' : ''}>
          <span class="toggle-slider"></span>
        </label>
      </td>
      <td style="text-align:center;">
        <button class="commission-del-btn" onclick="deleteCommissionRow(${i})" title="Sil">✕</button>
      </td>
    </tr>`).join('');
}

function addCommissionRow() {
  document.getElementById('newCommissionName').value = '';
  document.getElementById('newCommissionRate').value = '10';
  document.getElementById('commissionModal').classList.add('open');
  setTimeout(() => document.getElementById('newCommissionName').focus(), 100);
}

function confirmAddCommission() {
  const name = document.getElementById('newCommissionName').value.trim();
  const rate = parseFloat(document.getElementById('newCommissionRate').value) || 10;
  if (!name) { showToast('Kateqoriya adı daxil edin', 'error'); return; }
  if (platformCommissions.find(c => c.category.toLowerCase() === name.toLowerCase())) {
    showToast('Bu kateqoriya artıq var', 'error'); return;
  }
  syncCommissionsFromDOM();
  platformCommissions.push({ category: name, rate, active: true });
  closeModal('commissionModal');
  renderCommissionTable();
  showToast(`"${name}" əlavə edildi`, 'success');
}

function deleteCommissionRow(i) {
  const c = platformCommissions[i];
  if (!c) return;
  if (!confirm(`"${c.category}" komissiya sətirini silmək istəyirsiniz?`)) return;
  syncCommissionsFromDOM();
  platformCommissions.splice(i, 1);
  renderCommissionTable();
  showToast(`"${c.category}" silindi`, 'success');
}

/* ════════════════════════════════════════════════════════
   ANALİTİKA
════════════════════════════════════════════════════════ */
function switchPeriod(days, btn) {
  if (currentPeriod === days && analyticsLoaded) return;
  currentPeriod  = days;
  analyticsLoaded = false;
  document.querySelectorAll('.period-tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  loadAnalytics(days);
}

async function loadAnalytics(days = 7) {
  analyticsLoaded = false;
  const now      = new Date();
  const fromDate = new Date(now.getTime() - days * 86400000);
  const prevFrom = new Date(fromDate.getTime() - days * 86400000);

  const rangeEl = document.getElementById('analyticsDateRange');
  if (rangeEl) {
    rangeEl.textContent =
      fromDate.toLocaleDateString('az-AZ', { day:'numeric', month:'short' }) +
      ' — ' + now.toLocaleDateString('az-AZ', { day:'numeric', month:'short', year:'numeric' });
  }

  ['an-revenue','an-orders','an-newusers','an-avgorder'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = '<div class="spinner-sm" style="width:18px;height:18px;border-width:2px;"></div>';
  });

  try {
    const [ordersSnap, usersSnap, listingsSnap] = await Promise.all([
      fbDb.collection('orders').get(),
      fbDb.collection('users').get(),
      fbDb.collection('listings').get()
    ]);

    const allOrders   = ordersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const allUsers    = usersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const allListings = listingsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    function toDate(val) {
      if (!val) return null;
      if (val.toDate) return val.toDate();
      if (val.seconds) return new Date(val.seconds * 1000);
      const d = new Date(val);
      return isNaN(d.getTime()) ? null : d;
    }

    const periodOrders = allOrders.filter(o => { const ts=toDate(o.createdAt); return ts&&ts>=fromDate&&ts<=now; });
    const periodUsers  = allUsers.filter(u  => { const ts=toDate(u.createdAt); return ts&&ts>=fromDate&&ts<=now; });
    const prevOrders   = allOrders.filter(o => { const ts=toDate(o.createdAt); return ts&&ts>=prevFrom&&ts<fromDate; });
    const prevUsers    = allUsers.filter(u  => { const ts=toDate(u.createdAt); return ts&&ts>=prevFrom&&ts<fromDate; });

    const totalRevenue = periodOrders.reduce((s,o)=>s+(parseFloat(o.total)||0),0);
    const totalOrders  = periodOrders.length;
    const newUsers     = periodUsers.length;
    const avgOrder     = totalOrders>0 ? totalRevenue/totalOrders : 0;
    const prevRevenue  = prevOrders.reduce((s,o)=>s+(parseFloat(o.total)||0),0);
    const prevAvg      = prevOrders.length>0 ? prevRevenue/prevOrders.length : 0;

    document.getElementById('an-revenue').textContent  = totalRevenue.toFixed(0)+' ₼';
    document.getElementById('an-orders').textContent   = totalOrders;
    document.getElementById('an-newusers').textContent = newUsers;
    document.getElementById('an-avgorder').textContent = avgOrder.toFixed(0)+' ₼';

    setChangeEl('an-revenue-change',totalRevenue,prevRevenue);
    setChangeEl('an-orders-change', totalOrders, prevOrders.length);
    setChangeEl('an-users-change',  newUsers,    prevUsers.length);
    setChangeEl('an-avg-change',    avgOrder,    prevAvg);

    renderSalesChart(periodOrders,days,fromDate);
    renderCatChart(allListings);
    renderTopProducts(allOrders);
    renderActivityFeed(allOrders,allUsers,allListings);
    renderVendorPerformance(allOrders);
    renderUserRoleChart(allUsers);
    analyticsLoaded = true;
  } catch(e) {
    console.error('Analitika xətası:',e);
    showToast('Analitika yüklənərkən xəta: '+e.message,'error');
    ['an-revenue','an-orders','an-newusers','an-avgorder'].forEach(id=>{
      const el=document.getElementById(id); if(el) el.textContent='—';
    });
  }
}

function setChangeEl(elId,curr,prev) {
  const el=document.getElementById(elId); if(!el) return;
  if(prev===0||prev===null||prev===undefined){el.className='analytics-stat-change neutral';el.textContent='məlumat yoxdur';return;}
  const pct=((curr-prev)/prev*100),isUp=curr>=prev;
  el.className=`analytics-stat-change ${isUp?'up':'down'}`;
  el.textContent=`${isUp?'↑':'↓'} ${Math.abs(pct).toFixed(1)}%`;
}

function renderSalesChart(orders,days,fromDate) {
  const canvas=document.getElementById('salesChart'); if(!canvas) return;
  if(salesChartRef){salesChartRef.destroy();salesChartRef=null;}
  const dayMap={};
  for(let i=0;i<days;i++){
    const d=new Date(fromDate.getTime()+i*86400000);
    const key=d.toLocaleDateString('az-AZ',{month:'short',day:'numeric'});
    dayMap[key]=0;
  }
  orders.forEach(o=>{
    const ts=o.createdAt?.toDate?o.createdAt.toDate():o.createdAt?.seconds?new Date(o.createdAt.seconds*1000):null;
    if(!ts) return;
    const key=ts.toLocaleDateString('az-AZ',{month:'short',day:'numeric'});
    if(dayMap.hasOwnProperty(key)) dayMap[key]+=(parseFloat(o.total)||0);
  });
  const labels=Object.keys(dayMap),data=Object.values(dayMap),maxVal=Math.max(...data,0);
  salesChartRef=new Chart(canvas.getContext('2d'),{
    type:'line',data:{labels,datasets:[{label:'Gəlir (₼)',data,borderColor:'#1a1a1a',backgroundColor:'rgba(26,26,26,0.06)',borderWidth:2,pointBackgroundColor:'#1a1a1a',pointRadius:days<=14?4:2,pointHoverRadius:6,fill:true,tension:0.4}]},
    options:{responsive:true,maintainAspectRatio:true,interaction:{mode:'index',intersect:false},
      plugins:{legend:{display:false},tooltip:{callbacks:{label:ctx=>' '+ctx.parsed.y.toFixed(2)+' ₼'}}},
      scales:{x:{grid:{color:'#f0ede9'},ticks:{font:{family:'DM Sans',size:11},color:'#8a8a8a',maxRotation:45,autoSkip:true,maxTicksLimit:10}},
              y:{grid:{color:'#f0ede9'},ticks:{font:{family:'DM Sans',size:11},color:'#8a8a8a',callback:v=>v+' ₼'},beginAtZero:true,suggestedMax:maxVal>0?maxVal*1.15:10}}}
  });
}

function renderCatChart(listings) {
  const canvas=document.getElementById('catChart'); if(!canvas) return;
  if(catChartRef){catChartRef.destroy();catChartRef=null;}
  const catMap={};
  listings.forEach(l=>{const cat=l.category||'Digər';catMap[cat]=(catMap[cat]||0)+1;});
  const sorted=Object.entries(catMap).sort((a,b)=>b[1]-a[1]).slice(0,6);
  const labels=sorted.map(([k])=>k),values=sorted.map(([,v])=>v);
  const PALETTE=['#1a1a1a','#b8964e','#27ae60','#3498db','#9b59b6','#e67e22'];
  if(!values.length||values.every(v=>v===0)){
    document.getElementById('catLegend').innerHTML='<p style="font-size:0.78rem;color:var(--muted);text-align:center;">Elan yoxdur</p>';return;
  }
  catChartRef=new Chart(canvas.getContext('2d'),{type:'doughnut',data:{labels,datasets:[{data:values,backgroundColor:PALETTE,borderWidth:0,hoverOffset:4}]},options:{responsive:true,maintainAspectRatio:true,plugins:{legend:{display:false}},cutout:'68%'}});
  const legend=document.getElementById('catLegend');
  if(legend){const total=values.reduce((s,v)=>s+v,0);legend.innerHTML=labels.map((l,i)=>{const pct=total>0?((values[i]/total)*100).toFixed(0):0;return`<div style="display:flex;align-items:center;justify-content:space-between;font-size:0.78rem;"><div style="display:flex;align-items:center;gap:0.4rem;"><span style="width:10px;height:10px;border-radius:50%;background:${PALETTE[i]};display:inline-block;flex-shrink:0;"></span><span>${escHtml(l)}</span></div><span style="color:var(--muted);font-weight:600;">${pct}%</span></div>`;}).join('');}
}

function renderTopProducts(allOrders) {
  const el=document.getElementById('topProductsList'); if(!el) return;
  const productMap={};
  allOrders.forEach(o=>{
    const items=o.items||o.products||[];
    items.forEach(item=>{
      const key=String(item.id||item.listingId||item.productId||item.name||Math.random());
      if(!productMap[key]) productMap[key]={name:item.name||item.title||'Məhsul',store:item.storeName||item.vendorName||item.brand||'Mağaza',img:item.img||item.image||item.imageUrl||'',revenue:0,sales:0};
      productMap[key].revenue+=(parseFloat(item.price)||0)*(parseInt(item.qty)||parseInt(item.quantity)||1);
      productMap[key].sales+=(parseInt(item.qty)||parseInt(item.quantity)||1);
    });
  });
  const top=Object.values(productMap).sort((a,b)=>b.revenue-a.revenue).slice(0,8);
  if(!top.length){el.innerHTML='<div class="empty"><div class="empty-icon">📦</div><p>Hələ satış yoxdur</p></div>';return;}
  el.innerHTML=top.map((p,i)=>`<div class="top-product-item"><div class="top-product-rank ${i===0?'gold-rank':''}">${i+1}</div><div class="top-product-img">${p.img?`<img src="${escAttr(p.img)}" alt="" loading="lazy">`:'🛍️'}</div><div class="top-product-info"><div class="top-product-name">${escHtml(p.name)}</div><div class="top-product-store">${escHtml(p.store)}</div></div><div class="top-product-right"><div class="top-product-revenue">${p.revenue.toFixed(0)} ₼</div><div class="top-product-sales">${p.sales} satış</div></div></div>`).join('');
}

function renderActivityFeed(allOrders,allUsers,allListings) {
  const el=document.getElementById('activityFeed'); if(!el) return;
  function toDate(val){if(!val)return null;if(val.toDate)return val.toDate();if(val.seconds)return new Date(val.seconds*1000);const d=new Date(val);return isNaN(d.getTime())?null:d;}
  const events=[];
  allOrders.filter(o=>toDate(o.createdAt)).sort((a,b)=>toDate(b.createdAt)-toDate(a.createdAt)).slice(0,8)
    .forEach(o=>events.push({type:'order',ts:toDate(o.createdAt),text:`Yeni sifariş — ${(parseFloat(o.total)||0).toFixed(2)} ₼`,sub:o.buyerEmail||o.customerEmail||''}));
  allUsers.filter(u=>toDate(u.createdAt)).sort((a,b)=>toDate(b.createdAt)-toDate(a.createdAt)).slice(0,5)
    .forEach(u=>events.push({type:'user',ts:toDate(u.createdAt),text:'Yeni qeydiyyat',sub:u.email||''}));
  allListings.filter(l=>toDate(l.createdAt)).sort((a,b)=>toDate(b.createdAt)-toDate(a.createdAt)).slice(0,4)
    .forEach(l=>events.push({type:'listing',ts:toDate(l.createdAt),text:'Yeni elan əlavə edildi',sub:l.name||l.title||''}));
  events.sort((a,b)=>(b.ts||0)-(a.ts||0));
  const recent=events.slice(0,14);
  if(!recent.length){el.innerHTML='<div class="empty"><div class="empty-icon">💤</div><p>Aktivlik yoxdur</p></div>';return;}
  el.innerHTML=recent.map(ev=>`<div class="activity-item"><div class="activity-dot ${ev.type}"></div><div class="activity-text"><span style="font-weight:500;">${escHtml(ev.text)}</span>${ev.sub?`<br><span style="color:var(--muted);font-size:0.75rem;">${escHtml(ev.sub)}</span>`:''}</div><div class="activity-time">${formatTimeAgo(ev.ts)}</div></div>`).join('');
}

function formatTimeAgo(date) {
  if(!date) return '';
  const diff=(Date.now()-date.getTime())/1000;
  if(diff<60) return 'indi';
  if(diff<3600) return Math.floor(diff/60)+' dəq';
  if(diff<86400) return Math.floor(diff/3600)+' saat';
  if(diff<604800) return Math.floor(diff/86400)+' gün əvvəl';
  return date.toLocaleDateString('az-AZ',{day:'numeric',month:'short'});
}

function renderVendorPerformance(allOrders) {
  const el=document.getElementById('vendorPerformance'); if(!el) return;
  const vMap={};
  allOrders.forEach(o=>{
    const vid=o.vendorId||o.sellerId||o.storeId||'unknown';
    const vname=o.vendorName||o.storeName||o.sellerName||'Mağaza';
    if(!vMap[vid]) vMap[vid]={name:vname,revenue:0,orders:0,photo:o.vendorPhoto||o.storePhoto||''};
    vMap[vid].revenue+=(parseFloat(o.total)||0);vMap[vid].orders+=1;
  });
  const sorted=Object.values(vMap).sort((a,b)=>b.revenue-a.revenue).slice(0,6);
  const maxRev=sorted[0]?.revenue||1;
  if(!sorted.length){el.innerHTML='<div class="empty"><div class="empty-icon">🏪</div><p>Hələ satış məlumatı yoxdur</p></div>';return;}
  el.innerHTML=sorted.map(v=>{
    const pct=Math.round((v.revenue/maxRev)*100);
    const initial=(v.name[0]||'M').toUpperCase();
    const avatarHtml=v.photo?`<img src="${escAttr(v.photo)}" alt="">`:initial;
    return`<div class="vendor-performance-item"><div class="vp-avatar">${avatarHtml}</div><div class="vp-info"><div class="vp-name">${escHtml(v.name)}</div><div class="vp-bar-wrap"><div class="vp-bar-bg"><div class="vp-bar" style="width:${pct}%"></div></div><span class="vp-pct">${pct}%</span></div></div><div class="vp-revenue">${v.revenue.toFixed(0)} ₼<br><span style="font-size:0.68rem;color:var(--muted);font-weight:400;">${v.orders} sif.</span></div></div>`;
  }).join('');
}

function renderUserRoleChart(users) {
  const canvas=document.getElementById('userRoleChart'); if(!canvas) return;
  if(userRoleChartRef){userRoleChartRef.destroy();userRoleChartRef=null;}
  const roles={customer:0,vendor:0,admin:0,blocked:0};
  users.forEach(u=>{if(u.blocked)roles.blocked++;else{const r=u.role||'customer';roles[r]=(roles[r]||0)+1;}});
  const labels=['Müştəri','Satıcı','Admin','Blok'],values=[roles.customer,roles.vendor,roles.admin,roles.blocked];
  const colors=['#1a1a1a','#27ae60','#b8964e','#c0392b'];
  userRoleChartRef=new Chart(canvas.getContext('2d'),{type:'doughnut',data:{labels,datasets:[{data:values,backgroundColor:colors,borderWidth:0,hoverOffset:4}]},options:{responsive:true,maintainAspectRatio:true,plugins:{legend:{display:false}},cutout:'68%'}});
  const legend=document.getElementById('userRoleLegend');
  if(legend) legend.innerHTML=labels.map((l,i)=>`<div style="display:flex;align-items:center;gap:0.3rem;font-size:0.78rem;"><span style="width:10px;height:10px;border-radius:50%;background:${colors[i]};display:inline-block;flex-shrink:0;"></span><span>${l}: <strong>${values[i]}</strong></span></div>`).join('');
}

/* ════════════════════════════════════════
   NAVİQASİYA
════════════════════════════════════════ */
const NAV_META = {
  users:     ['İstifadəçi İdarəetməsi', 'Hesabları idarə et, rolları dəyiş'],
  listings:  ['Məhsul Moderasiyası',    'Bütün mağazaların elanları'],
  platform:  ['Platforma Ayarları',     'Sayt konfiqurasiyası və kateqoriyalar'],
  analytics: ['Analitika & Statistika', 'Satış və istifadəçi göstəriciləri'],
};

document.querySelectorAll('.nav-btn[data-sec]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    btn.classList.add('active');
    const sec = btn.dataset.sec;
    document.getElementById('sec-' + sec).classList.add('active');
    const [title, sub] = NAV_META[sec] || ['', ''];
    document.getElementById('topbarTitle').textContent = title;
    document.getElementById('topbarSub').textContent   = sub;
    if (sec === 'platform')  loadPlatformSettings();
    if (sec === 'analytics') { analyticsLoaded = false; loadAnalytics(currentPeriod); }
  });
});

/* ════════════════════════════════════════
   YARDIMÇI FUNKSİYALAR
════════════════════════════════════════ */
function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('open');
}

document.querySelectorAll('.modal-overlay').forEach(m => {
  m.addEventListener('click', e => { if (e.target === m) m.classList.remove('open'); });
});

let toastTimer = null;
function showToast(msg, type = 'success') {
  const el = document.getElementById('toast');
  if (!el) return;
  clearTimeout(toastTimer);
  el.textContent = msg;
  el.className = `toast show t-${type}`;
  toastTimer = setTimeout(() => { el.className = 'toast'; }, 3200);
}

function escHtml(str) {
  return String(str ?? '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
function escAttr(str) {
  return String(str ?? '').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

/* Enter tuşları */
document.getElementById('userSearchInput')?.addEventListener('keydown',    e => { if(e.key==='Enter') searchUsers(); });
document.getElementById('listingSearchInput')?.addEventListener('keydown', e => { if(e.key==='Enter') searchListings(); });
document.getElementById('newCommissionName')?.addEventListener('keydown',  e => { if(e.key==='Enter') confirmAddCommission(); });
