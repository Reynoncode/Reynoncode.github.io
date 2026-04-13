/* ═══════════════════════════════════════════
   auth.js — Firebase Authentication
   Email/Şifrə + Google Sign-In
   ═══════════════════════════════════════════ */

const auth = {

  /* ── Cari istifadəçini al ── */
 getUser() {
  const u = fbAuth.currentUser;
  if (!u) return null;
  return {
    id:       u.uid,
    name:     u.displayName || u.email.split('@')[0],
    email:    u.email,
    photoURL: window._firestorePhotoURL || u.photoURL || null
  };
},

  /* ── Email/Şifrə ilə giriş ── */
  async login(email, password) {
    try {
      await fbAuth.signInWithEmailAndPassword(email, password);
      return { success: true };
    } catch (err) {
      return { success: false, error: _authError(err.code) };
    }
  },

  /* ── Qeydiyyat ── */
  async register(name, email, password) {
    try {
      const result = await fbAuth.createUserWithEmailAndPassword(email, password);
      await result.user.updateProfile({ displayName: name });
      await fbDb.collection('users').doc(result.user.uid).set({
        uid:         result.user.uid,
        email,
        displayName: name,
        firstName:   name.split(' ')[0] || name,
        lastName:    name.split(' ').slice(1).join(' ') || '',
        photoURL:    '',
        createdAt:   firebase.firestore.FieldValue.serverTimestamp()
      });
      return { success: true };
    } catch (err) {
      return { success: false, error: _authError(err.code) };
    }
  },

  /* ── Google ilə giriş ── */
  async loginWithGoogle() {
    try {
      const provider = new firebase.auth.GoogleAuthProvider();
      const result   = await fbAuth.signInWithPopup(provider);

      const snap = await fbDb.collection('users').doc(result.user.uid).get();
      if (!snap.exists) {
        const nameParts = (result.user.displayName || '').split(' ');
        await fbDb.collection('users').doc(result.user.uid).set({
          uid:         result.user.uid,
          email:       result.user.email,
          displayName: result.user.displayName,
          firstName:   nameParts[0] || '',
          lastName:    nameParts.slice(1).join(' ') || '',
          photoURL:    result.user.photoURL || '',
          createdAt:   firebase.firestore.FieldValue.serverTimestamp()
        });
      }
      return { success: true };
    } catch (err) {
      return { success: false, error: _authError(err.code) };
    }
  },

  /* ── Çıxış ── */
  async logout() {
    await fbAuth.signOut();
  },

  /* ── Giriş edilib? ── */
  isLoggedIn() {
    return !!fbAuth.currentUser;
  },

  /* ── Qorunan səhifə yoxlaması ── */
  requireAuth() {
    if (!this.isLoggedIn()) {
      window.location.href = '/index.html';
      return false;
    }
    return true;
  }
};

/* ── Firebase xəta mesajları (Azərbaycanca) ── */
function _authError(code) {
  const map = {
    'auth/email-already-in-use':   'Bu e-poçt artıq istifadə olunur.',
    'auth/invalid-email':          'E-poçt formatı səhvdir.',
    'auth/weak-password':          'Şifrə ən az 6 simvol olmalıdır.',
    'auth/user-not-found':         'Bu e-poçtla hesab tapılmadı.',
    'auth/wrong-password':         'Şifrə yanlışdır.',
    'auth/invalid-credential':     'E-poçt və ya şifrə səhvdir.',
    'auth/too-many-requests':      'Çox cəhd edildi. Bir az gözləyin.',
    'auth/network-request-failed': 'Şəbəkə xətası.',
    'auth/popup-closed-by-user':   'Giriş ləğv edildi.',
  };
  return map[code] || 'Xəta baş verdi. Yenidən cəhd edin.';
}

/* ══════════════════════════════
   AUTH STATE — Header Render
   onAuthStateChanged dinləyicisi bütün səhifələrdə
   header-ı düzgün render edir
   ══════════════════════════════ */
function _initAuthStateHeader() {
  fbAuth.onAuthStateChanged(async (user) => {
    
    if (user) {
      // Firestore-dan photoURL oxu (base64 ola bilər)
      try {
        const snap = await fbDb.collection('users').doc(user.uid).get();
        if (snap.exists && snap.data().photoURL) {
          window._firestorePhotoURL = snap.data().photoURL;
        } else {
          window._firestorePhotoURL = null;
        }
      } catch(e) {
        window._firestorePhotoURL = null;
      }
    } else {
      window._firestorePhotoURL = null;
    }

    if (typeof renderHeader === 'function') {
      renderHeader(user ? auth.getUser() : null);
    }

    if (typeof cart !== 'undefined' && typeof cart.init === 'function') {
      cart.init(user ? user.uid : null);
    }

    if (typeof updateCartBadge === 'function') {
      updateCartBadge();
    }
  });
}

/* DOMContentLoaded-da başlat */
document.addEventListener('DOMContentLoaded', _initAuthStateHeader);


/* ══════════════════════════════
   AUTH MODAL — Giriş / Qeydiyyat / Google
   ══════════════════════════════ */
