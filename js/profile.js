/* ══════════════════════════════════════════
   PROFILE.JS — profile.html üçün skriptlər
   ══════════════════════════════════════════ */

/* ══════════════════════════════
   GLOBAL STATE
   ══════════════════════════════ */
let currentUser       = null;
let _profileAddresses = [];

/* ══════════════════════════════
   ÜNVAN MODAL — Leaflet xəritə ilə
   ══════════════════════════════ */
let _addrMap        = null;
let _addrMarker     = null;
let _addrGeoResult  = null;
let _editingDocId   = null;

function openAddrModal(editDocId = null) {
  _editingDocId  = editDocId;
  _addrGeoResult = null;

  const modal   = document.getElementById('addrModal');
  const titleEl = document.getElementById('addrModalTitle');
  const saveBtn = document.getElementById('addrSaveBtn');

  document.getElementById('addrBuilding').value    = '';
  document.getElementById('addrApartment').value   = '';
  document.getElementById('addrNote').value        = '';
  document.getElementById('addrIsDefault').checked = false;
  document.getElementById('addrPickerText').textContent = 'Xəritəyə klikləyin — ünvan avtomatik doldurulacaq';
  saveBtn.disabled = true;

  if (editDocId) {
    titleEl.textContent = 'Ünvanı redaktə et';
    const existing = _profileAddresses.find(a => a._docId === editDocId);
    if (existing) {
      document.getElementById('addrBuilding').value   = existing.building  || '';
      document.getElementById('addrApartment').value  = existing.apartment || '';
      document.getElementById('addrNote').value       = existing.note      || '';
      document.getElementById('addrIsDefault').checked = existing.isDefault || false;
      if (existing.label) {
        document.getElementById('addrPickerText').textContent = existing.label;
        _addrGeoResult = { lat: existing.lat || null, lng: existing.lng || null, label: existing.label };
      }
      saveBtn.disabled = false;
    }
  } else {
    titleEl.textContent = 'Yeni ünvan əlavə et';
  }

  modal.classList.add('open');
  modal.onclick = e => { if (e.target === modal) closeAddrModal(); };

  _loadAddrLeaflet(() => {
    setTimeout(() => _initAddrMap(editDocId), 100);
  });
}

function closeAddrModal() {
  document.getElementById('addrModal').classList.remove('open');
  if (_addrMap) { _addrMap.remove(); _addrMap = null; }
  _addrMarker    = null;
  _addrGeoResult = null;
  _editingDocId  = null;
}

function _loadAddrLeaflet(cb) {
  if (window.L) { cb(); return; }
  const link = document.createElement('link');
  link.rel  = 'stylesheet';
  link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
  document.head.appendChild(link);
  const script = document.createElement('script');
  script.src    = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
  script.onload = cb;
  document.head.appendChild(script);
}

function _initAddrMap(editDocId) {
  const mapEl = document.getElementById('addrPickerMap');
  if (!mapEl || !window.L) return;
  if (_addrMap) { _addrMap.remove(); _addrMap = null; _addrMarker = null; }

  let startView = [40.4093, 49.8671];
  let startZoom = 13;

  if (editDocId) {
    const existing = _profileAddresses.find(a => a._docId === editDocId);
    if (existing && existing.lat && existing.lng) {
      startView = [existing.lat, existing.lng];
      startZoom = 16;
    }
  }

  _addrMap = L.map('addrPickerMap').setView(startView, startZoom);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap'
  }).addTo(_addrMap);

  if (editDocId) {
    const existing = _profileAddresses.find(a => a._docId === editDocId);
    if (existing && existing.lat && existing.lng) {
      _addrMarker = L.marker([existing.lat, existing.lng], { draggable: true }).addTo(_addrMap);
      _addrMarker.on('dragend', async () => {
        const pos = _addrMarker.getLatLng();
        await _addrReverseGeocode(pos.lat, pos.lng);
      });
    }
  }

  _addrMap.on('click', async (e) => {
    const { lat, lng } = e.latlng;
    if (_addrMarker) {
      _addrMarker.setLatLng([lat, lng]);
    } else {
      _addrMarker = L.marker([lat, lng], { draggable: true }).addTo(_addrMap);
      _addrMarker.on('dragend', async () => {
        const pos = _addrMarker.getLatLng();
        await _addrReverseGeocode(pos.lat, pos.lng);
      });
    }
    await _addrReverseGeocode(lat, lng);
  });

  setTimeout(() => _addrMap.invalidateSize(), 200);
}

