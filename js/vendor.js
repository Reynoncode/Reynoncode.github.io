/* ═══════════════════════════════════════════════
   vendor.js — Mağaza Parametrləri Paneli
   store.html-ə əlavə et: <script src="js/vendor.js"></script>
   ═══════════════════════════════════════════════ */

/* ══════════════════════════════════════════
   PARAMETRLƏRİ MODAL AÇ
══════════════════════════════════════════ */
async function openVendorSettings() {
  const old = document.getElementById('vendorSettingsModal');
  if (old) old.remove();

  const uid = fbAuth.currentUser?.uid;
  if (!uid) return;

  // Mövcud məlumatları yüklə
  const [vSnap, uSnap] = await Promise.all([
    fbDb.collection('vendors').doc(uid).get(),
    fbDb.collection('users').doc(uid).get()
  ]);
  const v = vSnap.exists ? vSnap.data() : {};
  const u = uSnap.exists ? uSnap.data() : {};

  const overlay = document.createElement('div');
  overlay.id = 'vendorSettingsModal';
  overlay.style.cssText = `
    position:fixed;inset:0;z-index:3000;
    background:rgba(15,10,5,.6);
    backdrop-filter:blur(8px);
    display:flex;align-items:center;justify-content:center;
    padding:1rem;
    opacity:0;transition:opacity .3s;
  `;

  overlay.innerHTML = `
    <div id="vendorSettingsPanel" style="
      background:#fff;border-radius:20px;
      width:100%;max-width:680px;max-height:90vh;
      overflow-y:auto;box-shadow:0 24px 80px rgba(0,0,0,.2);
      transform:translateY(32px) scale(.97);
      transition:transform .35s cubic-bezier(.34,1.56,.64,1);
    ">

      <!-- Başlıq -->
      <div style="display:flex;align-items:center;justify-content:space-between;padding:1.5rem 1.75rem 0;">
        <div>
          <h3 style="font-family:'Playfair Display',serif;font-size:1.25rem;font-weight:600;margin-bottom:.2rem">Mağaza Parametrləri</h3>
          <p style="font-size:.78rem;color:var(--muted)">Mağaza məlumatlarınızı burada idarə edin</p>
        </div>
        <button onclick="closeVendorSettings()" style="
          width:34px;height:34px;border-radius:50%;border:1px solid var(--border);
          background:var(--bg,#faf9f7);cursor:pointer;color:var(--muted);
          display:flex;align-items:center;justify-content:center;
          transition:all .2s;font-size:1rem;
        ">✕</button>
      </div>

      <!-- Tab naviqasiya -->
      <div style="display:flex;gap:0;border-bottom:1px solid var(--border);margin:1.25rem 1.75rem 0;padding:0;">
        ${[
          { id:'tab-general',  label:'Ümumi' },
          { id:'tab-brand',    label:'Brend' },
          { id:'tab-social',   label:'Sosial Media' },
          { id:'tab-address',  label:'Ünvan' },
        ].map((t, i) => `
          <button id="${t.id}-btn" onclick="vsShowTab('${t.id}')" style="
            padding:.65rem 1.1rem;border:none;background:none;cursor:pointer;
            font-size:.82rem;font-weight:600;color:${i===0?'var(--text)':'var(--muted)'};
            border-bottom:${i===0?'2px solid var(--accent)':'2px solid transparent'};
            margin-bottom:-1px;transition:all .2s;font-family:inherit;
          ">${t.label}</button>
        `).join('')}
      </div>

      <!-- Body -->
      <div style="padding:1.5rem 1.75rem 1.75rem;">

        <!-- TAB: Ümumi -->
        <div id="tab-general" class="vs-tab">

          <!-- Cover şəkli -->
          <div style="margin-bottom:1.5rem;">
            <div style="font-size:.8rem;font-weight:600;color:var(--accent);margin-bottom:.6rem">
              Arxa plan (Cover) Şəkli
            </div>
            <div id="vsCoverPreview" style="
              width:100%;height:140px;border-radius:12px;overflow:hidden;
              background:linear-gradient(135deg,#1a1a1a,#2c2c2c);
              border:2px dashed var(--border);position:relative;
              cursor:pointer;transition:all .2s;
            " onclick="document.getElementById('vsCoverInput').click()"
               onmouseover="this.style.borderColor='var(--accent)'"
               onmouseout="this.style.borderColor='var(--border)'">
              ${v.coverURL ? `<img src="${v.coverURL}" style="width:100%;height:100%;object-fit:cover">` : ''}
              <div style="
                position:absolute;inset:0;display:flex;flex-direction:column;
                align-items:center;justify-content:center;gap:.5rem;
                color:rgba(255,255,255,.7);font-size:.8rem;
                background:${v.coverURL ? 'rgba(0,0,0,.35)' : 'transparent'};
                transition:background .2s;
              " id="vsCoverOverlay">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <rect x="3" y="3" width="18" height="18" rx="3"/>
                  <circle cx="8.5" cy="8.5" r="1.5"/>
                  <polyline points="21 15 16 10 5 21"/>
                </svg>
                <span>${v.coverURL ? 'Şəkli dəyiş' : 'Cover şəkli əlavə et'}</span>
                <span style="font-size:.7rem;opacity:.7">1200×400 px tövsiyə edilir</span>
              </div>
            </div>
            <input type="file" id="vsCoverInput" accept="image/*" style="display:none"
              onchange="vsHandleCover(this.files[0])">
            ${v.coverURL ? `
              <button onclick="vsRemoveCover()" style="
                margin-top:.5rem;padding:.3rem .75rem;border:1px solid #fecaca;
                background:#fef2f2;color:#dc2626;border-radius:7px;
                font-size:.72rem;cursor:pointer;font-family:inherit;
              ">Cover şəklini sil</button>
            ` : ''}
          </div>

          <!-- Logo + Mağaza adı -->
          <div style="display:grid;grid-template-columns:auto 1fr;gap:1.25rem;margin-bottom:1rem;align-items:start;">
            <!-- Logo -->
            <div style="display:flex;flex-direction:column;align-items:center;gap:.5rem;">
              <div style="font-size:.76rem;font-weight:500;color:#555;text-align:center">Logo</div>
              <div id="vsLogoPreview" onclick="document.getElementById('vsLogoInput').click()" style="
                width:76px;height:76px;border-radius:50%;
                background:linear-gradient(135deg,#2c2c2c,#1a1a1a);
                color:#fff;display:flex;align-items:center;justify-content:center;
                font-family:'Playfair Display',serif;font-size:1.3rem;font-weight:600;
                cursor:pointer;overflow:hidden;position:relative;
                border:2.5px solid var(--border);transition:border-color .2s;
              " onmouseover="this.style.borderColor='var(--accent)'"
                 onmouseout="this.style.borderColor='var(--border)'">
                ${v.photoURL
                  ? `<img src="${v.photoURL}" style="width:100%;height:100%;object-fit:cover">`
                  : `<span id="vsLogoInitials">${vsGetInitials(v.storeName || u.displayName || '')}</span>`
                }
                <div style="
                  position:absolute;inset:0;background:rgba(0,0,0,.45);
                  display:flex;align-items:center;justify-content:center;
                  opacity:0;transition:opacity .2s;color:#fff;font-size:.65rem;text-align:center;
                " id="vsLogoHover">📷<br>Dəyiş</div>
              </div>
              <input type="file" id="vsLogoInput" accept="image/*" style="display:none"
                onchange="vsHandleLogo(this.files[0])">
              <div style="font-size:.68rem;color:var(--muted);text-align:center">Klikləyin</div>
            </div>

            <!-- Mağaza adı + kateqoriya -->
            <div style="display:flex;flex-direction:column;gap:.75rem;">
              <div>
                <label style="font-size:.76rem;font-weight:500;color:#555;display:block;margin-bottom:.3rem">
                  Mağaza adı <span style="color:var(--danger)">*</span>
                </label>
                <input type="text" id="vsStoreName" value="${v.storeName || u.storeName || ''}"
                  placeholder="Mağazanızın adı" style="${vsInputStyle()}">
              </div>
              <div>
                <label style="font-size:.76rem;font-weight:500;color:#555;display:block;margin-bottom:.3rem">Kateqoriya</label>
                <select id="vsCategory" style="${vsInputStyle()}">
                  ${[
                    ['','Seçin...'],
                    ['kisi_geyim','👔 Kişi geyimi'],
                    ['qadin_geyim','👗 Qadın geyimi'],
                    ['usaq_geyim','👶 Uşaq geyimi'],
                    ['idman','🏃 İdman & Outdoor'],
                    ['aksesuarlar','🎒 Aksesuarlar'],
                    ['ayaqqabi','👟 Ayaqqabı'],
                    ['diger','📦 Digər'],
                  ].map(([val, label]) =>
                    `<option value="${val}" ${(v.category||'')=== val ? 'selected' : ''}>${label}</option>`
                  ).join('')}
                </select>
              </div>
            </div>
          </div>

          <!-- Təsvir -->
          <div style="margin-bottom:.75rem;">
            <label style="font-size:.76rem;font-weight:500;color:#555;display:block;margin-bottom:.3rem">Mağaza haqqında</label>
            <textarea id="vsDesc" rows="3" placeholder="Mağazanız haqqında qısa məlumat..." style="${vsInputStyle()}resize:vertical;">${v.desc || v.description || ''}</textarea>
          </div>

          <!-- Telefon + Email -->
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:.75rem;margin-bottom:.75rem;">
            <div>
              <label style="font-size:.76rem;font-weight:500;color:#555;display:block;margin-bottom:.3rem">Telefon</label>
              <input type="tel" id="vsPhone" value="${v.phone || u.phone || ''}"
                placeholder="+994 XX XXX XX XX" style="${vsInputStyle()}">
            </div>
            <div>
              <label style="font-size:.76rem;font-weight:500;color:#555;display:block;margin-bottom:.3rem">E-poçt (ictimai)</label>
              <input type="email" id="vsPublicEmail" value="${v.publicEmail || ''}"
                placeholder="magaza@mail.com" style="${vsInputStyle()}">
            </div>
          </div>

          <!-- Çatdırılma -->
          <div style="margin-bottom:.75rem;">
            <label style="font-size:.76rem;font-weight:500;color:#555;display:block;margin-bottom:.3rem">Pulsuz çatdırılma (AZN)</label>
            <input type="number" id="vsFreeShipping" value="${v.freeShippingThreshold || 50}"
              min="0" step="1" placeholder="50" style="${vsInputStyle()}width:180px;">
            <div style="font-size:.7rem;color:var(--muted);margin-top:.3rem">Bu məbləğdən yuxarı sifarişlərə pulsuz çatdırılma</div>
          </div>
        </div>

        <!-- TAB: Brend -->
        <div id="tab-brand" class="vs-tab" style="display:none;">
          <div style="margin-bottom:1rem;">
            <label style="font-size:.76rem;font-weight:500;color:#555;display:block;margin-bottom:.3rem">Brend / Marka adı</label>
            <input type="text" id="vsBrand" value="${v.brand || ''}"
              placeholder="Məs: ZARA, H&M, yerli marka..." style="${vsInputStyle()}">
          </div>
          <div style="margin-bottom:1rem;">
            <label style="font-size:.76rem;font-weight:500;color:#555;display:block;margin-bottom:.3rem">Veb sayt</label>
            <input type="url" id="vsWebsite" value="${v.website || ''}"
              placeholder="https://saytiniz.com" style="${vsInputStyle()}">
          </div>
          <div style="margin-bottom:1rem;">
            <label style="font-size:.76rem;font-weight:500;color:#555;display:block;margin-bottom:.3rem">Çatdırılma müddəti</label>
            <select id="vsDelivery" style="${vsInputStyle()}">
              ${[
                ['1-2','1-2 iş günü'],
                ['2-3','2-3 iş günü'],
                ['3-5','3-5 iş günü'],
                ['5-7','5-7 iş günü'],
                ['7+','7+ iş günü'],
              ].map(([val, label]) =>
                `<option value="${val}" ${(v.deliveryDays||'2-3')===val?'selected':''}>${label}</option>`
              ).join('')}
            </select>
          </div>
          <div style="margin-bottom:1rem;">
            <label style="font-size:.76rem;font-weight:500;color:#555;display:block;margin-bottom:.3rem">Qaytarma siyasəti</label>
            <textarea id="vsReturnPolicy" rows="3" placeholder="Məs: 14 gün ərzində qaytarma qəbul edilir..."
              style="${vsInputStyle()}resize:vertical;">${v.returnPolicy || ''}</textarea>
          </div>
        </div>

        <!-- TAB: Sosial Media -->
        <div id="tab-social" class="vs-tab" style="display:none;">
          <p style="font-size:.78rem;color:var(--muted);margin-bottom:1.25rem;line-height:1.6;">
            Sosial media hesablarınızı əlavə edin. Mağaza səhifəsində görünəcək.
          </p>
          ${[
            { id:'vsInstagram', icon:'📸', label:'Instagram', ph:'@hesabiniz', val: v.instagram||'' },
            { id:'vsTiktok',    icon:'🎵', label:'TikTok',    ph:'@hesabiniz', val: v.tiktok||'' },
            { id:'vsFacebook',  icon:'👥', label:'Facebook',  ph:'facebook.com/sehife', val: v.facebook||'' },
            { id:'vsYoutube',   icon:'▶️', label:'YouTube',   ph:'youtube.com/kanal', val: v.youtube||'' },
            { id:'vsWhatsapp',  icon:'💬', label:'WhatsApp',  ph:'+994 XX XXX XX XX', val: v.whatsapp||'' },
          ].map(s => `
            <div style="display:flex;align-items:center;gap:.75rem;margin-bottom:.75rem;">
              <div style="
                width:38px;height:38px;border-radius:10px;
                background:var(--bg,#faf9f7);border:1px solid var(--border);
                display:flex;align-items:center;justify-content:center;
                font-size:1.1rem;flex-shrink:0;
              ">${s.icon}</div>
              <div style="flex:1;">
                <div style="font-size:.72rem;font-weight:500;color:#555;margin-bottom:.25rem">${s.label}</div>
                <input type="text" id="${s.id}" value="${s.val}"
                  placeholder="${s.ph}" style="${vsInputStyle()}margin:0;">
              </div>
            </div>
          `).join('')}
        </div>

        <!-- TAB: Ünvan -->
        <div id="tab-address" class="vs-tab" style="display:none;">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:.75rem;margin-bottom:.75rem;">
            <div>
              <label style="font-size:.76rem;font-weight:500;color:#555;display:block;margin-bottom:.3rem">Şəhər</label>
              <select id="vsCity" style="${vsInputStyle()}">
                ${['Bakı','Gəncə','Sumqayıt','Lənkəran','Mingəçevir','Naxçıvan','Şirvan','Lankaran','Şəki','Digər'].map(c =>
                  `<option value="${c}" ${(v.city||u.city||'Bakı')===c?'selected':''}>${c}</option>`
                ).join('')}
              </select>
            </div>
            <div>
              <label style="font-size:.76rem;font-weight:500;color:#555;display:block;margin-bottom:.3rem">Rayon / Qəsəbə</label>
              <input type="text" id="vsDistrict" value="${v.district||''}"
                placeholder="Məs: Nərimanov, Yasamal..." style="${vsInputStyle()}">
            </div>
          </div>
          <div style="margin-bottom:.75rem;">
            <label style="font-size:.76rem;font-weight:500;color:#555;display:block;margin-bottom:.3rem">Küçə / Ünvan</label>
            <input type="text" id="vsStreet" value="${v.street||''}"
              placeholder="Küçə adı, bina nömrəsi..." style="${vsInputStyle()}">
          </div>
          <div style="margin-bottom:.75rem;">
            <label style="font-size:.76rem;font-weight:500;color:#555;display:block;margin-bottom:.3rem">İş saatları</label>
            <input type="text" id="vsWorkHours" value="${v.workHours||''}"
              placeholder="Məs: B.e–C. 09:00–18:00" style="${vsInputStyle()}">
          </div>
          <div style="
            background:#f0f9ff;border:1px solid #bae6fd;border-radius:10px;
            padding:.75rem 1rem;font-size:.78rem;color:#0369a1;margin-top:.5rem;
          ">
            📍 Ünvan məlumatları sifarişlər zamanı müştərilərə göstərilmir. Yalnız mağaza səhifəsinin əlaqə bölümündə görünür.
          </div>
        </div>

        <!-- Footer düymələri -->
        <div style="display:flex;gap:.75rem;margin-top:1.5rem;padding-top:1.25rem;border-top:1px solid var(--border);">
          <button onclick="closeVendorSettings()" style="
            flex:1;padding:.75rem;border-radius:10px;
            border:1.5px solid var(--border);background:none;
            font-size:.875rem;font-weight:500;cursor:pointer;
            font-family:inherit;transition:all .15s;
          " onmouseover="this.style.borderColor='var(--accent)'"
             onmouseout="this.style.borderColor='var(--border)'">Ləğv et</button>
          <button onclick="saveVendorSettings()" id="vsSaveBtn" style="
            flex:2;padding:.75rem;border-radius:10px;
            background:var(--accent,#1a1a1a);color:#fff;
            border:none;font-size:.9rem;font-weight:600;
            cursor:pointer;font-family:inherit;transition:opacity .2s;
          ">💾 Yadda saxla</button>
        </div>

      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  // Hover effekt for logo
  const logoPrev = overlay.querySelector('#vsLogoPreview');
  const logoHov  = overlay.querySelector('#vsLogoHover');
  if (logoPrev && logoHov) {
    logoPrev.addEventListener('mouseover', () => logoHov.style.opacity = '1');
    logoPrev.addEventListener('mouseout',  () => logoHov.style.opacity = '0');
  }

  setTimeout(() => {
    overlay.style.opacity = '1';
    document.getElementById('vendorSettingsPanel').style.transform = 'translateY(0) scale(1)';
  }, 10);

  overlay.addEventListener('click', e => { if (e.target === overlay) closeVendorSettings(); });

  // Aktif tab saxla (cover preview üçün)
  window._vsCoverBase64 = null;
  window._vsLogoBase64  = null;
}

/* ── Tab keçidi ── */
function vsShowTab(tabId) {
  document.querySelectorAll('.vs-tab').forEach(t => t.style.display = 'none');
  document.getElementById(tabId).style.display = 'block';

  const tabs = ['tab-general','tab-brand','tab-social','tab-address'];
  tabs.forEach(t => {
    const btn = document.getElementById(t + '-btn');
    if (!btn) return;
    const active = t === tabId;
    btn.style.color       = active ? 'var(--text)' : 'var(--muted)';
    btn.style.borderBottom = active ? '2px solid var(--accent)' : '2px solid transparent';
  });
}

/* ── Cover şəkli ── */
function vsHandleCover(file) {
  if (!file || !file.type.startsWith('image/')) return;
  const reader = new FileReader();
  reader.onload = e => {
    window._vsCoverBase64 = e.target.result;
    const prev = document.getElementById('vsCoverPreview');
    if (prev) {
      prev.innerHTML = `
        <img src="${e.target.result}" style="width:100%;height:100%;object-fit:cover">
        <div style="
          position:absolute;inset:0;display:flex;align-items:center;justify-content:center;
          background:rgba(0,0,0,.35);color:#fff;font-size:.78rem;opacity:0;
          transition:opacity .2s;
        " onmouseover="this.style.opacity=1" onmouseout="this.style.opacity=0">
          📷 Dəyiş
        </div>
      `;
      prev.onclick = () => document.getElementById('vsCoverInput').click();
    }
  };
  reader.readAsDataURL(file);
}

function vsRemoveCover() {
  window._vsCoverBase64 = '__remove__';
  const prev = document.getElementById('vsCoverPreview');
  if (prev) {
    prev.innerHTML = `
      <div style="
        position:absolute;inset:0;display:flex;flex-direction:column;
        align-items:center;justify-content:center;gap:.5rem;
        color:rgba(255,255,255,.7);font-size:.8rem;
      ">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <rect x="3" y="3" width="18" height="18" rx="3"/>
          <circle cx="8.5" cy="8.5" r="1.5"/>
          <polyline points="21 15 16 10 5 21"/>
        </svg>
        <span>Cover şəkli əlavə et</span>
        <span style="font-size:.7rem;opacity:.7">1200×400 px tövsiyə edilir</span>
      </div>
    `;
    prev.onclick = () => document.getElementById('vsCoverInput').click();
  }
}

/* ── Logo şəkli ── */
function vsHandleLogo(file) {
  if (!file || !file.type.startsWith('image/')) return;
  const reader = new FileReader();
  reader.onload = e => {
    window._vsLogoBase64 = e.target.result;
    const prev = document.getElementById('vsLogoPreview');
    if (prev) {
      prev.innerHTML = `
        <img src="${e.target.result}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">
        <div id="vsLogoHover" style="
          position:absolute;inset:0;background:rgba(0,0,0,.45);
          display:flex;align-items:center;justify-content:center;
          opacity:0;transition:opacity .2s;color:#fff;font-size:.65rem;text-align:center;
          border-radius:50%;
        ">📷<br>Dəyiş</div>
      `;
      prev.addEventListener('mouseover', () => { const h = prev.querySelector('#vsLogoHover'); if(h) h.style.opacity='1'; });
      prev.addEventListener('mouseout',  () => { const h = prev.querySelector('#vsLogoHover'); if(h) h.style.opacity='0'; });
    }
  };
  reader.readAsDataURL(file);
}

/* ── Yadda saxla ── */
async function saveVendorSettings() {
  const btn = document.getElementById('vsSaveBtn');
  if (!btn) return;
  btn.disabled = true;
  btn.textContent = 'Saxlanılır...';

  const uid = fbAuth.currentUser?.uid;
  if (!uid) return;

  try {
    const payload = {
      storeName:            document.getElementById('vsStoreName')?.value.trim() || '',
      category:             document.getElementById('vsCategory')?.value || '',
      desc:                 document.getElementById('vsDesc')?.value.trim() || '',
      phone:                document.getElementById('vsPhone')?.value.trim() || '',
      publicEmail:          document.getElementById('vsPublicEmail')?.value.trim() || '',
      freeShippingThreshold: parseFloat(document.getElementById('vsFreeShipping')?.value) || 50,
      brand:                document.getElementById('vsBrand')?.value.trim() || '',
      website:              document.getElementById('vsWebsite')?.value.trim() || '',
      deliveryDays:         document.getElementById('vsDelivery')?.value || '2-3',
      returnPolicy:         document.getElementById('vsReturnPolicy')?.value.trim() || '',
      instagram:            document.getElementById('vsInstagram')?.value.trim() || '',
      tiktok:               document.getElementById('vsTiktok')?.value.trim() || '',
      facebook:             document.getElementById('vsFacebook')?.value.trim() || '',
      youtube:              document.getElementById('vsYoutube')?.value.trim() || '',
      whatsapp:             document.getElementById('vsWhatsapp')?.value.trim() || '',
      city:                 document.getElementById('vsCity')?.value || '',
      district:             document.getElementById('vsDistrict')?.value.trim() || '',
      street:               document.getElementById('vsStreet')?.value.trim() || '',
      workHours:            document.getElementById('vsWorkHours')?.value.trim() || '',
      updatedAt:            firebase.firestore.FieldValue.serverTimestamp(),
    };

    // Logo
    if (window._vsLogoBase64) {
      payload.photoURL = window._vsLogoBase64;
    }

    // Cover
    if (window._vsCoverBase64 === '__remove__') {
      payload.coverURL = '';
    } else if (window._vsCoverBase64) {
      payload.coverURL = window._vsCoverBase64;
    }

    // vendors + users kolleksiyasına yaz
    await Promise.all([
      fbDb.collection('vendors').doc(uid).set(payload, { merge: true }),
      fbDb.collection('users').doc(uid).set({
        storeName: payload.storeName,
        phone:     payload.phone,
        city:      payload.city,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      }, { merge: true })
    ]);

    if (typeof toast !== 'undefined') toast.show('Parametrlər saxlanıldı ✓', 'success');
    closeVendorSettings();

    // Dashboardı yenilə
    setTimeout(() => loadVendorDashboard(uid), 400);

  } catch (err) {
    if (typeof toast !== 'undefined') toast.show('Xəta: ' + err.message, 'error');
    btn.disabled = false;
    btn.textContent = '💾 Yadda saxla';
  }
}

/* ── Modali bağla ── */
function closeVendorSettings() {
  const overlay = document.getElementById('vendorSettingsModal');
  if (!overlay) return;
  overlay.style.opacity = '0';
  document.getElementById('vendorSettingsPanel').style.transform = 'translateY(32px) scale(.97)';
  setTimeout(() => overlay.remove(), 300);
}

/* ── Köməkçi funksiyalar ── */
function vsGetInitials(name) {
  return (name || '').split(' ').map(w => w[0] || '').join('').substring(0, 2).toUpperCase() || '?';
}

function vsInputStyle() {
  return `
    display:block;width:100%;padding:.6rem .85rem;
    border:1.5px solid var(--border);border-radius:8px;
    font-family:'DM Sans',sans-serif;font-size:.875rem;
    color:var(--text);background:var(--bg,#faf9f7);
    outline:none;transition:border-color .2s;box-sizing:border-box;
  `;
}
