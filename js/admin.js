/* =====================================================
   TALENTYAH — admin.js
   Rôles : superadmin | admin | editor
===================================================== */

const API = 'https://talentyah-website.onrender.com';

/* ══════════════════════════════
   MATRICE DES PRIVILÈGES
   Modifier ici pour ajuster les accès par rôle.
   true  = panel visible
   false = panel masqué
══════════════════════════════ */
// Helper API centralisé — gère automatiquement les 401
async function _api(path, options = {}) {
  const token = sessionStorage.getItem('talentyah_token');
  const res = await fetch(API + path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + token,
      ...(options.headers || {}),
    },
  });
  if (res.status === 401) {
    alert('⚠️ Session expirée. Veuillez vous reconnecter.');
    sessionStorage.removeItem('talentyah_token');
    sessionStorage.removeItem('talentyah_email');
    document.getElementById('adminDashboardSection').style.display = 'none';
    document.getElementById('adminLoginSection').style.display = 'flex';
    throw new Error('401 Session expirée');
  }
  return res;
}

const PRIVILEGES = {
  superadmin: {
    panelCandidates:   true,
    panelCompanies:    true,
    panelJobs:         true,
    panelCarousel:     true,
    panelPartners:     true,
    panelPublications: true,
    panelAccess:       true,
  },
  admin: {
    panelCandidates:   true,
    panelCompanies:    true,
    panelJobs:         true,
    panelCarousel:     true,
    panelPartners:     true,
    panelPublications: true,
    panelAccess:       false,
  },
  editor: {
    panelCandidates:   false,
    panelCompanies:    false,
    panelJobs:         false,
    panelCarousel:     false,
    panelPartners:     false,
    panelPublications: true,
    panelAccess:       false,
  },
};

/* Comptes de démo (sans backend)
   Démo superadmin : admin@talentyah.com   / admin
   Démo admin      : manager@talentyah.com / manager
   Démo éditeur    : editor@talentyah.com  / editor
*/
const DEMO_ACCOUNTS = {
  'admin@talentyah.com':    { password: 'admin',   role: 'superadmin' },
  'manager@talentyah.com':  { password: 'manager', role: 'admin'      },
  'editor@talentyah.com':   { password: 'editor',  role: 'editor'     },
};