async function _addrReverseGeocode(lat, lng) {
  const textEl = document.getElementById('addrPickerText');
  if (textEl) textEl.textContent = 'Ünvan axtarılır...';
  try {
    const res  = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=az`);
    const data = await res.json();
    const label = data.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    _addrGeoResult = { lat, lng, label };
    if (textEl) textEl.textContent = label;
  } catch {
    _addrGeoResult = { lat, lng, label: `${lat.toFixed(5)}, ${lng.toFixed(5)}` };
    if (textEl) textEl.textContent = _addrGeoResult.label;
  }
  _checkAddrSaveReady();
}

function _checkAddrSaveReady() {
  const building  = (document.getElementById('addrBuilding')?.value  || '').trim();
  const apartment = (document.getElementById('addrApartment')?.value || '').trim();
  const hasMap    = _addrGeoResult && (_addrGeoResult.lat || _editingDocId);
  const btn       = document.getElementById('addrSaveBtn');
  if (btn) btn.disabled = !(hasMap && building && apartment);
}

document.addEventListener('input', e => {
  if (['addrBuilding','addrApartment','addrNote'].includes(e.target.id)) {
    _checkAddrSaveReady();
  }
});

async function saveAddress() {
  if (!currentUser) return;
  const btn = document.getElementById('addrSaveBtn');
  if (btn) { btn.disabled = true; btn.textContent = 'Saxlanır...'; }

  try {
    const building  = document.getElementById('addrBuilding').value.trim();
    const apartment = document.getElementById('addrApartment').value.trim();
    const note      = document.getElementById('addrNote').value.trim();
    const isDefault = document.getElementById('addrIsDefault').checked;

    if (isDefault) {
      const batch = fbDb.batch();
      _profileAddresses.forEach(a => {
        if (a.isDefault && a._docId !== _editingDocId) {
          batch.update(fbDb.collection('addresses').doc(a._docId), { isDefault: false });
        }
      });
      await batch.commit();
    }

    const addrData = {
      userId:    currentUser.uid,
      label:     _addrGeoResult ? _addrGeoResult.label : (_profileAddresses.find(a => a._docId === _editingDocId)?.label || ''),
      lat:       _addrGeoResult ? _addrGeoResult.lat   : (_profileAddresses.find(a => a._docId === _editingDocId)?.lat   || null),
      lng:       _addrGeoResult ? _addrGeoResult.lng   : (_profileAddresses.find(a => a._docId === _editingDocId)?.lng   || null),
      building,
      apartment,
      note,
      isDefault,
    };

    if (_editingDocId) {
      await fbDb.collection('addresses').doc(_editingDocId).update({
        ...addrData,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      showToast('Ünvan yeniləndi ✓');
    } else {
      addrData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
      if (_profileAddresses.length === 0) addrData.isDefault = true;
      await fbDb.collection('addresses').add(addrData);
      showToast('Ünvan əlavə edildi ✓');
    }

    closeAddrModal();
    await loadAddresses(currentUser.uid);
  } catch(err) {
    showToast('Xəta: ' + err.message);
    if (btn) { btn.disabled = false; btn.textContent = 'Ünvanı Saxla'; }
  }
}

/* ══════════════════════════════
   AUTH STATE
   ══════════════════════════════ */
fbAuth.onAuthStateChanged(async (user) => {
  if (!user) { window.location.href = 'index.html'; return; }
  currentUser = user;

  try {
    const userDoc = await fbDb.collection('users').doc(user.uid).get();
    if (userDoc.exists && userDoc.data().role === 'admin') {
      const adminSection = document.getElementById('adminMenuSection');
      if (adminSection) adminSection.style.display = '';
    }

    await loadUserData(user);
    await loadOrders(user.uid);
    await loadWishlist(user.uid);
    await loadAddresses(user.uid);
    await updateVendorMenuBadge(user.uid);
  } catch (err) {
    console.warn('Profil yüklənmə xətası:', err.message);
  }

  document.getElementById('loadingOverlay').style.display = 'none';
  applyLang();
});

/* ══════════════════════════════
   DİL
   ══════════════════════════════ */
function handleLangChange(lang) {
  setLang(lang);
  if (currentUser) {
    fbDb.collection('users').doc(currentUser.uid).set({ lang }, { merge: true });
  }
}

/* ══════════════════════════════
   VENDOR BADGE
   ══════════════════════════════ */
async function updateVendorMenuBadge(uid) {
  const data  = await vendor.getStatus(uid);
  const badge = document.getElementById('vendorMenuBadge');
  if (!badge) return;
  if (!data) {
    badge.textContent = t('vendor.new'); badge.className = 'vendor-menu-badge new';
  } else if (data.status === 'pending') {
    badge.textContent = t('vendor.pending'); badge.className = 'vendor-menu-badge pending';
  } else if (data.status === 'approved') {
    badge.textContent = t('vendor.active'); badge.className = 'vendor-menu-badge approved';
    const listingsItem = document.getElementById('listingsMenuItem');
    if (listingsItem) listingsItem.style.display = '';
    const mobListingsItem = document.getElementById('mobListingsItem');
    if (mobListingsItem) mobListingsItem.style.display = '';
  } else if (data.status === 'rejected') {
    badge.textContent = t('vendor.rejected'); badge.className = 'vendor-menu-badge pending';
  }
}

/* ══════════════════════════════
   İSTİFADƏÇİ MƏLUMATLAR
   ══════════════════════════════ */
async function loadUserData(user) {
  const doc  = await fbDb.collection('users').doc(user.uid).get();
  const data = doc.exists ? doc.data() : {};

  if (data.lang && ['az','ru','en'].includes(data.lang)) {
    localStorage.setItem('sitelang', data.lang);
  }

  const first    = data.firstName || '';
  const last     = data.lastName  || '';
  const fullName = (first + ' ' + last).trim() || user.displayName || 'İstifadəçi';
  const initials = ((first[0]||'') + (last[0]||'')).toUpperCase() || '?';

  const avatarEl = document.getElementById('avatarInitials');
  const photoURL = data.photoURL || user.photoURL || '';
  if (photoURL) {
    avatarEl.innerHTML = `<img src="${photoURL}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
  } else {
    avatarEl.textContent = initials;
  }
  document.getElementById('sidebarName').textContent  = fullName;
  document.getElementById('sidebarEmail').textContent = user.email || '';
  document.getElementById('welcomeName').textContent  = first || fullName;
  document.getElementById('firstName').value  = first;
  document.getElementById('lastName').value   = last;
  document.getElementById('emailField').value = user.email || '';
  document.getElementById('phoneField').value = data.phone || '';
  document.getElementById('dobField').value   = data.dob   || '';

  const gSel = document.getElementById('genderField');
  [...gSel.options].forEach(o => { o.selected = o.value === (data.gender || 'Qadın'); });
  document.getElementById('noteField').value = data.note || '';
  applyLang();
}

/* ══════════════════════════════
   PROFİL SAXLA
   ══════════════════════════════ */
