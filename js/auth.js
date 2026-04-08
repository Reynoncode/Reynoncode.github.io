/* ═══════════════════════════════════════════
   auth.js — İstifadəçi qeydiyyatı və girişi
   Firebase əlavə edilənə qədər localStorage istifadə edir
   ═══════════════════════════════════════════ */

const auth = {

  /* ── İstifadəçi məlumatını al ── */
  getUser() {
    const data = localStorage.getItem('moda_user');
    return data ? JSON.parse(data) : null;
  },

  /* ── Giriş et ── */
  login(email, password) {
    // TODO: Firebase ilə əvəz ediləcək
    const users = this._getUsers();
    const user  = users.find(u => u.email === email && u.password === password);

    if (!user) return { success: false, error: 'E-poçt və ya şifrə səhvdir.' };

    const { password: _, ...safeUser } = user; // şifrəni saxlama
    localStorage.setItem('moda_user', JSON.stringify(safeUser));
    return { success: true, user: safeUser };
  },

  /* ── Qeydiyyat ── */
  register(name, email, password) {
    // TODO: Firebase ilə əvəz ediləcək
    const users = this._getUsers();

    if (users.find(u => u.email === email)) {
      return { success: false, error: 'Bu e-poçt artıq qeydiyyatdan keçib.' };
    }

    const newUser = {
      id:        Date.now().toString(),
      name,
      email,
      password,  // TODO: Firebase-də hash olunacaq
      createdAt: new Date().toISOString()
    };

    users.push(newUser);
    localStorage.setItem('moda_users', JSON.stringify(users));

    const { password: _, ...safeUser } = newUser;
    localStorage.setItem('moda_user', JSON.stringify(safeUser));
    return { success: true, user: safeUser };
  },

  /* ── Çıxış ── */
  logout() {
    localStorage.removeItem('moda_user');
  },

  /* ── Giriş edilib? ── */
  isLoggedIn() {
    return !!this.getUser();
  },

  /* ── Qorunan səhifə yoxlaması ── */
  requireAuth() {
    if (!this.isLoggedIn()) {
      window.location.href = '/index.html';
      return false;
    }
    return true;
  },

  /* ── Daxili: bütün istifadəçiləri al ── */
  _getUsers() {
    const data = localStorage.getItem('moda_users');
    return data ? JSON.parse(data) : [];
  }
};

/* ══════════════════════════════
   AUTH MODAL — Giriş / Qeydiyyat formu
   ══════════════════════════════ */
function initAuthModal() {
  const overlay    = document.getElementById('authModal');
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
          display:none;
          background:#fff0f0;
          color:var(--danger);
          border:1px solid #fcc;
          border-radius:var(--radius-md);
          padding:10px 14px;
          font-size:0.85rem;
          margin-bottom:16px;
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
          <input type="password" id="authPassword" placeholder="••••••••" />
        </div>

        <button class="btn btn-primary btn-full" id="authSubmit">
          ${isLoginMode ? 'Daxil ol' : 'Qeydiyyatdan keç'}
        </button>

        <div class="modal-footer">
          ${isLoginMode
            ? 'Hesabınız yoxdur? <a href="#" id="toggleAuth">Qeydiyyat</a>'
            : 'Hesabınız var? <a href="#" id="toggleAuth">Daxil ol</a>'
          }
        </div>
      </div>
    `;

    // Hadisə dinləyiciləri
    overlay.querySelector('.modal-close').addEventListener('click', () => modal.close('authModal'));
    overlay.querySelector('#toggleAuth').addEventListener('click', e => {
      e.preventDefault();
      isLoginMode = !isLoginMode;
      renderAuthForm();
    });

    overlay.querySelector('#authSubmit').addEventListener('click', handleAuthSubmit);
    overlay.querySelector('#authPassword').addEventListener('keydown', e => {
      if (e.key === 'Enter') handleAuthSubmit();
    });
  }

  function handleAuthSubmit() {
    const email    = document.getElementById('authEmail').value.trim();
    const password = document.getElementById('authPassword').value;
    const errorEl  = document.getElementById('authError');

    let result;

    if (isLoginMode) {
      result = auth.login(email, password);
    } else {
      const name = document.getElementById('authName').value.trim();
      if (!name) { showError('Ad boş ola bilməz.'); return; }
      result = auth.register(name, email, password);
    }

    if (result.success) {
      modal.close('authModal');
      renderHeader();
      toast.show(isLoginMode ? 'Xoş gəldiniz! 👋' : 'Qeydiyyat uğurlu oldu! 🎉', 'success');
    } else {
      showError(result.error);
    }

    function showError(msg) {
      errorEl.textContent = msg;
      errorEl.style.display = 'block';
    }
  }

  renderAuthForm();
}

document.addEventListener('DOMContentLoaded', initAuthModal);