/* ══════════════════════════════
   INIT
══════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {

  /* Date topbar */
  const dateEl = document.getElementById('adminDate');
  if (dateEl) {
    dateEl.textContent = new Date().toLocaleDateString('fr-FR', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });
  }

  /* Auto-login si token présent */
  if (sessionStorage.getItem('talentyah_token')) showDashboard();

  /* ── Formulaire login ── */
  const loginForm = document.getElementById('adminLoginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn      = loginForm.querySelector('.admin-login-btn');
      const msgEl    = document.getElementById('adminMsg');
      const email    = loginForm.email.value.trim();
      const password = loginForm.password.value;
      btn.textContent = 'Connexion…'; btn.disabled = true;
      if (msgEl) msgEl.textContent = '';

      // Tenter le login avec retry (cold start Render peut prendre 30-50s)
      async function tryLogin(attempt) {
        try {
          const controller = new AbortController();
          const timeout    = setTimeout(() => controller.abort(), 55000);
          const res  = await fetch(API + '/api/admin/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
            signal: controller.signal,
          });
          clearTimeout(timeout);
          const data = await res.json();
          if (res.ok && data.token) {
            sessionStorage.setItem('talentyah_token', data.token);
            sessionStorage.setItem('talentyah_email', email);
            sessionStorage.removeItem('talentyah_demo'); // s'assurer qu'on n'est pas en mode démo
            showDashboard();
          } else {
            if (msgEl) { msgEl.textContent = 'Email ou mot de passe incorrect.'; msgEl.style.color = '#c0392b'; }
            btn.textContent = 'Se connecter'; btn.disabled = false;
          }
        } catch (err) {
          if (err.name === 'AbortError' && attempt === 1) {
            // Cold start — on réessaie une fois
            if (msgEl) { msgEl.textContent = 'Serveur en démarrage, nouvelle tentative…'; msgEl.style.color = 'var(--muted)'; }
            return tryLogin(2);
          }
          // Erreur réseau — ne pas basculer en mode démo (token invalide)
          if (msgEl) {
            msgEl.innerHTML = '⚠️ Serveur injoignable.<br><span style="font-size:12px;">Attendez 30 secondes et réessayez (cold start Render).</span>';
            msgEl.style.color = '#c0392b';
          }
          btn.textContent = 'Réessayer'; btn.disabled = false;
        }
      }
    });
  }

  /* ── Logout ── */
  document.getElementById('logoutBtn')?.addEventListener('click', () => {
    sessionStorage.removeItem('talentyah_token');
    document.getElementById('adminDashboardSection').style.display = 'none';
    document.getElementById('adminLoginSection').style.display     = 'flex';
    loginForm?.reset();
  });

  /* ── Navigation sidebar ── */
  document.querySelectorAll('.admin-nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.admin-nav-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.admin-panel').forEach(p => {
        p.classList.remove('active');
        p.style.display = 'none'; // force hide via inline pour tous
      });
      btn.classList.add('active');
      const panel = document.getElementById(btn.dataset.panel);
      if (panel) {
        panel.style.display = ''; // retire le inline, laisse CSS .active gérer
        panel.classList.add('active');
      }
      const titleEl = document.getElementById('topbarTitle');
      const subEl   = document.getElementById('topbarSub');
      if (titleEl && btn.dataset.title) titleEl.textContent = btn.dataset.title;
      if (subEl   && btn.dataset.sub)   subEl.textContent   = btn.dataset.sub;
      // Recharger les données du panel au clic
      const reloadMap = {
        panelCandidates:   loadCandidates,
        panelCompanies:    loadCompanies,
        panelJobs:         loadJobs,
        panelCarousel:     loadCarousel,
        panelPartners:     loadPartners,
        panelPublications: loadPublications,
        panelAccess:       loadAccessList,
      };
      if (reloadMap[btn.dataset.panel]) reloadMap[btn.dataset.panel]();
    });
  });

  /* ── Lien Accès & Rôles dans le footer sidebar ── */
  document.getElementById('tabAccess')?.addEventListener('click', () => {
    document.querySelector('[data-panel="panelAccess"]')?.click();
  });

  /* ── Filtres candidatures ── */
  document.getElementById('applyFiltersBtn')?.addEventListener('click', loadCandidates);
  document.getElementById('resetFiltersBtn')?.addEventListener('click', () => {
    document.getElementById('filterSector').value  = '';
    document.getElementById('filterCountry').value = '';
    loadCandidates();
  });

  /* ── Formulaire offre ── */
  const jobForm = document.getElementById('jobForm');
  if (jobForm) {
    jobForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = jobForm.querySelector('.btn-publish-gold');
      const msg = document.getElementById('jobMsg');
      btn.textContent = 'Publication…'; btn.disabled = true;

      const payload = {
        title:         jobForm.title.value.trim(),
        city:          jobForm.city?.value.trim() || '',
        country:       jobForm.country?.value.trim() || '',
        sector:        jobForm.sector.value,
        contract_type: jobForm.contract_type.value,
        salary:        jobForm.salary?.value.trim() || '',
        tags:          (jobForm.tags?.value || '').split(',').map(t => t.trim()).filter(Boolean),
        description:   jobForm.description.value.trim(),
        is_new:        true,
      };

      try {
        const token = sessionStorage.getItem('talentyah_token');
        const res   = await fetch(API + '/api/jobs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          if (msg) { msg.textContent = '✓ Offre publiée avec succès !'; msg.style.color = 'var(--emerald)'; }
          jobForm.reset(); loadJobs();
        } else {
          const d = await res.json();
          if (msg) { msg.textContent = d.error || 'Erreur lors de la publication.'; msg.style.color = '#c0392b'; }
        }
      } catch {
        adminJobsDemo.unshift({ ...payload, id: Date.now(), created_at: new Date().toISOString() });
        renderAdminJobs(adminJobsDemo);
        if (msg) { msg.textContent = '✓ Offre ajoutée (mode démo).'; msg.style.color = 'var(--emerald)'; }
        jobForm.reset();
      }
      btn.textContent = "Publier l'offre"; btn.disabled = false;
    });
  }

  /* ── Partenaires ── */
  document.getElementById('addPartnerSlotBtn')?.addEventListener('click', () => {
    partners.push({ name: 'Partenaire ' + (partners.length + 1), desc: '', img: null });
    document.getElementById('countPartners').textContent = partners.length;
    renderPartnersGrid(); renderPartnerNames();
  });
  document.getElementById('savePartnersBtn')?.addEventListener('click', async () => {
    const msg = document.getElementById('partnersMsg');
    const token = sessionStorage.getItem('talentyah_token');
    if (msg) { msg.textContent = 'Enregistrement…'; msg.style.color = 'var(--muted)'; }

    try {
      // Pour chaque partenaire : PUT si id existant, POST si nouveau
      for (let i = 0; i < partners.length; i++) {
        const p = partners[i];
        const fd = new FormData();
        fd.append('name', p.name);
        fd.append('description', p.desc || '');
        fd.append('sort_order', i);
        // Ne pas renvoyer les base64 — l'image est déjà uploadée via handlePartnerImg
        // Si p.img est une URL serveur (/uploads/...), on la passe en texte
        if (p.img && !p.img.startsWith('data:')) {
          fd.append('existing_image_url', p.img);
        }

        if (p.id) {
          await fetch(API + '/api/partners/' + p.id, {
            method: 'PUT',
            headers: { 'Authorization': 'Bearer ' + token },
            body: fd
          });
        } else {
          const res = await fetch(API + '/api/partners', {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + token },
            body: fd
          });
          if (res.ok) {
            const data = await res.json();
            partners[i].id = data.id; // assigner l'id reçu
          }
        }
      }

      if (msg) { msg.textContent = '✓ Partenaires enregistrés.'; msg.style.color = 'var(--emerald)'; setTimeout(() => { msg.textContent = ''; }, 3000); }
      loadPartners();
    } catch {
      if (msg) { msg.textContent = 'Erreur lors de l\'enregistrement.'; msg.style.color = '#c0392b'; }
    }
  });

  /* ── Carousel upload ── */
  document.getElementById('carouselUploadForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    const msg = document.getElementById('carouselMsg');
    btn.disabled = true; btn.textContent = 'Upload en cours…';
    try {
      const token = sessionStorage.getItem('talentyah_token');
      const fd    = new FormData(e.target);
      const res   = await fetch(API + '/api/carousel', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + token },
        body: fd
      });
      if (res.ok) {
        if (msg) { msg.textContent = '✓ Slide ajouté !'; msg.style.color = 'var(--emerald)'; setTimeout(() => { msg.textContent = ''; }, 3000); }
        e.target.reset();
        loadCarousel();
      } else {
        const d = await res.json();
        if (msg) { msg.textContent = d.error || 'Erreur upload'; msg.style.color = '#c0392b'; }
      }
    } catch {
      if (msg) { msg.textContent = 'Erreur réseau'; msg.style.color = '#c0392b'; }
    }
    btn.disabled = false; btn.textContent = 'Ajouter ce slide →';
  });

  /* ── Publications ── */
  document.getElementById('pubForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('pubSubmitBtn');
    const msg = document.getElementById('pubMsg');
    const f   = e.target;
    const id  = document.getElementById('pub-id').value;

    btn.disabled = true; btn.textContent = 'Enregistrement…';

    // Build FormData for potential image upload
    const fd = new FormData();
    fd.append('title',    f['title'].value.trim());
    fd.append('category', f['category'].value);
    fd.append('status',   f['status'].value);
    fd.append('excerpt',  f['excerpt'].value.trim());
    fd.append('content',  f['content'].value.trim());
    if (f['img'] && f['img'].files[0]) fd.append('image', f['img'].files[0]);

    try {
      const token  = sessionStorage.getItem('talentyah_token');
      const url    = id ? `${API}/api/publications/${id}` : `${API}/api/publications`;
      const method = id ? 'PUT' : 'POST';
      const res    = await fetch(url, { method, headers: { 'Authorization': 'Bearer ' + token }, body: fd });
      if (res.ok) {
        if (msg) { msg.textContent = '✓ Publication enregistrée.'; msg.style.color = 'var(--emerald)'; setTimeout(() => { msg.textContent = ''; }, 3000); }
        resetPubForm(); loadPublications();
      } else {
        const d = await res.json();
        if (msg) { msg.textContent = d.error || 'Erreur.'; msg.style.color = '#c0392b'; }
      }
    } catch {
      // Mode démo local
      const pub = { id: id ? parseInt(id) : Date.now(), title: f['title'].value.trim(), category: f['category'].value, status: f['status'].value, excerpt: f['excerpt'].value.trim(), content: f['content'].value.trim(), image: currentPubImg || null, date: new Date().toISOString().slice(0,10) };
      if (id) { const idx = publications.findIndex(p => p.id === parseInt(id)); if (idx !== -1) publications[idx] = pub; } else { publications.unshift(pub); }
      renderPubList(); resetPubForm();
      if (msg) { msg.textContent = '✓ Enregistré (mode démo).'; msg.style.color = 'var(--emerald)'; setTimeout(() => { msg.textContent = ''; }, 3000); }
    }
    btn.disabled = false; btn.textContent = id ? 'Enregistrer les modifications →' : "Publier l'article →";
  });

  document.getElementById('pubCancelBtn')?.addEventListener('click', resetPubForm);

  document.getElementById('pub-img')?.addEventListener('change', function () {
    const file = this.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => { currentPubImg = e.target.result; updatePubImgPreview(e.target.result); };
    reader.readAsDataURL(file);
  });

  /* ── Formulaire ajout d'accès ── */
  document.getElementById('accessForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const f    = e.target;
    const msg  = document.getElementById('accessMsg');
    const btn  = f.querySelector('button[type="submit"]');
    btn.disabled = true; btn.textContent = 'Création…';

    try {
      const token = sessionStorage.getItem('talentyah_token');
      const res   = await fetch(API + '/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify({
          email:    f.email.value.trim(),
          role:     f.role.value,
          password: f.password?.value || undefined
        })
      });
      const data = await res.json();
      if (res.ok) {
        // Afficher le mot de passe temporaire généré
        if (data.tempPassword) {
          alert(`✅ Accès créé pour ${data.email}\n\nMot de passe :\n${data.tempPassword}\n\n⚠️ Notez-le — il ne sera plus affiché.`);
        } else {
          if (msg) { msg.textContent = `✓ Accès créé pour ${data.email}`; msg.style.color = 'var(--emerald)'; setTimeout(() => { msg.textContent = ''; }, 4000); }
        }
        f.reset(); loadAccessList();
      } else {
        if (msg) { msg.textContent = data.error || 'Erreur.'; msg.style.color = '#c0392b'; }
      }
    } catch {
      if (msg) { msg.textContent = 'Impossible de joindre le serveur.'; msg.style.color = '#c0392b'; }
    }
    btn.disabled = false; btn.textContent = "Créer l'accès →";
  });

  /* ── Formulaire carousel ── */
  document.getElementById('carouselForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const msg  = document.getElementById('carouselMsg');
    const btn  = e.target.querySelector('button[type="submit"]');
    const file = document.getElementById('slideImageInput')?.files[0];
    if (!file) { if (msg) { msg.textContent = 'Sélectionnez une image.'; msg.style.color='#c0392b'; } return; }
    btn.disabled = true; btn.textContent = 'Envoi en cours…';

    const fd = new FormData(e.target);

    // Récupérer les pages cochées et les envoyer proprement
    const checkedPages = [...e.target.querySelectorAll('input[name="pages"]:checked')].map(cb => cb.value);
    fd.delete('pages'); // supprimer les entrées multiples auto
    fd.append('pages', checkedPages.length ? checkedPages.join(',') : 'all');

    const token = sessionStorage.getItem('talentyah_token');
    try {
      const res = await fetch(API + '/api/carousel', {
        method: 'POST', headers: { 'Authorization': 'Bearer ' + token }, body: fd
      });
      if (res.ok) {
        if (msg) { msg.textContent = '✓ Slide ajouté !'; msg.style.color='var(--emerald)'; setTimeout(() => { msg.textContent=''; }, 3000); }
        e.target.reset();
        // Remettre "Toutes les pages" coché par défaut
        const allCb = e.target.querySelector('input[name="pages"][value="all"]');
        if (allCb) allCb.checked = true;
        loadCarousel();
      } else {
        const d = await res.json();
        if (msg) { msg.textContent = d.error || 'Erreur.'; msg.style.color='#c0392b'; }
      }
    } catch {
      if (msg) { msg.textContent = 'Impossible de joindre le serveur.'; msg.style.color='#c0392b'; }
    }
    btn.disabled = false; btn.textContent = 'Ajouter ce slide →';
  });

});