async function saveProfile() {
  if (!currentUser) return;
  const first = document.getElementById('firstName').value.trim();
  const last  = document.getElementById('lastName').value.trim();
  const lang  = document.getElementById('langField').value;
  try {
    await fbDb.collection('users').doc(currentUser.uid).set({
      firstName: first, lastName: last,
      phone:  document.getElementById('phoneField').value.trim(),
      dob:    document.getElementById('dobField').value,
      gender: document.getElementById('genderField').value,
      note:   document.getElementById('noteField').value.trim(),
      lang,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    const full = (first + ' ' + last).trim();
    document.getElementById('sidebarName').textContent    = full || 'İstifadəçi';
    document.getElementById('welcomeName').textContent    = first || full;
    document.getElementById('avatarInitials').textContent = ((first[0]||'') + (last[0]||'')).toUpperCase() || '?';
    setLang(lang);
    showToast(t('p.saved'));
  } catch (err) { showToast('Xəta: ' + err.message); }
}

/* ══════════════════════════════
   ŞİFRƏ DƏYİŞ
   ══════════════════════════════ */
async function changePassword() {
  const current = document.getElementById('currentPass').value;
  const newPass = document.getElementById('newPass').value;
  const confirm = document.getElementById('confirmPass').value;
  if (!current || !newPass || !confirm) { showToast(t('p.fillAll')); return; }
  if (newPass !== confirm) { showToast(t('p.passNoMatch')); return; }
  if (newPass.length < 6)  { showToast(t('p.passShort')); return; }
  try {
    const cred = firebase.auth.EmailAuthProvider.credential(currentUser.email, current);
    await currentUser.reauthenticateWithCredential(cred);
    await currentUser.updatePassword(newPass);
    ['currentPass','newPass','confirmPass'].forEach(id => document.getElementById(id).value = '');
    showToast(t('p.passSaved'));
  } catch (err) {
    showToast('Xəta: ' + (err.code === 'auth/wrong-password' ? t('p.passWrong') : err.message));
  }
}

/* ══════════════════════════════
   SİFARİŞLƏR
   ══════════════════════════════ */
let _allOrders = [];   // bütün sifarişlər cache
let _activeOrderFilter = 'all';

const STATUS_CONFIG = {
  pending:   { lbl: 'Gözlənilir',   cls: 'badge-pending',  az: 'pending'   },
  preparing: { lbl: 'Hazırlanır',   cls: 'badge-pending',  az: 'preparing' },
  shipped:   { lbl: 'Yolda',        cls: 'badge-shipped',  az: 'shipped'   },
  delivered: { lbl: 'Çatdırıldı',   cls: 'badge-success',  az: 'delivered' },
  cancelled: { lbl: 'Ləğv edildi',  cls: 'badge-pending',  az: 'cancelled' },
};

function _fmtDate(ts) {
  if (!ts) return '—';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('az-AZ', { day: 'numeric', month: 'long', year: 'numeric' });
}

async function loadOrders(uid) {
  try {
    const snap = await fbDb.collection('orders')
      .where('buyerId', '==', uid)
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get();

    _allOrders = snap.docs.map(doc => ({ _id: doc.id, ...doc.data() }));

    const statOrdersEl = document.getElementById('statOrders');
    const statSpentEl  = document.getElementById('statSpent');
    if (statOrdersEl) statOrdersEl.textContent = _allOrders.length;
    if (statSpentEl) {
      const total = _allOrders.reduce((s, o) => s + (o.total || 0), 0);
      statSpentEl.textContent = total.toFixed(0) + ' ₼';
    }

    // Son sifarişlər (icmal tab-ı üçün)
    const recentOrdEl = document.getElementById('recentOrders');
    if (recentOrdEl) {
      const recent = _allOrders.filter(o => o.status !== 'delivered').slice(0, 3);
      if (recent.length === 0) {
        recentOrdEl.innerHTML = `<p style="color:var(--muted);font-size:.875rem;">${t('p.noOrders')}</p>`;
      } else {
        recentOrdEl.innerHTML = recent.map(o => _buildOrderCard(o)).join('');
      }
    }

    filterOrders(_activeOrderFilter);
  } catch (err) {
    console.warn('Sifarişlər yüklənmədi:', err.message);
    const el = document.getElementById('allOrders');
    if (el) el.innerHTML = `<p style="color:var(--muted);font-size:.875rem;">${t('p.noOrders')}</p>`;
  }
}

function filterOrders(filter, btnEl) {
  _activeOrderFilter = filter;

  // düymə aktiv stili
  document.querySelectorAll('.ord-filter-btn').forEach(b => b.classList.remove('active'));
  const activeBtn = btnEl || document.querySelector(`.ord-filter-btn[data-filter="${filter}"]`);
  if (activeBtn) activeBtn.classList.add('active');

  const active    = _allOrders.filter(o => o.status !== 'delivered' && o.status !== 'cancelled');
  const cancelled = _allOrders.filter(o => o.status === 'cancelled');
  const previous  = _allOrders.filter(o => o.status === 'delivered');

  let filtered;
  if (filter === 'all') {
    filtered = active;
  } else if (filter === 'cancelled') {
    filtered = cancelled;
  } else {
    filtered = active.filter(o => o.status === filter);
  }

  const el = document.getElementById('allOrders');
  if (!el) return;

  if (filtered.length === 0) {
    el.innerHTML = `<p style="color:var(--muted);font-size:.875rem;padding:1rem 0;">${t('p.noOrders')}</p>`;
  } else {
    el.innerHTML = filtered.map(o => _buildOrderCard(o)).join('');
  }

  // Öncəki sifarişlər düyməsi
  const prevRow = document.getElementById('prevOrdersRow');
  const prevCount = document.getElementById('prevOrdersCount');
  if (prevRow) prevRow.style.display = previous.length > 0 ? '' : 'none';
  if (prevCount) prevCount.textContent = previous.length;
}

function _buildOrderCard(o) {
  const st = STATUS_CONFIG[o.status] || { lbl: o.status || '—', cls: 'badge-pending' };
  const date = _fmtDate(o.createdAt);
  const itemNames = (o.items || []).map(i => i.name).join(', ');
  const shortName = itemNames.length > 55 ? itemNames.substring(0, 55) + '…' : (itemNames || 'Sifariş');
  const firstImg  = (o.items || [])[0]?.img || '';
  const imgHTML   = firstImg
    ? `<img src="${firstImg}" alt="" style="width:100%;height:100%;object-fit:cover;">`
    : '🛍️';
  const orderNum = o.orderNumber ? `#${o.orderNumber}` : `#${o._id.slice(-5).toUpperCase()}`;

  return `
    <div class="order-item" onclick="openOrderDetail('${o._id}')">
      <div class="order-img">${imgHTML}</div>
      <div class="order-info" style="flex:1;min-width:0;">
        <div class="order-name">${shortName}</div>
        <div class="order-meta">
          <span style="font-family:monospace;font-weight:600;">${orderNum}</span> · ${date}
        </div>
      </div>
      <div class="order-right" style="flex-shrink:0;text-align:right;">
        <div class="order-price">${(o.total || 0).toFixed(2)} ₼</div>
        <div class="badge ${st.cls}" style="margin-top:4px;">${st.lbl}</div>
      </div>
    </div>`;
}

/* ── Öncəki Sifarişlər Popup ── */
function openPrevOrdersPopup() {
  const modal = document.getElementById('prevOrdersModal');
  if (!modal) return;
  const listEl = document.getElementById('prevOrdersList');
  const prev = _allOrders.filter(o => o.status === 'delivered');
  listEl.innerHTML = prev.length
    ? prev.map(o => _buildOrderCard(o)).join('')
    : `<p style="color:var(--muted);font-size:.875rem;">${t('p.noOrders')}</p>`;
  modal.classList.add('open');
  modal.addEventListener('click', _prevModalBg);
}
function _prevModalBg(e) {
  if (e.target === document.getElementById('prevOrdersModal')) closePrevOrdersPopup();
}
function closePrevOrdersPopup() {
  const modal = document.getElementById('prevOrdersModal');
  if (modal) { modal.classList.remove('open'); modal.removeEventListener('click', _prevModalBg); }
}

/* ── Sifariş Detay Popup ── */
async function openOrderDetail(orderId) {
  const o = _allOrders.find(x => x._id === orderId);
  if (!o) return;

  const modal = document.getElementById('orderDetailModal');
  const body  = document.getElementById('orderDetailBody');
  const title = document.getElementById('orderDetailTitle');
  if (!modal || !body) return;

  const st = STATUS_CONFIG[o.status] || { lbl: o.status || '—', cls: 'badge-pending' };
  const orderNum = o.orderNumber ? `#${o.orderNumber}` : `#${o._id.slice(-5).toUpperCase()}`;
  if (title) title.textContent = `Sifariş ${orderNum}`;

  // ── Vizual Status Tracker ──
  const STEPS = [
    { key: 'placed',    lbl: 'Sifariş\nVerildi'  },
    { key: 'preparing', lbl: 'Hazır-\nlanır'     },
    { key: 'shipped',   lbl: 'Yolda'             },
    { key: 'delivered', lbl: 'Çatdırıldı'        },
  ];
  const isCancelled = o.status === 'cancelled';
  const stepDone = (key) => {
    if (key === 'placed') return !!o.createdAt;
    if (isCancelled) return false;
    return { preparing:['preparing','shipped','delivered'], shipped:['shipped','delivered'], delivered:['delivered'] }[key]?.includes(o.status) || false;
  };
  const stepCurrent = (key) => {
    if (isCancelled || key === 'placed') return false;
    const map = { preparing:'preparing', shipped:'shipped', delivered:'delivered' };
    return map[key] === o.status;
  };

  const trackerHTML = isCancelled
    ? `<div style="display:flex;align-items:center;gap:0.5rem;padding:0.85rem 1rem;background:rgba(231,76,60,.08);border:1px solid rgba(231,76,60,.2);border-radius:10px;color:#e74c3c;font-size:0.85rem;font-weight:500;">
        <span>❌</span> Bu sifariş ləğv edilib ${o.cancelledAt ? '· ' + _fmtDate(o.cancelledAt) : ''}
       </div>`
    : `<div class="ord-tracker">
        ${STEPS.map((step, i) => `
          <div class="ord-tracker-step${stepDone(step.key) ? ' done' : ''}${stepCurrent(step.key) ? ' current' : ''}">
            <div class="ord-tracker-icon">${stepDone(step.key) ? '✓' : (i+1)}</div>
            <div class="ord-tracker-lbl">${step.lbl.replace('\n','<br>')}</div>
          </div>
          ${i < STEPS.length - 1 ? `<div class="ord-tracker-line${stepDone(STEPS[i+1].key) ? ' done' : ''}"></div>` : ''}
        `).join('')}
      </div>`;

  // Tarix/status cədvəli
  const timeline = [];
  if (o.createdAt)   timeline.push({ lbl: 'Sifariş verildi',         date: _fmtDate(o.createdAt)   });
  if (o.preparedAt)  timeline.push({ lbl: 'Hazırlanmağa başladı',     date: _fmtDate(o.preparedAt)  });
  if (o.shippedAt)   timeline.push({ lbl: 'Yola çıxdı',               date: _fmtDate(o.shippedAt)   });
  if (o.deliveredAt) timeline.push({ lbl: 'Çatdırıldı',               date: _fmtDate(o.deliveredAt) });
  if (o.cancelledAt) timeline.push({ lbl: 'Ləğv edildi',              date: _fmtDate(o.cancelledAt) });

  // Məhsul detayları
  const items = o.items || [];
  const itemsHTML = items.map(item => {
    const img = item.img || item.image || '';
    const details = [];
    if (item.size)  details.push(`Ölçü: <strong>${item.size}</strong>`);
    if (item.color) details.push(`Rəng: <strong>${item.color}</strong>`);
    return `
      <div style="display:flex;gap:0.75rem;align-items:flex-start;padding:0.6rem 0;border-bottom:1px solid var(--border);">
        <div style="width:52px;height:52px;border-radius:8px;overflow:hidden;flex-shrink:0;background:var(--tag-bg);display:flex;align-items:center;justify-content:center;font-size:1.2rem;">
          ${img ? `<img src="${img}" style="width:100%;height:100%;object-fit:cover;">` : '🛍️'}
        </div>
        <div style="flex:1;min-width:0;">
          <div style="font-size:0.875rem;font-weight:500;line-height:1.3;">${item.name || '—'}</div>
          ${details.length ? `<div style="font-size:0.78rem;color:var(--muted);margin-top:3px;">${details.join(' &nbsp;·&nbsp; ')}</div>` : ''}
          <div style="font-size:0.82rem;margin-top:2px;">${(item.price || 0).toFixed(2)} ₼${item.qty > 1 ? ` × ${item.qty}` : ''}</div>
        </div>
      </div>`;
  }).join('');

  // Mağaza keçid buttonu
  let storeHTML = '';
  try {
    const vendorId = o.vendorId || (items[0] && items[0].vendorId) || '';
    if (vendorId) {
      const vSnap = await fbDb.collection('vendors').doc(vendorId).get();
      const vData = vSnap.exists ? vSnap.data() : {};
      const storeName = vData.storeName || 'Mağaza';
      const storeLogo = vData.logoURL || vData.logo || '';
      const storeUrl  = `store.html?uid=${vendorId}`;
      storeHTML = `
        <a href="${storeUrl}" class="ord-store-btn" target="_blank">
          <div class="ord-store-logo">
            ${storeLogo ? `<img src="${storeLogo}" alt="${storeName}">` : '🏪'}
          </div>
          <span>${storeName}</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-left:auto;"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
        </a>`;
    }
  } catch(e) {}

  // Çatdırılma ünvanı
  const addr = o.address;
  let addrText = '';
  if (addr) {
    const parts = [];
    if (addr.label)     parts.push(addr.label);
    if (addr.building)  parts.push(`Bina: ${addr.building}`);
    if (addr.apartment) parts.push(`Mənzil: ${addr.apartment}`);
    addrText = parts.join(', ');
  }

  const canCancel = ['pending', 'preparing'].includes(o.status);
  const cancelHTML = canCancel
    ? `<button class="ord-cancel-btn" onclick="openCancelModal('${o._id}')">Sifarişi Ləğv Et</button>`
    : '';

  body.innerHTML = `
    <div class="ord-detail-section">
      <div class="ord-detail-label">Sifariş Durumu</div>
      ${trackerHTML}
    </div>

    <div class="ord-detail-section">
      <div class="ord-detail-label">Məhsullar</div>
      ${itemsHTML || '<div style="color:var(--muted);font-size:.875rem;">Məhsul tapılmadı</div>'}
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1.25rem;">
      <div>
        <div class="ord-detail-label">Sifariş tarixi</div>
        <div class="ord-detail-value">${_fmtDate(o.createdAt)}</div>
      </div>
      <div>
        <div class="ord-detail-label">Status</div>
        <div><span class="badge ${st.cls}">${st.lbl}</span></div>
      </div>
      <div>
        <div class="ord-detail-label">Ümumi məbləğ</div>
        <div class="ord-detail-value" style="font-weight:600;">${(o.total || 0).toFixed(2)} ₼</div>
      </div>
      ${addrText ? `<div>
        <div class="ord-detail-label">Çatdırılma ünvanı</div>
        <div class="ord-detail-value" style="font-size:0.82rem;">📍 ${addrText}</div>
      </div>` : ''}
    </div>

    ${timeline.length ? `
    <div class="ord-detail-section">
      <div class="ord-detail-label">Tarix Cədvəli</div>
      <div class="ord-timeline">
        ${timeline.map(tl => `
          <div class="ord-timeline-item">
            <div class="ord-timeline-dot"></div>
            <span style="color:var(--muted);min-width:110px;font-size:0.78rem;">${tl.date}</span>
            <span>${tl.lbl}</span>
          </div>`).join('')}
      </div>
    </div>` : ''}

    ${storeHTML ? `
    <div class="ord-detail-section">
      <div class="ord-detail-label">Mağaza</div>
      ${storeHTML}
    </div>` : ''}

    ${cancelHTML}
  `;

  modal.classList.add('open');
  modal.addEventListener('click', _detailModalBg);
}

function _detailModalBg(e) {
  if (e.target === document.getElementById('orderDetailModal')) closeOrderDetail();
}
function closeOrderDetail() {
  const modal = document.getElementById('orderDetailModal');
  if (modal) { modal.classList.remove('open'); modal.removeEventListener('click', _detailModalBg); }
}

/* ══════════════════════════════
   LƏĞVETMƏ POPUP
   ══════════════════════════════ */
let _cancelOrderId = null;

function openCancelModal(orderId) {
  _cancelOrderId = orderId;
  const o = _allOrders.find(x => x._id === orderId);
  if (!o) return;

  const modal = document.getElementById('cancelOrderModal');
  if (!modal) return;

  const items = o.items || [];

  const itemListHTML = items.length > 1
    ? `<div class="ord-detail-label" style="margin-top:1.25rem;margin-bottom:0.4rem;">Ləğv ediləcək məhsulları seçin</div>
       <div style="font-size:0.78rem;color:var(--muted);margin-bottom:0.75rem;">Seçilməyən məhsullar sifarişdə qalmaqda davam edəcək</div>
       <div style="display:flex;flex-direction:column;gap:0.5rem;">
         ${items.map((item, i) => {
           const img = item.img || item.image || '';
           return `<label style="display:flex;align-items:center;gap:0.75rem;padding:0.6rem 0.75rem;border:1.5px solid var(--border);border-radius:10px;cursor:pointer;transition:border-color .18s;" id="ci_lbl_${i}">
             <input type="checkbox" id="ci_${i}" value="${i}" style="width:16px;height:16px;accent-color:var(--accent);cursor:pointer;flex-shrink:0;"
               onchange="document.getElementById('ci_lbl_${i}').style.borderColor=this.checked?'var(--accent)':'var(--border)'">
             <div style="width:40px;height:40px;border-radius:8px;overflow:hidden;flex-shrink:0;background:var(--tag-bg);display:flex;align-items:center;justify-content:center;font-size:1rem;">
               ${img ? `<img src="${img}" style="width:100%;height:100%;object-fit:cover;">` : '🛍️'}
             </div>
             <div style="flex:1;min-width:0;">
               <div style="font-size:0.84rem;font-weight:500;line-height:1.3;">${item.name || '—'}</div>
               <div style="font-size:0.78rem;color:var(--muted);">${(item.price || 0).toFixed(2)} ₼</div>
             </div>
           </label>`;
         }).join('')}
       </div>`
    : '';

  document.getElementById('cancelItemSection').innerHTML = itemListHTML;
  document.getElementById('cancelReason').value = '';
  document.getElementById('cancelAgree').checked = false;
  document.getElementById('cancelConfirmBtn').disabled = true;
  document.getElementById('cancelAgree').onchange = function() {
    document.getElementById('cancelConfirmBtn').disabled = !this.checked;
  };

  modal.classList.add('open');
  modal.addEventListener('click', _cancelModalBg);
}

function _cancelModalBg(e) {
  if (e.target === document.getElementById('cancelOrderModal')) closeCancelModal();
}
function closeCancelModal() {
  const modal = document.getElementById('cancelOrderModal');
  if (modal) { modal.classList.remove('open'); modal.removeEventListener('click', _cancelModalBg); }
  _cancelOrderId = null;
}

async function confirmCancelOrder() {
  if (!_cancelOrderId) return;
  const o = _allOrders.find(x => x._id === _cancelOrderId);
  if (!o) return;

  const btn = document.getElementById('cancelConfirmBtn');
  if (btn) { btn.disabled = true; btn.textContent = 'Göndərilir...'; }

  const reason = (document.getElementById('cancelReason')?.value || '').trim();
  const items  = o.items || [];

  let cancelledItems = [];
  let remainingItems = [];

  if (items.length > 1) {
    items.forEach((item, i) => {
      const cb = document.getElementById(`ci_${i}`);
      if (cb && cb.checked) cancelledItems.push(item);
      else remainingItems.push(item);
    });
    if (cancelledItems.length === 0) { cancelledItems = [...items]; remainingItems = []; }
  } else {
    cancelledItems = [...items];
    remainingItems = [];
  }

  try {
    if (remainingItems.length > 0) {
      const newTotal = remainingItems.reduce((s, it) => s + (it.price || 0) * (it.qty || 1), 0);
      await fbDb.collection('orders').doc(_cancelOrderId).update({
        items:          remainingItems,
        total:          newTotal,
        partialCancel:  true,
        cancelledItems: firebase.firestore.FieldValue.arrayUnion(...cancelledItems),
        cancelReason:   reason || null,
        updatedAt:      firebase.firestore.FieldValue.serverTimestamp()
      });
      showToast('Seçilmiş məhsullar ləğv edildi. Ödəniş 2-10 gün ərzində qaytarılacaq.');
    } else {
      await fbDb.collection('orders').doc(_cancelOrderId).update({
        status:              'cancelled',
        cancelReason:         reason || null,
        cancelledByCustomer:  true,
        cancelledAt:         firebase.firestore.FieldValue.serverTimestamp()
      });
      showToast('Sifariş ləğv edildi. Ödəniş 2-10 gün ərzində qaytarılacaq.');
    }
    closeCancelModal();
    closeOrderDetail();
    if (currentUser) await loadOrders(currentUser.uid);
  } catch (err) {
    showToast('Xəta: ' + err.message);
    if (btn) { btn.disabled = false; btn.textContent = 'Ləğvetməni Təsdiq Et'; }
  }
}

async function cancelOrder(orderId) { openCancelModal(orderId); }


/* ══════════════════════════════
   WİSHLİST
   ══════════════════════════════ */
async function loadWishlist(uid) {
  try {
    const snap       = await fbDb.collection('wishlists').doc(uid).get();
    const container  = document.getElementById('wishlistItems');
    const statWishEl = document.getElementById('statWishlist');
    const items = snap.exists ? (snap.data().items || []) : [];
    if (statWishEl) statWishEl.textContent = items.length;
    if (!container) return;
    if (items.length === 0) {
      container.innerHTML = `<p style="color:var(--muted);font-size:.875rem;">${t('p.noWishlist')}</p>`;
      return;
    }
    container.innerHTML = '';
    items.forEach(item => {
      container.innerHTML += `
        <div class="order-item">
          <div class="order-img">
            ${item.image || item.img ? `<img src="${item.image || item.img}" alt="${item.name || ''}" style="width:100%;height:100%;object-fit:cover;">` : '❤️'}
          </div>
          <div class="order-info">
            <div class="order-name">${item.name || '—'}</div>
            <div class="order-meta">${item.brand || ''}</div>
          </div>
          <div class="order-right">
            <div class="order-price">${(item.price || 0).toFixed(2)} ₼</div>
            <button onclick="removeFromWishlist('${item.id}', '${uid}')"
              style="background:none;border:none;color:var(--muted);font-size:0.78rem;cursor:pointer;text-decoration:underline;margin-top:4px;">Sil</button>
          </div>
        </div>`;
    });
  } catch (err) {
    const el = document.getElementById('wishlistItems');
    if (el) el.innerHTML = `<p style="color:var(--muted);font-size:.875rem;">${t('p.noWishlist')}</p>`;
  }
}

async function removeFromWishlist(itemId, uid) {
  try {
    const ref  = fbDb.collection('wishlists').doc(uid);
    const snap = await ref.get();
    if (!snap.exists) return;
    const newItems = (snap.data().items || []).filter(i => String(i.id) !== String(itemId));
    await ref.set({ items: newItems }, { merge: false });
    await loadWishlist(uid);
    showToast(t('toast.wishDel'));
  } catch (err) { console.warn('Silmə xətası:', err.message); }
}

/* ══════════════════════════════
   ÜNVANLAR — YÜKLƏ + RENDER
   ══════════════════════════════ */
async function loadAddresses(uid) {
  try {
    const snap = await fbDb.collection('addresses')
      .where('userId', '==', uid)
      .get();
    _profileAddresses = snap.docs.map(d => ({ _docId: d.id, ...d.data() }));
    _renderAddressGrid();
  } catch (err) {
    console.warn('Ünvanlar yüklənmədi:', err.message);
    _profileAddresses = [];
    _renderAddressGrid();
  }
}

function _renderAddressGrid() {
  const grid = document.getElementById('addressGrid');
  if (!grid) return;
  grid.innerHTML = '';

  _profileAddresses.forEach(addr => {
    const card = document.createElement('div');
    card.className = 'addr-card' + (addr.isDefault ? ' default' : '');

    const detailParts = [];
    if (addr.building)  detailParts.push(`Bina: ${addr.building}`);
    if (addr.apartment) detailParts.push(`Mənzil: ${addr.apartment}`);
    if (addr.note)      detailParts.push(addr.note);

    card.innerHTML = `
      ${addr.isDefault ? '<span class="addr-tag">Əsas</span>' : ''}
      <div class="addr-label">📍 ${addr.label ? (addr.label.substring(0, 60) + (addr.label.length > 60 ? '…' : '')) : 'Ünvan'}</div>
      ${detailParts.length ? `<div class="addr-detail">${detailParts.join(' · ')}</div>` : ''}
      <div class="addr-actions">
        <button class="addr-btn" onclick="openAddrModal('${addr._docId}')">Redaktə et</button>
        ${!addr.isDefault ? `<button class="addr-btn" onclick="setDefaultAddress('${addr._docId}')">Əsas et</button>` : ''}
        <button class="addr-btn danger" onclick="deleteAddress('${addr._docId}')">Sil</button>
      </div>`;
    grid.appendChild(card);
  });

  const addCard = document.createElement('div');
  addCard.className = 'add-addr-card';
  addCard.innerHTML = `
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>
    </svg>
    <span style="font-size:0.85rem;font-weight:500">Yeni ünvan əlavə et</span>`;
  addCard.onclick = () => openAddrModal(null);
  grid.appendChild(addCard);
}

async function setDefaultAddress(docId) {
  if (!currentUser) return;
  try {
    const batch = fbDb.batch();
    _profileAddresses.forEach(a => {
      batch.update(fbDb.collection('addresses').doc(a._docId), { isDefault: a._docId === docId });
    });
    await batch.commit();
    await loadAddresses(currentUser.uid);
    showToast('Əsas ünvan dəyişdirildi ✓');
  } catch(err) { showToast('Xəta: ' + err.message); }
}

async function deleteAddress(id) {
  if (!confirm('Bu ünvanı silmək istəyirsiniz?')) return;
  try {
    await fbDb.collection('addresses').doc(id).delete();
    await loadAddresses(currentUser.uid);
    showToast('Ünvan silindi');
  } catch(err) { showToast('Xəta: ' + err.message); }
}

/* ══════════════════════════════
   ÇIXIŞ
   ══════════════════════════════ */
async function logout() {
  await fbAuth.signOut();
  window.location.href = 'index.html';
}

/* ══════════════════════════════
   TAB KEÇİDİ
   ══════════════════════════════ */
function switchTab(name, el) {
  document.querySelectorAll('[id^="tab-"]').forEach(t => t.style.display = 'none');
  document.getElementById('tab-' + name).style.display = '';

  document.querySelectorAll('.menu-item').forEach(m => m.classList.remove('active'));
  const sidebarItem = document.querySelector(`.menu-item[data-tab="${name}"]`);
  if (sidebarItem) sidebarItem.classList.add('active');

  document.querySelectorAll('#mobileMenuBar .mob-item').forEach(m => m.classList.remove('active'));
  const mobItem = document.querySelector(`#mobileMenuBar .mob-item[data-tab="${name}"]`);
  if (mobItem) mobItem.classList.add('active');

  if (window.innerWidth <= 768) {
    const sidebar = document.querySelector('.sidebar');
    const mobBar  = document.getElementById('mobileMenuBar');
    if (name === 'overview') {
      if (sidebar) sidebar.classList.remove('mobile-hidden');
      if (mobBar)  mobBar.style.display = 'none';
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      if (sidebar) sidebar.classList.add('mobile-hidden');
      if (mobBar)  mobBar.style.display = 'flex';
    }
  }

  if (name === 'vendor'   && currentUser) loadVendorTab(currentUser.uid);
  if (name === 'listings' && currentUser) loadListingsTab(currentUser.uid);
  if (name === 'profile') { initAvatarUpload(); syncProfileTabAvatar(); applyLang(); }
  applyLang();
}

/* ══════════════════════════════
   PROFİL TAB FOTO YÜKLƏMƏ
   ══════════════════════════════ */
function syncProfileTabAvatar() {
  const tabAvatar  = document.getElementById('profileTabAvatar');
  const sideAvatar = document.getElementById('avatarInitials');
  if (!tabAvatar || !sideAvatar) return;
  tabAvatar.innerHTML = sideAvatar.innerHTML || sideAvatar.textContent;
}

async function uploadProfileTabPhoto(file) {
  if (!file || !currentUser) return;
  if (file.size > 5 * 1024 * 1024) {
    showToast('Şəkil 5MB-dan böyük ola bilməz');
    return;
  }
  const tabAvatar = document.getElementById('profileTabAvatar');
  if (tabAvatar) tabAvatar.style.opacity = '0.5';
  try {
    const base64 = await compressImage(file, 300, 0.75);
    await fbDb.collection('users').doc(currentUser.uid).set(
      { photoURL: base64 },
      { merge: true }
    );
    const imgHTML = `<img src="${base64}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
    if (tabAvatar) tabAvatar.innerHTML = imgHTML;
    const sideAvatar = document.getElementById('avatarInitials');
    if (sideAvatar) sideAvatar.innerHTML = imgHTML;
    showToast('Profil şəkli yeniləndi ✓');
  } catch (err) {
    showToast('Xəta: ' + err.message);
  } finally {
    if (tabAvatar) tabAvatar.style.opacity = '1';
    document.getElementById('profileTabFileInput').value = '';
  }
}

function compressImage(file, maxSize, quality) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let w = img.width, h = img.height;
        if (w > h) { if (w > maxSize) { h = h * maxSize / w; w = maxSize; } }
        else        { if (h > maxSize) { w = w * maxSize / h; h = maxSize; } }
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/* ══════════════════════════════
   TOAST
   ══════════════════════════════ */
function showToast(msg) {
  const toastEl = document.getElementById('toast');
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  setTimeout(() => toastEl.classList.remove('show'), 2800);
}

/* ══════════════════════════════
   MENU CLICK — default prevent
   ══════════════════════════════ */
document.querySelectorAll('.menu-item[data-tab]').forEach(el => {
  el.addEventListener('click', e => e.preventDefault());
});

/* ══════════════════════════════
   PROFİL ŞƏKLİ YÜKLƏMƏ (Sidebar avatar)
   ══════════════════════════════ */
function initAvatarUpload() {
  const avatarEl = document.getElementById('avatarInitials');
  if (!avatarEl || avatarEl.dataset.uploadReady) return;
  avatarEl.dataset.uploadReady = 'true';
  avatarEl.style.position = 'relative';
  avatarEl.style.cursor   = 'pointer';
  avatarEl.title = 'Şəkli dəyiş';

  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position:absolute; inset:0; border-radius:50%;
    background:rgba(0,0,0,0); display:flex;
    align-items:center; justify-content:center;
    transition:background .2s; pointer-events:none;
  `;
  overlay.innerHTML = `
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" style="opacity:0;transition:opacity .2s">
      <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>
      <circle cx="12" cy="13" r="4"/>
    </svg>`;
  avatarEl.appendChild(overlay);

  const svg = overlay.querySelector('svg');
  avatarEl.addEventListener('mouseenter', () => { overlay.style.background = 'rgba(0,0,0,0.5)'; svg.style.opacity = '1'; });
  avatarEl.addEventListener('mouseleave', () => { overlay.style.background = 'rgba(0,0,0,0)';   svg.style.opacity = '0'; });

  const fileInput = document.createElement('input');
  fileInput.type = 'file'; 
  fileInput.accept = 'image/*';
  fileInput.style.cssText = 'position:absolute;width:1px;height:1px;opacity:0;pointer-events:none;';
  document.body.appendChild(fileInput);
  avatarEl.addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', async () => {
    const file = fileInput.files[0];
    if (!file || !currentUser) return;
    overlay.style.background = 'rgba(0,0,0,0.6)';
    overlay.innerHTML = `<div style="color:#fff;font-size:0.68rem;font-weight:600;text-align:center;line-height:1.3;">Yüklənir...</div>`;
    try {
      const storageRef = firebase.storage().ref(`users/${currentUser.uid}/profile`);
      await storageRef.put(file);
      const photoURL = await storageRef.getDownloadURL();
      await fbDb.collection('users').doc(currentUser.uid).set({ photoURL }, { merge: true });
      const existingImg = avatarEl.querySelector('img');
      if (existingImg) { existingImg.src = photoURL; }
      else {
        [...avatarEl.childNodes].forEach(n => { if (n !== overlay) n.remove(); });
        const img = document.createElement('img');
        img.src = photoURL;
        img.style.cssText = 'width:100%;height:100%;object-fit:cover;border-radius:50%;';
        avatarEl.insertBefore(img, overlay);
      }
      showToast('Profil şəkli yeniləndi ✓');
    } catch (err) { showToast('Xəta: ' + err.message); }
    finally {
      overlay.style.background = 'rgba(0,0,0,0)';
      overlay.innerHTML = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" style="opacity:0;transition:opacity .2s"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>`;
      const ns = overlay.querySelector('svg');
      avatarEl.addEventListener('mouseenter', () => { overlay.style.background = 'rgba(0,0,0,0.5)'; ns.style.opacity = '1'; });
      avatarEl.addEventListener('mouseleave', () => { overlay.style.background = 'rgba(0,0,0,0)';   ns.style.opacity = '0'; });
      fileInput.value = '';
    }
  });
}