function initAuthModal() {
  const overlay = document.getElementById('authModal');
  if (!overlay) return;

  let isLoginMode = true;

  function renderAuthForm() {
    overlay.innerHTML = `
      <div class="modal">
        <button class="modal-close">✕</button>

        <div class="modal-logo">
          <span class="logo-name">MO<span style="color:var(--accent)">DA</span></span>
        </div>

        <h2>${isLoginMode ? 'Xoş gəldiniz' : 'Qeydiyyat'}</h2>
        <p class="modal-sub">${isLoginMode ? 'Hesabınıza daxil olun' : 'Yeni hesab yaradın'}</p>

        <div id="authError" style="
          display:none;background:#fff0f0;color:var(--danger);
          border:1px solid #fcc;border-radius:var(--radius-md);
          padding:10px 14px;font-size:0.85rem;margin-bottom:16px;
        "></div>

        ${!isLoginMode ? `
          <div class="form-group">
            <label>Ad Soyad</label>
            <input type="text" id="authName" placeholder="Adınızı daxil edin" />
          </div>
        ` : ''}

        <div class="form-group">
          <label>E-poçt</label>
          <input type="email" id="authEmail" placeholder="ornek@mail.com" />
        </div>

        <div class="form-group">
          <label>Şifrə</label>
          <input type="password" id="authPassword" placeholder="••••••••" minlength="6" />
        </div>

        <button class="btn btn-primary btn-full" id="authSubmit">
          ${isLoginMode ? 'Daxil ol' : 'Qeydiyyatdan keç'}
        </button>

        <!-- Ayırıcı xətt -->
        <div style="text-align:center;color:var(--muted);font-size:0.8rem;margin:16px 0;position:relative;">
          <span style="background:var(--surface);padding:0 12px;position:relative;z-index:1;">və ya</span>
          <div style="position:absolute;top:50%;left:0;right:0;height:1px;background:var(--border);"></div>
        </div>

        <!-- Google düyməsi -->
        <button class="btn btn-outline btn-full" id="googleBtn">
          <svg viewBox="0 0 24 24" width="18" height="18" style="flex-shrink:0">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Google ilə davam et
        </button>

        <div class="modal-footer">
          ${isLoginMode
            ? 'Hesabınız yoxdur? <a href="#" id="toggleAuth">Qeydiyyat</a>'
            : 'Hesabınız var? <a href="#" id="toggleAuth">Daxil ol</a>'
          }
        </div>
      </div>
    `;

    overlay.querySelector('.modal-close').addEventListener('click', () => modal.close('authModal'));
    overlay.querySelector('#toggleAuth').addEventListener('click', e => {
      e.preventDefault();
      isLoginMode = !isLoginMode;
      renderAuthForm();
    });
    overlay.querySelector('#authSubmit').addEventListener('click', handleEmailSubmit);
    overlay.querySelector('#authPassword').addEventListener('keydown', e => {
      if (e.key === 'Enter') handleEmailSubmit();
    });
    overlay.querySelector('#googleBtn').addEventListener('click', handleGoogleSignIn);
  }

  /* ── Email/Şifrə submit ── */
  async function handleEmailSubmit() {
    const btn      = document.getElementById('authSubmit');
    const email    = document.getElementById('authEmail').value.trim();
    const password = document.getElementById('authPassword').value;
    const errorEl  = document.getElementById('authError');

    if (!email || !password) { showError('Bütün sahələri doldurun.'); return; }

    btn.disabled    = true;
    btn.textContent = 'Yüklənir...';

    let result;
    if (isLoginMode) {
      result = await auth.login(email, password);
    } else {
      const name = document.getElementById('authName')?.value.trim();
      if (!name) { showError('Ad boş ola bilməz.'); resetBtn(); return; }
      result = await auth.register(name, email, password);
    }

    if (result.success) {
      modal.close('authModal');
      if (typeof toast !== 'undefined') {
        toast.show(isLoginMode ? 'Xoş gəldiniz! 👋' : 'Qeydiyyat uğurlu oldu! 🎉', 'success');
      }
      /* onAuthStateChanged renderHeader-i özü çağıracaq */
    } else {
      showError(result.error);
      resetBtn();
    }

    function resetBtn() {
      btn.disabled    = false;
      btn.textContent = isLoginMode ? 'Daxil ol' : 'Qeydiyyatdan keç';
    }
    function showError(msg) {
      errorEl.textContent   = msg;
      errorEl.style.display = 'block';
    }
  }

  /* ── Google Sign-In ── */
  async function handleGoogleSignIn() {
    const btn = document.getElementById('googleBtn');
    btn.disabled = true;

    const result = await auth.loginWithGoogle();

    if (result.success) {
      modal.close('authModal');
      if (typeof toast !== 'undefined') {
        toast.show('Google ilə giriş uğurlu oldu! 🎉', 'success');
      }
    } else {
      const errorEl = document.getElementById('authError');
      errorEl.textContent   = result.error;
      errorEl.style.display = 'block';
      btn.disabled = false;
    }
  }

  renderAuthForm();
}

document.addEventListener('DOMContentLoaded', initAuthModal);