/* ══════════════════════════════
   SHOW DASHBOARD
══════════════════════════════ */
function showDashboard() {
  document.getElementById('adminLoginSection').style.display     = 'none';
  document.getElementById('adminDashboardSection').style.display = 'flex';

  // Ping keep-alive toutes les 14 min pour éviter le sleep Render (plan gratuit)
  _keepAlive();
  setInterval(_keepAlive, 14 * 60 * 1000);

  loadStats();
  loadCarousel();
  loadCandidates();
  loadCompanies();
  loadJobs();
  loadPartners();
  loadPublications();
  applyPermissions();
  initNotifications(); // démarrer les notifications
}

/* ══════════════════════════════════════════
   SYSTÈME DE NOTIFICATIONS (sans config)
   Polling toutes les 30s + Web Push API
══════════════════════════════════════════ */

let _lastCandidates = null;
let _lastCompanies  = null;
let _notifInterval  = null;

async function initNotifications() {
  // Demander permission notifications navigateur
  if ('Notification' in window && Notification.permission === 'default') {
    const perm = await Notification.requestPermission();
    if (perm === 'granted') showToast('✅ Notifications activées', 'success');
  }

  // Snapshot initial des compteurs
  try {
    const token = sessionStorage.getItem('talentyah_token');
    const res   = await fetch(API + '/api/admin/stats', { headers: { 'Authorization': 'Bearer ' + token } });
    const data  = await res.json();
    _lastCandidates = data.candidates;
    _lastCompanies  = data.companies;
  } catch {}

  // Polling toutes les 30 secondes
  clearInterval(_notifInterval);
  _notifInterval = setInterval(checkNewEntries, 30000);
}

async function checkNewEntries() {
  try {
    const token = sessionStorage.getItem('talentyah_token');
    if (!token) { clearInterval(_notifInterval); return; }

    const res  = await fetch(API + '/api/admin/stats', { headers: { 'Authorization': 'Bearer ' + token } });
    const data = await res.json();

    // Nouvelle candidature ?
    if (_lastCandidates !== null && data.candidates > _lastCandidates) {
      const n = data.candidates - _lastCandidates;
      pushNotif(
        `🧑‍💼 Nouvelle candidature${n > 1 ? 's' : ''} (${n})`,
        `${n} nouveau${n > 1 ? 'x' : ''} CV reçu${n > 1 ? 's' : ''} — cliquez pour voir`
      );
      showToast(`🧑‍💼 ${n} nouvelle${n > 1 ? 's' : ''} candidature${n > 1 ? 's' : ''} reçue${n > 1 ? 's' : ''}`, 'info');
      loadStats(); loadCandidates();
    }

    // Nouvelle demande entreprise ?
    if (_lastCompanies !== null && data.companies > _lastCompanies) {
      const n = data.companies - _lastCompanies;
      pushNotif(
        `🏢 Nouvelle demande entreprise${n > 1 ? 's' : ''} (${n})`,
        `${n} nouvelle${n > 1 ? 's' : ''} demande${n > 1 ? 's' : ''} reçue${n > 1 ? 's' : ''} — cliquez pour voir`
      );
      showToast(`🏢 ${n} nouvelle${n > 1 ? 's' : ''} demande${n > 1 ? 's' : ''} entreprise`, 'info');
      loadStats(); loadCompanies();
    }

    _lastCandidates = data.candidates;
    _lastCompanies  = data.companies;
  } catch {}
}

function pushNotif(title, body) {
  if ('Notification' in window && Notification.permission === 'granted') {
    const n = new Notification(title, {
      body,
      icon:  '/images/logos/Talentyah Logo onglet.png',
      badge: '/images/logos/Talentyah Logo onglet.png',
      tag:   'talentyah-admin',
    });
    n.onclick = () => { window.focus(); n.close(); };
  }
}

// Toast in-app (bannière en haut à droite du dashboard)
function showToast(message, type = 'info') {
  let toast = document.getElementById('adminToast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'adminToast';
    toast.style.cssText = `
      position:fixed;top:20px;right:24px;z-index:9999;
      padding:14px 20px;border-radius:8px;font-size:14px;font-weight:500;
      box-shadow:0 4px 20px rgba(0,0,0,0.15);cursor:pointer;
      transition:all .3s ease;max-width:320px;line-height:1.4;
    `;
    toast.onclick = () => { toast.style.opacity = '0'; setTimeout(() => { toast.style.display = 'none'; }, 300); };
    document.body.appendChild(toast);
  }
  const colors = {
    success: { bg:'#1a5233', color:'#fff' },
    info:    { bg:'#1a3a5c', color:'#fff' },
    error:   { bg:'#c0392b', color:'#fff' },
  };
  const c = colors[type] || colors.info;
  toast.style.background = c.bg;
  toast.style.color      = c.color;
  toast.textContent      = message;
  toast.style.display    = 'block';
  toast.style.opacity    = '1';
  clearTimeout(toast._timeout);
  toast._timeout = setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => { toast.style.display = 'none'; }, 300);
  }, 5000);
}

/* ── Chargement des stats globales depuis l'API ── */
// Ping le backend pour éviter le cold start sur Render (plan gratuit)
async function _keepAlive() {
  try { await fetch(API + '/api/health'); } catch { /* silencieux */ }
}

async function loadStats() {
  try {
    const token = sessionStorage.getItem('talentyah_token');
    const res   = await fetch(API + '/api/admin/stats', { headers: { 'Authorization': 'Bearer ' + token } });
    const data  = await res.json();
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    set('countCandidates',    data.candidates   || 0);
    set('countCompanies',     data.companies    || 0);
    set('countJobs',          data.jobs         || 0);
    set('countPublications',  data.publications || 0);
    set('countPartners',      data.partners     || 0);
  } catch { /* silencieux */ }
}

/* ══════════════════════════════
   RÔLE & PRIVILÈGES
══════════════════════════════ */

/* Décoder le rôle depuis le token (JWT réel ou token démo) */
function getUserRole() {
  const token = sessionStorage.getItem('talentyah_token');
  if (!token) return null;
  try {
    /* Token démo : "demo.<base64payload>.sig" */
    const part = token.startsWith('demo.') ? token.split('.')[1] : token.split('.')[1];
    const payload = JSON.parse(atob(part));
    return payload.role || 'editor';
  } catch {
    console.warn('Token illisible — rôle éditeur appliqué par défaut.');
    return 'editor';
  }
}

/*
  applyPermissions()
  Lit la matrice PRIVILEGES, masque les boutons nav et les panels
  non autorisés, puis active le premier panel accessible.
*/
function applyPermissions() {
  const role  = getUserRole();
  const perms = PRIVILEGES[role] || PRIVILEGES['editor'];

  /* Badge de rôle dans le footer sidebar */
  const roleUI = {
    superadmin: { label: 'Super Admin', color: '#534AB7' },
    admin:      { label: 'Admin',       color: '#0F6E56' },
    editor:     { label: 'Éditeur',     color: '#BA7517' },
  };
  const ui = roleUI[role] || roleUI['editor'];
  const roleEl = document.querySelector('.admin-user-role');
  if (roleEl) {
    roleEl.innerHTML =
      `<span style="display:inline-flex;align-items:center;gap:5px;">` +
      `<span style="width:6px;height:6px;border-radius:50%;background:${ui.color};flex-shrink:0;"></span>` +
      `${ui.label}</span>`;
  }

  /* Masquer les panels et boutons nav non autorisés */
  let firstAllowedBtn = null;
  document.querySelectorAll('.admin-nav-btn[data-panel]').forEach(btn => {
    const allowed = perms[btn.dataset.panel] !== false;
    btn.style.display = allowed ? '' : 'none';
    const panel = document.getElementById(btn.dataset.panel);
    if (panel) panel.style.display = allowed ? 'none' : 'none'; // tous cachés par défaut, le premier sera affiché après
    if (allowed && !firstAllowedBtn) firstAllowedBtn = btn;
  });

  /* Masquer le lien footer Accès & Rôles si non autorisé */
  const tabAccess = document.getElementById('tabAccess');
  if (tabAccess) tabAccess.style.display = perms['panelAccess'] ? '' : 'none';

  /* Activer le premier panel autorisé */
  if (firstAllowedBtn) {
    document.querySelectorAll('.admin-nav-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.admin-panel').forEach(p => { p.classList.remove('active'); });
    firstAllowedBtn.classList.add('active');
    const panel = document.getElementById(firstAllowedBtn.dataset.panel);
    if (panel) { panel.style.display = ''; panel.classList.add('active'); }
    const titleEl = document.getElementById('topbarTitle');
    const subEl   = document.getElementById('topbarSub');
    if (titleEl && firstAllowedBtn.dataset.title) titleEl.textContent = firstAllowedBtn.dataset.title;
    if (subEl   && firstAllowedBtn.dataset.sub)   subEl.textContent   = firstAllowedBtn.dataset.sub;
    if (firstAllowedBtn.dataset.panel === 'panelAccess') loadAccessList();
  }
}

/* ══════════════════════════════
   CANDIDATURES
══════════════════════════════ */
async function loadCandidates() {
  const tbody   = document.getElementById('candidatesTbody');
  const sector  = document.getElementById('filterSector')?.value.trim()  || '';
  const country = document.getElementById('filterCountry')?.value.trim() || '';
  if (!tbody) return;
  tbody.innerHTML = '<tr class="empty-row"><td colspan="8">Chargement…</td></tr>';

  let rows = [];
  try {
    const token  = sessionStorage.getItem('talentyah_token');
    const params = new URLSearchParams();
    if (sector)  params.append('sector', sector);
    if (country) params.append('country', country);
    const res  = await fetch(API + '/api/candidates?' + params, { headers: { 'Authorization': 'Bearer ' + token }});
    const data = await res.json();
    rows = data.candidates || data;
  } catch {
    rows = [
      { created_at:'2026-03-28', first_name:'Aminata',  last_name:'Diallo',    email:'aminata@email.com', role_target:'DAF',           country:'Sénégal',       experience_level:'Senior',   cv_url:'#' },
      { created_at:'2026-03-27', first_name:'Kwame',    last_name:'Asante',    email:'kwame@email.com',   role_target:'Chef de projet', country:'Ghana',         experience_level:'Confirmé', cv_url:'#' },
      { created_at:'2026-03-25', first_name:'Fatou',    last_name:'Ba',        email:'fatou@email.com',   role_target:'Chargée RH',    country:'France',        experience_level:'Junior',   cv_url:null },
      { created_at:'2026-03-22', first_name:'Ibrahim',  last_name:'Coulibaly', email:'ib@email.com',      role_target:'Analyste Data',  country:"Côte d'Ivoire", experience_level:'Confirmé', cv_url:'#' },
    ];
    if (sector)  rows = rows.filter(r => (r.role_target||'').toLowerCase().includes(sector.toLowerCase()));
    if (country) rows = rows.filter(r => (r.country||'').toLowerCase().includes(country.toLowerCase()));
  }

  const badge = document.getElementById('countCandidates');
  const stat1 = document.getElementById('statTotalCandidates');
  const stat2 = document.getElementById('statWithCV');
  const stat3 = document.getElementById('statCountries');
  if (badge) badge.textContent = rows.length;
  if (stat1) stat1.textContent = rows.length;
  if (stat2) stat2.textContent = rows.filter(r => r.cv_url).length;
  if (stat3) stat3.textContent = new Set(rows.map(r => r.country).filter(Boolean)).size || '—';

  if (!rows.length) {
    tbody.innerHTML = '<tr class="empty-row"><td colspan="8">Aucune candidature reçue pour le moment.</td></tr>';
    return;
  }
  tbody.innerHTML = rows.map(r => `
    <tr>
      <td style="color:var(--muted);white-space:nowrap;">${_fmtDate(r.created_at)}</td>
      <td><strong>${_esc(r.first_name)} ${_esc(r.last_name)}</strong></td>
      <td><a href="mailto:${_esc(r.email)}" style="color:var(--emerald);text-decoration:none;">${_esc(r.email)}</a></td>
      <td style="color:var(--muted);">${_esc(r.role_target || '—')}</td>
      <td style="color:var(--muted);">${_esc(r.country || '—')}</td>
      <td style="color:var(--muted);">${_esc(r.experience_level || '—')}</td>
      <td>${r.cv_url
        ? '<a href="' + API + _esc(r.cv_url) + '" target="_blank" rel="noopener" download class="badge-cv">⬇ Télécharger CV</a>'
        : '<span style="color:var(--border);">—</span>'
      }</td>
      <td>
        <button class="btn-delete" onclick="deleteCandidate(${r.id}, this)">Supprimer</button>
      </td>
    </tr>`).join('');
}

async function deleteCandidate(id, btn) {
  if (!confirm('Supprimer définitivement cette candidature ?')) return;
  btn.textContent = '…'; btn.disabled = true;
  try {
    const token = sessionStorage.getItem('talentyah_token');
    const res = await fetch(API + '/api/candidates/' + id, { method: 'DELETE', headers: { 'Authorization': 'Bearer ' + token } });
    if (!res.ok) { const d = await res.json(); alert('Erreur : ' + (d.error || res.status)); btn.textContent = 'Supprimer'; btn.disabled = false; return; }
    btn.closest('tr').remove();
    const badge = document.getElementById('countCandidates');
    if (badge) badge.textContent = Math.max(0, parseInt(badge.textContent) - 1);
  } catch { alert('Impossible de joindre le serveur.'); btn.textContent = 'Supprimer'; btn.disabled = false; }
}

/* ══════════════════════════════
   ENTREPRISES
══════════════════════════════ */
async function loadCompanies() {
  const tbody = document.getElementById('companiesTbody');
  if (!tbody) return;
  tbody.innerHTML = '<tr class="empty-row"><td colspan="8">Chargement…</td></tr>';

  let rows = [];
  try {
    const token = sessionStorage.getItem('talentyah_token');
    const res   = await fetch(API + '/api/companies', { headers: { 'Authorization': 'Bearer ' + token }});
    const data  = await res.json();
    rows = data.companies || data;
  } catch {
    rows = [
      { created_at:'2026-03-28', company_name:'Groupe Sonatel', email:'rh@sonatel.sn', region:'Dakar, Sénégal',  role_needed:'Directeur IT',  urgency:'elevee',  message:'Remplacement urgent' },
      { created_at:'2026-03-24', company_name:'Orange CI',      email:'rh@orange.ci',  region:'Abidjan, CI',     role_needed:'Chef de projet', urgency:'moyenne', message:'Création de poste'  },
      { created_at:'2026-03-20', company_name:'Africa Finance',  email:'ceo@afin.com',  region:'Paris, France',   role_needed:'RAF',            urgency:'faible',  message:'Développement'      },
    ];
  }

  const badge = document.getElementById('countCompanies');
  if (badge) badge.textContent = rows.length;

  const urgencyMap = {
    elevee:  '<span style="display:inline-block;padding:3px 8px;font-size:11px;font-weight:700;border-radius:3px;background:rgba(180,40,40,0.1);color:#b34040;border:1px solid rgba(180,40,40,0.2);">Élevée</span>',
    moyenne: '<span style="display:inline-block;padding:3px 8px;font-size:11px;font-weight:700;border-radius:3px;background:var(--gold-dim);color:#a07e28;border:1px solid var(--gold-border);">Moyenne</span>',
    faible:  '<span style="display:inline-block;padding:3px 8px;font-size:11px;font-weight:700;border-radius:3px;background:rgba(26,82,51,0.1);color:var(--emerald);border:1px solid rgba(26,82,51,0.2);">Faible</span>',
  };

  if (!rows.length) {
    tbody.innerHTML = '<tr class="empty-row"><td colspan="8">Aucune demande reçue pour le moment.</td></tr>';
    return;
  }

  // Stocker les données pour y accéder depuis showCompanyMsg
  window._companiesData = rows;

  tbody.innerHTML = rows.map((r, idx) => {
    const msgBtn = r.message
      ? '<button onclick="showCompanyMsg(' + idx + ')" style="background:none;border:1px solid var(--border);border-radius:4px;padding:4px 10px;cursor:pointer;font-size:12px;color:var(--muted);">📩 Voir message</button>'
      : '—';
    return `
    <tr>
      <td style="color:var(--muted);white-space:nowrap;">${_fmtDate(r.created_at)}</td>
      <td><strong>${_esc(r.company_name || '—')}</strong></td>
      <td>
        <a href="mailto:${_esc(r.email)}?subject=Suite à votre demande — Talentyah"
           style="color:var(--emerald);text-decoration:none;">${_esc(r.email)}</a>
      </td>
      <td style="color:var(--muted);">${_esc(r.region || '—')}</td>
      <td>${_esc(r.role_needed || '—')}</td>
      <td>${urgencyMap[r.urgency] || '—'}</td>
      <td>${msgBtn}</td>
      <td><button class="btn-delete" onclick="deleteCompany(${r.id}, this)">Supprimer</button></td>
    </tr>`;
  }).join('');
}

async function deleteCompany(id, btn) {
  if (!confirm('Supprimer définitivement cette demande entreprise ?')) return;
  btn.textContent = '…'; btn.disabled = true;
  try {
    const token = sessionStorage.getItem('talentyah_token');
    const res = await fetch(API + '/api/companies/' + id, { method: 'DELETE', headers: { 'Authorization': 'Bearer ' + token } });
    if (!res.ok) { const d = await res.json(); alert('Erreur : ' + (d.error || res.status)); btn.textContent = 'Supprimer'; btn.disabled = false; return; }
    btn.closest('tr').remove();
    const badge = document.getElementById('countCompanies');
    if (badge) badge.textContent = Math.max(0, parseInt(badge.textContent) - 1);
  } catch { alert('Impossible de joindre le serveur.'); btn.textContent = 'Supprimer'; btn.disabled = false; }
}

function showCompanyMsg(idx) {
  const r = (window._companiesData || [])[idx];
  if (!r) return;
  const modal = document.createElement('div');
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.55);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;';
  modal.innerHTML = `
    <div style="background:#fff;border-radius:12px;max-width:520px;width:100%;padding:28px;position:relative;max-height:80vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,0.3);">
      <button onclick="this.closest('[style*=fixed]').remove()"
              style="position:absolute;top:14px;right:16px;background:none;border:none;font-size:22px;cursor:pointer;color:#aaa;line-height:1;">✕</button>
      <div style="font-size:11px;color:#999;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;">Message de</div>
      <h3 style="margin:0 0 4px;font-size:18px;color:#1a2a1a;">${_esc(r.company_name || '—')}</h3>
      <a href="mailto:${_esc(r.email)}" style="color:#1a5233;font-size:13px;text-decoration:none;">${_esc(r.email)}</a>
      ${r.phone ? `<span style="color:#999;font-size:13px;margin-left:12px;">📞 ${_esc(r.phone)}</span>` : ''}
      <hr style="margin:16px 0;border:none;border-top:1px solid #eee;">
      <table style="width:100%;font-size:13px;margin-bottom:16px;">
        <tr><td style="color:#999;padding:4px 0;width:120px;">Région</td><td style="font-weight:500;">${_esc(r.region||'—')}</td></tr>
        <tr><td style="color:#999;padding:4px 0;">Poste recherché</td><td style="font-weight:500;">${_esc(r.role_needed||'—')}</td></tr>
        <tr><td style="color:#999;padding:4px 0;">Urgence</td><td style="font-weight:500;">${r.urgency||'—'}</td></tr>
      </table>
      <div style="font-size:13px;color:#666;font-weight:600;margin-bottom:8px;">Message :</div>
      <div style="white-space:pre-wrap;font-size:14px;color:#1a2a1a;line-height:1.75;background:#f8f8f8;border-radius:8px;padding:14px;">${_esc(r.message || 'Aucun message')}</div>
      <div style="margin-top:20px;">
        <a href="mailto:${_esc(r.email)}?subject=Suite à votre demande — Talentyah&body=Bonjour%2C%0A%0ANous avons bien reçu votre demande concernant le poste de ${_esc(r.role_needed||'')}. %0A%0ACordialement%2C%0AL'équipe Talentyah"
           style="display:inline-block;background:#1a5233;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-size:13px;font-weight:600;">
          ✉️ Répondre par email →
        </a>
      </div>
    </div>`;
  document.body.appendChild(modal);
  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
}

/* ══════════════════════════════
   OFFRES D'EMPLOI
══════════════════════════════ */
let adminJobsDemo = [];

async function loadJobs() {
  const container = document.getElementById('adminJobsList');
  if (!container) return;
  container.innerHTML = '<p style="color:var(--muted);font-size:14px;">Chargement…</p>';

  try {
    const res  = await fetch(API + '/api/jobs');
    const data = await res.json();
    adminJobsDemo = data.jobs || data;
  } catch {
    adminJobsDemo = (typeof JOBS_DATA !== 'undefined') ? [...JOBS_DATA] : [
      { id:1, title:'Responsable Administratif et Financier', city:'Dakar',   country:'Sénégal',       contract_type:'CDI',      sector:'Finance', salary:'2 500–3 500 EUR/mois', created_at:'2026-03-01' },
      { id:2, title:'Chargé(e) des Ressources Humaines',     city:'Abidjan', country:"Côte d'Ivoire", contract_type:'CDD',      sector:'RH',      salary:'1 200–1 800 EUR/mois', created_at:'2026-02-15' },
      { id:3, title:'Business Analyst – Data & Reporting',   city:'Nairobi', country:'Kenya',         contract_type:'Freelance',sector:'Tech',    salary:'250–350 EUR/jour',     created_at:'2026-02-01' },
    ];
  }

  const badge = document.getElementById('countJobs');
  if (badge) badge.textContent = adminJobsDemo.length;
  renderAdminJobs(adminJobsDemo);
}

function renderAdminJobs(jobs) {
  const container = document.getElementById('adminJobsList');
  if (!container) return;
  if (!jobs || !jobs.length) {
    container.innerHTML = '<p style="color:var(--muted);font-size:14px;">Aucune offre publiée.</p>';
    return;
  }
  container.innerHTML = jobs.map((j, i) => `
    <div class="admin-job-row">
      <div>
        <div class="admin-job-title">${_esc(j.title)}</div>
        <div class="admin-job-meta">
          <span>📍 ${_esc([j.city, j.country].filter(Boolean).join(', ') || '—')}</span>
          <span>🗂 ${_esc(j.contract_type || '—')}</span>
          <span>💼 ${_esc(j.sector || '—')}</span>
          ${j.salary ? '<span>💶 ' + _esc(j.salary) + '</span>' : ''}
        </div>
      </div>
      <button class="btn-delete" type="button" onclick="deleteJob(${i}, ${j.id || 'null'})">Supprimer</button>
    </div>
  `).join('');
}

async function deleteJob(index, id) {
  if (!confirm('Supprimer cette offre définitivement ?')) return;
  if (!id) return;
  try {
    const token = sessionStorage.getItem('talentyah_token');
    const res = await fetch(API + '/api/jobs/' + id, { method: 'DELETE', headers: { 'Authorization': 'Bearer ' + token }});
    if (!res.ok) { const d = await res.json(); alert('Erreur : ' + (d.error || res.status)); return; }
    adminJobsDemo.splice(index, 1);
    const badge = document.getElementById('countJobs');
    if (badge) badge.textContent = adminJobsDemo.length;
    renderAdminJobs(adminJobsDemo);
  } catch { alert('Impossible de joindre le serveur. Vérifiez votre connexion.'); }
}

/* ══════════════════════════════
   CAROUSEL
══════════════════════════════ */
/* ══════════════════════════════
   PARTENAIRES
══════════════════════════════ */
let partners = [
  { name:'Orange Africa',   desc:'Télécommunications',  img:null },
  { name:'Ecobank',         desc:'Services financiers', img:null },
  { name:'NSIA Banque',     desc:'Banque & Assurances', img:null },
  { name:'Africa Finance',  desc:'Conseil & Finance',   img:null },
];

/* ══════════════════════════════
   CAROUSEL
══════════════════════════════ */

async function loadCarousel() {
  const token = sessionStorage.getItem('talentyah_token');
  try {
    const res  = await fetch(API + '/api/carousel/all', { headers: { 'Authorization': 'Bearer ' + token } });
    const data = await res.json();
    const slides = data.slides || [];
    const badge  = document.getElementById('countCarousel');
    if (badge) badge.textContent = slides.length;
    renderCarouselList(slides);
  } catch {
    const list = document.getElementById('carouselList');
    if (list) list.innerHTML = '<p style="color:var(--muted);font-size:14px;">Impossible de charger les slides.</p>';
  }
}

function renderCarouselList(slides) {
  const list = document.getElementById('carouselList');
  if (!list) return;
  if (!slides.length) {
    list.innerHTML = '<p style="color:var(--muted);font-size:14px;">Aucun slide. Ajoutez-en un ci-dessus.</p>';
    return;
  }

  const pageLabels = {
    all: 'Toutes', index: 'Accueil', talents: 'Talents',
    entreprises: 'Entreprises', carrieres: 'Carrières',
    apropos: 'À propos', 'notre-approche': 'Notre approche', ressources: 'Ressources'
  };

  list.innerHTML = slides.map(s => {
    const pagesList = (s.pages || 'all').split(',').map(p => p.trim());
    const pagesBadges = pagesList.map(p =>
      `<span style="font-size:11px;padding:2px 8px;background:rgba(26,82,51,0.08);color:var(--emerald);border-radius:10px;border:1px solid rgba(26,82,51,0.15);">${pageLabels[p] || p}</span>`
    ).join('');

    return `
    <div style="display:grid;grid-template-columns:120px 1fr auto;gap:16px;align-items:center;background:#fff;border:1px solid var(--border);border-radius:8px;padding:12px 16px;">
      <img src="${API}${s.image_url}" alt="${_esc(s.title)}"
           style="width:120px;height:70px;object-fit:cover;border-radius:6px;background:#eee;">
      <div>
        <div style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;">${_esc(s.eyebrow||'')}</div>
        <div style="font-weight:600;color:var(--dark);font-size:14px;margin:2px 0;">${_esc(s.title||'')}</div>
        <div style="font-size:12px;color:var(--muted);margin-bottom:6px;">${_esc((s.subtitle||'').substring(0,60))}${s.subtitle&&s.subtitle.length>60?'…':''}</div>
        <div style="display:flex;flex-wrap:wrap;gap:4px;">${pagesBadges}</div>
      </div>
      <div style="display:flex;flex-direction:column;gap:6px;align-items:flex-end;">
        <span style="font-size:11px;padding:3px 8px;border-radius:12px;background:${s.active?'#e8f5e9':'#f5f5f5'};color:${s.active?'var(--emerald)':'var(--muted)'};">${s.active?'Actif':'Masqué'}</span>
        <button class="btn-delete" onclick="deleteSlide(${s.id})" style="font-size:12px;padding:5px 12px;">Supprimer</button>
      </div>
    </div>`;
  }).join('');
}

async function deleteSlide(id) {
  if (!confirm('Supprimer ce slide ?')) return;
  const token = sessionStorage.getItem('talentyah_token');
  try {
    await fetch(API + '/api/carousel/' + id, { method: 'DELETE', headers: { 'Authorization': 'Bearer ' + token } });
    loadCarousel();
  } catch { alert('Erreur lors de la suppression.'); }
}

async function loadPartners() {
  try {
    const token = sessionStorage.getItem('talentyah_token');
    const res   = await fetch(API + '/api/partners/all', { headers: { 'Authorization': 'Bearer ' + token } });
    const data  = await res.json();
    partners = (data.partners || []).map(p => ({ id: p.id, name: p.name, desc: p.description || '', img: p.image_url || null }));
  } catch { /* garde les données locales */ }
  const badge = document.getElementById('countPartners');
  if (badge) badge.textContent = partners.length;
  renderPartnersGrid();
  renderPartnerNames();
}

function initPartners() { loadPartners(); }

function renderPartnersGrid() {
  const grid = document.getElementById('partnersGrid');
  if (!grid) return;
  grid.innerHTML = partners.map((p, i) => {
    // Construire l'URL complète de l'image
    let imgSrc = null;
    if (p.img) {
      if (p.img.startsWith('data:') || p.img.startsWith('http')) {
        imgSrc = p.img;
      } else {
        imgSrc = 'https://talentyah-website.onrender.com' + p.img;
      }
    }
    return `
    <div class="partner-slot ${imgSrc ? 'filled' : ''}" id="pslot-${i}">
      <input type="file" accept="image/*" onchange="handlePartnerImg(this, ${i})">
      ${imgSrc
        ? `<img src="${imgSrc}" alt="${_esc(p.name)}" onerror="this.style.display='none'"><button class="partner-remove" onclick="removePartnerImg(event,${i})">✕</button>`
        : `<div class="partner-slot-placeholder"><svg viewBox="0 0 24 24" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg><span>${_esc(p.name)}</span></div>`
      }
    </div>`;
  }).join('');
}

function renderPartnerNames() {
  const list = document.getElementById('partnerNamesList');
  if (!list) return;
  list.innerHTML = partners.map((p, i) => `
    <div style="display:grid;grid-template-columns:1fr 1fr auto;gap:10px;align-items:center;">
      <input type="text" class="admin-filter-input" placeholder="Nom du partenaire"
             value="${_esc(p.name)}" style="margin:0;" oninput="partners[${i}].name=this.value">
      <input type="text" class="admin-filter-input" placeholder="Description (optionnel)"
             value="${_esc(p.desc)}" style="margin:0;" oninput="partners[${i}].desc=this.value">
      <button class="btn-delete" onclick="removePartner(${i})">Retirer</button>
    </div>
  `).join('');
}

async function handlePartnerImg(input, i) {
  const file = input.files[0];
  if (!file) return;

  // Aperçu local immédiat
  const reader = new FileReader();
  reader.onload = (e) => { partners[i].img = e.target.result; renderPartnersGrid(); renderPartnerNames(); };
  reader.readAsDataURL(file);

  // Upload réel au backend si le partenaire a un id
  if (partners[i].id) {
    try {
      const token = sessionStorage.getItem('talentyah_token');
      const fd = new FormData();
      fd.append('image', file);
      fd.append('name', partners[i].name);
      const res = await fetch(API + '/api/partners/' + partners[i].id, {
        method: 'PUT',
        headers: { 'Authorization': 'Bearer ' + token },
        body: fd
      });
      if (res.ok) {
        const data = await res.json();
        partners[i].img = data.image_url; // URL serveur
      }
    } catch { /* garde l'aperçu local */ }
  }
}

function removePartnerImg(e, i) {
  e.preventDefault(); e.stopPropagation();
  partners[i].img = null; renderPartnersGrid();
}

async function removePartner(i) {
  if (!confirm('Supprimer ce partenaire ?')) return;
  const p = partners[i];
  // Supprimer en DB si le partenaire a un id
  if (p.id) {
    try {
      const token = sessionStorage.getItem('talentyah_token');
      await fetch(API + '/api/partners/' + p.id, {
        method: 'DELETE',
        headers: { 'Authorization': 'Bearer ' + token }
      });
    } catch { /* silencieux */ }
  }
  partners.splice(i, 1);
  const badge = document.getElementById('countPartners');
  if (badge) badge.textContent = partners.length;
  renderPartnersGrid(); renderPartnerNames();
}

/* ══════════════════════════════
   PUBLICATIONS
══════════════════════════════ */
let publications = [
  { id:1, title:'Comment réussir sa mobilité internationale en Afrique', category:'Conseil carrière', status:'published', excerpt:"Les clés pour préparer et réussir un projet de relocation professionnelle...", content:'', image:null, date:'2026-03-15' },
  { id:2, title:"Les profils les plus recherchés en Afrique de l'Ouest en 2026", category:"Marché de l'emploi", status:'published', excerpt:'Analyse des tendances de recrutement et des compétences en forte demande...', content:'', image:null, date:'2026-03-01' },
  { id:3, title:"Brouillon : Guide de l'entretien en visioconférence", category:'Conseil carrière', status:'draft', excerpt:'', content:'', image:null, date:'2026-03-28' },
];

let currentPubImg = null;

async function loadPublications() {
  try {
    const token = sessionStorage.getItem('talentyah_token');
    const res   = await fetch(API + '/api/publications/all', { headers: { 'Authorization': 'Bearer ' + token } });
    const data  = await res.json();
    // Normalize API response to match local format (image_url→image, published_at→date)
    publications = (data.publications || []).map(p => ({
      id:       p.id,
      title:    p.title,
      category: p.category,
      status:   p.status,
      excerpt:  p.excerpt || '',
      content:  p.content || '',
      image:    p.image_url || null,
      date:     p.published_at || p.created_at || '',
    }));
  } catch { /* garde les données locales */ }
  const badge = document.getElementById('countPublications');
  if (badge) badge.textContent = publications.length;
  renderPubList();
}

function initPublications() { loadPublications(); }

function renderPubList() {
  const container = document.getElementById('pubList');
  if (!container) return;
  const badge = document.getElementById('countPublications');
  if (badge) badge.textContent = publications.length;

  if (!publications.length) {
    container.innerHTML = '<p style="color:var(--muted);font-size:14px;">Aucune publication.</p>';
    return;
  }
  container.innerHTML = publications.map((p, i) => `
    <div class="pub-card">
      <div class="pub-card-header">
        <div style="flex:1;">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px;">
            <div class="pub-card-title">${_esc(p.title)}</div>
            <span class="pub-status ${p.status === 'published' ? 'published' : 'draft'}">
              ${p.status === 'published' ? '● Publié' : '◌ Brouillon'}
            </span>
          </div>
          <div class="pub-card-meta">
            <span>🗂 ${_esc(p.category)}</span>
            <span>📅 ${new Date(p.date).toLocaleDateString('fr-FR')}</span>
          </div>
          ${p.excerpt ? '<div class="pub-card-excerpt">' + _esc(p.excerpt.substring(0, 120)) + '…</div>' : ''}
        </div>
        ${p.image
          ? '<img src="' + p.image + '" class="pub-card-img" alt="">'
          : '<div class="pub-card-img-placeholder"><span style="font-size:10px;text-align:center;line-height:1.4;">Pas<br>d\'image</span></div>'
        }
      </div>
      <div class="pub-actions">
        <button class="btn-edit-pub" onclick="editPub(${i})">✎ Modifier</button>
        <button class="btn-edit-pub" onclick="togglePubStatus(${i})"
                style="color:${p.status === 'published' ? 'var(--muted)' : 'var(--emerald)'}">
          ${p.status === 'published' ? 'Dépublier' : 'Publier'}
        </button>
        <button class="btn-delete" onclick="deletePub(${i})">Supprimer</button>
      </div>
    </div>
  `).join('');
}

function editPub(i) {
  const p = publications[i];
  document.getElementById('pub-id').value       = p.id;
  document.getElementById('pub-title').value    = p.title;
  document.getElementById('pub-category').value = p.category;
  document.getElementById('pub-status').value   = p.status;
  document.getElementById('pub-excerpt').value  = p.excerpt;
  document.getElementById('pub-content').value  = p.content;
  document.getElementById('pubFormTitle').textContent  = 'Modifier la publication';
  document.getElementById('pubSubmitBtn').textContent  = 'Enregistrer les modifications →';
  document.getElementById('pubCancelBtn').style.display = 'inline-flex';
  currentPubImg = p.image;
  document.getElementById('pub-title').scrollIntoView({ behavior:'smooth', block:'center' });
}

async function togglePubStatus(i) {
  publications[i].status = publications[i].status === 'published' ? 'draft' : 'published';
  renderPubList();
  try {
    const token = sessionStorage.getItem('talentyah_token');
    await fetch(API + '/api/publications/' + publications[i].id + '/status', {
      method: 'PATCH', headers: { 'Authorization': 'Bearer ' + token }
    });
  } catch { /* silencieux */ }
}

async function deletePub(i) {
  if (!confirm('Supprimer cette publication ?')) return;
  const pub = publications[i];
  if (!pub) return;
  try {
    const token = sessionStorage.getItem('talentyah_token');
    const res = await fetch(API + '/api/publications/' + pub.id, {
      method: 'DELETE', headers: { 'Authorization': 'Bearer ' + token }
    });
    if (!res.ok) { const d = await res.json(); alert('Erreur : ' + (d.error || res.status)); return; }
    publications.splice(i, 1); renderPubList();
    const badge = document.getElementById('countPublications');
    if (badge) badge.textContent = publications.length;
  } catch { alert('Impossible de joindre le serveur.'); }
}

function resetPubForm() {
  document.getElementById('pubForm').reset();
  document.getElementById('pub-id').value = '';
  document.getElementById('pubFormTitle').textContent   = 'Nouvelle publication';
  document.getElementById('pubSubmitBtn').textContent   = "Publier l'article →";
  document.getElementById('pubCancelBtn').style.display = 'none';
  currentPubImg = null;
  updatePubImgPreview(null);
}

function updatePubImgPreview(src) {
  const wrap = document.getElementById('pubImgPreviewWrap');
  if (!wrap) return;
  if (src) {
    wrap.innerHTML = '<div style="position:relative;display:inline-block;"><img src="' + src + '" style="max-height:120px;border-radius:4px;border:1px solid var(--border);" alt="Aperçu"><button type="button" onclick="currentPubImg=null;updatePubImgPreview(null)" style="position:absolute;top:-8px;right:-8px;width:22px;height:22px;background:#b34040;border:none;border-radius:50%;cursor:pointer;color:#fff;font-size:12px;font-weight:700;display:flex;align-items:center;justify-content:center;">✕</button></div>';
  } else {
    wrap.innerHTML = '<div class="img-upload-icon"><svg viewBox="0 0 24 24" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg></div><div class="img-upload-label"><strong>Cliquez pour ajouter</strong> une image de couverture</div><div style="font-size:12px;color:var(--muted);margin-top:4px;">JPG, PNG — recommandé 1200×630 px</div>';
  }
}

/* ══════════════════════════════
   GESTION DES ACCÈS (superadmin uniquement)
══════════════════════════════ */
async function loadAccessList() {
  const list = document.getElementById('accessList');
  if (!list) return;
  list.innerHTML = '<tr class="empty-row"><td colspan="3">Chargement…</td></tr>';

  try {
    const token = sessionStorage.getItem('talentyah_token');
    const res   = await fetch(API + '/api/admin/users', {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    const users = await res.json();
    renderAccessList(users);
  } catch {
    renderAccessList([
      { id: 1, email: 'admin@talentyah.com',   role: 'superadmin' },
      { id: 2, email: 'manager@talentyah.com', role: 'admin'      },
      { id: 3, email: 'editor@talentyah.com',  role: 'editor'     },
    ]);
  }
}

function renderAccessList(users) {
  const list = document.getElementById('accessList');
  if (!list) return;

  const roleStyle = {
    superadmin: 'background:rgba(83,74,183,0.1);color:#534AB7;border:1px solid rgba(83,74,183,0.25)',
    admin:      'background:rgba(15,110,86,0.1);color:#0F6E56;border:1px solid rgba(15,110,86,0.25)',
    editor:     'background:rgba(186,117,23,0.1);color:#BA7517;border:1px solid rgba(186,117,23,0.25)',
  };
  const roleLabel = { superadmin: 'Super Admin', admin: 'Admin', editor: 'Éditeur' };

  list.innerHTML = users.map(u => {
    const s = roleStyle[u.role] || roleStyle['editor'];
    const isSelf = u.email === sessionStorage.getItem('talentyah_email');
    return `<tr>
      <td>
        <strong>${_esc(u.email)}</strong>
        ${isSelf ? '<span style="font-size:10px;color:var(--muted);margin-left:6px;">(vous)</span>' : ''}
      </td>
      <td><span style="display:inline-flex;align-items:center;gap:5px;padding:3px 9px;font-size:11px;font-weight:600;border-radius:4px;${s}">${roleLabel[u.role] || u.role}</span></td>
      <td style="display:flex;gap:6px;flex-wrap:wrap;">
        <button onclick="resetPassword(${u.id}, '${_esc(u.email)}')"
                style="background:none;border:1px solid var(--border);border-radius:4px;padding:4px 10px;cursor:pointer;font-size:12px;color:var(--dark);">
          🔑 Réinitialiser
        </button>
        ${u.role !== 'superadmin' && !isSelf
          ? `<button class="btn-delete" onclick="deleteAccess(${u.id})" style="font-size:12px;padding:4px 10px;">Révoquer</button>`
          : ''
        }
      </td>
    </tr>`;
  }).join('');
}

async function resetPassword(id, email) {
  const newPwd = prompt(`Nouveau mot de passe pour ${email} :\n(laisser vide pour générer automatiquement)`);
  if (newPwd === null) return;

  const token = sessionStorage.getItem('talentyah_token');

  // Avertir si le serveur est en cold start (Render plan gratuit)
  const loadingAlert = setTimeout(() => {
    console.log('[Talentyah] Serveur en démarrage, patience…');
  }, 3000);

  try {
    const controller = new AbortController();
    const timeout    = setTimeout(() => controller.abort(), 60000); // 60s timeout

    const res = await fetch(API + '/api/admin/reset-password/' + id, {
      method:  'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body:    JSON.stringify({ password: newPwd || undefined }),
      signal:  controller.signal,
    });
    clearTimeout(timeout);
    clearTimeout(loadingAlert);

    const data = await res.json();
    if (res.ok) {
      alert(`✅ Mot de passe réinitialisé pour ${data.email}\n\nNouveau mot de passe :\n${data.tempPassword}\n\nCommuniquez-le à l'utilisateur.`);
    } else {
      alert('Erreur : ' + (data.error || 'Impossible de réinitialiser'));
    }
  } catch (err) {
    clearTimeout(loadingAlert);
    if (err.name === 'AbortError') {
      alert('⏱ Le serveur met trop de temps à répondre (cold start Render).\nAttendez 30 secondes et réessayez.');
    } else {
      alert('Impossible de joindre le serveur.\nVérifiez que le backend Render est bien déployé.');
    }
  }
}

async function deleteAccess(id) {
  if (!confirm('Révoquer cet accès définitivement ?')) return;
  try {
    const token = sessionStorage.getItem('talentyah_token');
    await fetch(API + '/api/admin/users/' + id, {
      method: 'DELETE',
      headers: { 'Authorization': 'Bearer ' + token }
    });
  } catch { /* silencieux en démo */ }
  loadAccessList();
}

/* ══════════════════════════════
   HELPERS
══════════════════════════════ */
function _fmtDate(d) {
  if (!d) return '—';
  const dt = new Date(d);
  return isNaN(dt) ? '—' : dt.toLocaleDateString('fr-FR', { day:'2-digit', month:'short', year:'numeric' });
}
function _esc(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}