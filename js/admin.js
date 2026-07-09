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
const PRIVILEGES = {
  superadmin: {
    panelCandidates:   true,
    panelCompanies:    true,
    panelJobs:         true,
    panelCarousel:     true,
    panelPartners:     true,
    panelPublications: true,
    panelAccess:       true,
    panelCRM:          true,
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
let quillEditor; // Variable globale pour l'éditeur (Publications)
let jobDescQuill, jobReqsQuill; // Éditeurs riches pour l'offre d'emploi
document.addEventListener('DOMContentLoaded', () => {

  // Initialisation de Quill.js (protégée : une erreur ici ne doit pas
  // empêcher le reste de l'initialisation, ex. le formulaire "Offres")
  try {
    if (document.getElementById('pub-content-editor') && typeof Quill !== 'undefined') {
      quillEditor = new Quill('#pub-content-editor', {
        theme: 'snow',
        placeholder: 'Rédigez votre article ici...',
        modules: {
          toolbar: [
            [{ 'header': [1, 2, 3, false] }],
            ['bold', 'italic', 'underline', 'strike'],
            [{ 'list': 'ordered'}, { 'list': 'bullet' }],
            ['link', 'blockquote'],
            ['clean'] // Bouton pour enlever le formatage
          ]
        }
      });
    } else if (document.getElementById('pub-content-editor')) {
      console.warn('Quill.js ne s\'est pas chargé (CDN indisponible) — l\'éditeur de blog sera désactivé, le reste de l\'admin fonctionne normalement.');
    }

    // Éditeurs riches pour "Description du poste" et "Profil recherché / Exigences"
    const jobRichToolbar = [
      ['bold', 'italic', 'underline'],
      [{ 'list': 'ordered' }, { 'list': 'bullet' }],
      ['clean']
    ];
    if (document.getElementById('job-desc-editor') && typeof Quill !== 'undefined') {
      jobDescQuill = new Quill('#job-desc-editor', {
        theme: 'snow',
        placeholder: 'Décrivez le rôle, les missions, le contexte…',
        modules: { toolbar: jobRichToolbar }
      });
    }
    if (document.getElementById('job-reqs-editor') && typeof Quill !== 'undefined') {
      jobReqsQuill = new Quill('#job-reqs-editor', {
        theme: 'snow',
        placeholder: 'Expérience, diplômes, compétences clés…',
        modules: { toolbar: jobRichToolbar }
      });
    }
  } catch (err) {
    console.error('Erreur d\'initialisation de Quill.js :', err);
  }

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

      try {
        const res  = await fetch(API + '/api/admin/login', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (res.ok && data.token) {
          sessionStorage.setItem('talentyah_token', data.token);
          sessionStorage.setItem('talentyah_email', email);
          showDashboard();
        } else {
          if (msgEl) { msgEl.textContent = 'Email ou mot de passe incorrect.'; msgEl.style.color = '#c0392b'; }
          btn.textContent = 'Se connecter'; btn.disabled = false;
        }
      } catch {
        /* Mode démo : vérification locale */
        const account = DEMO_ACCOUNTS[email];
        if (account && account.password === password) {
          /* Faux token encodé avec le rôle */
          const fakePayload = btoa(JSON.stringify({ email, role: account.role }));
          sessionStorage.setItem('talentyah_token', 'demo.' + fakePayload + '.sig');
          showDashboard();
        } else {
          if (msgEl) {
            msgEl.innerHTML =
              'Identifiants incorrects.<br>' +
              '<span style="font-size:11px;opacity:.75;">' +
              'Démo : admin@talentyah.com/admin &nbsp;·&nbsp; manager@talentyah.com/manager &nbsp;·&nbsp; editor@talentyah.com/editor' +
              '</span>';
            msgEl.style.color = '#c0392b';
          }
          btn.textContent = 'Se connecter'; btn.disabled = false;
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
        panelCRM:          loadCRM,
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
      const idVal = document.getElementById('job-id').value;
      
      btn.textContent = idVal ? 'Mise à jour…' : 'Publication…'; 
      btn.disabled = true;

      // Récupère le contenu formaté (gras, italique, listes…) des éditeurs riches
      const descHtml = jobDescQuill ? jobDescQuill.root.innerHTML.trim() : jobForm.description.value.trim();
      const reqsHtml = jobReqsQuill ? jobReqsQuill.root.innerHTML.trim() : jobForm.requirements.value.trim();
      const descEmpty = jobDescQuill ? jobDescQuill.getText().trim() === '' : descHtml === '';
      const reqsEmpty = jobReqsQuill ? jobReqsQuill.getText().trim() === '' : reqsHtml === '';

      const payload = {
        title:         jobForm.title.value.trim(),
        city:          jobForm.city?.value.trim() || '',
        country:       jobForm.country?.value.trim() || '',
        sector:        jobForm.sector.value.trim(),
        contract_type: jobForm.contract_type.value,
        salary:        jobForm.salary?.value.trim() || '',
        tags:          (jobForm.tags?.value || '').split(',').map(t => t.trim()).filter(Boolean),
        description:   descEmpty ? '' : descHtml,
        requirements:  reqsEmpty ? '' : reqsHtml,
        is_new:        idVal ? false : true,
      };

      try {
        const token = sessionStorage.getItem('talentyah_token');
        // Si idVal existe, on fait un PUT sur /api/jobs/:id, sinon un POST classique
        const url = idVal ? `${API}/api/jobs/${idVal}` : `${API}/api/jobs`;
        const method = idVal ? 'PUT' : 'POST';

        const res = await fetch(url, {
          method: method,
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          if (msg) { 
            msg.textContent = idVal ? '✓ Offre mise à jour avec succès !' : '✓ Offre publiée avec succès !'; 
            msg.style.color = 'var(--emerald)'; 
          }
          resetJobForm(); loadJobs();
        } else {
          const d = await res.json();
          if (msg) { msg.textContent = d.error || 'Erreur lors de l\'opération.'; msg.style.color = '#c0392b'; }
        }
      } catch {
        // Fallback Mode Démo local
        if (idVal) {
          // Mode modification en démo
          const idx = adminJobsDemo.findIndex(j => j.id == idVal || adminJobsDemo.indexOf(j) == idVal);
          if (idx !== -1) {
            adminJobsDemo[idx] = { ...adminJobsDemo[idx], ...payload };
          }
          if (msg) { msg.textContent = '✓ Offre modifiée (mode démo).'; msg.style.color = 'var(--emerald)'; }
        } else {
          // Mode ajout en démo
          adminJobsDemo.unshift({ ...payload, id: Date.now(), created_at: new Date().toISOString() });
          if (msg) { msg.textContent = '✓ Offre ajoutée (mode démo).'; msg.style.color = 'var(--emerald)'; }
        }
        renderAdminJobs(adminJobsDemo);
        resetJobForm();
      }
      btn.disabled = false;
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
    const contentHtml = quillEditor ? quillEditor.root.innerHTML.trim() : '';

    btn.disabled = true; btn.textContent = 'Enregistrement…';

    // Build FormData for potential image upload
    const fd = new FormData();
    fd.append('title',    f['title'].value.trim());
    fd.append('category', f['category'].value);
    fd.append('status',   f['status'].value);
    fd.append('excerpt',  f['excerpt'].value.trim());
    fd.append('content',  contentHtml);
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
      const pub = { id: id ? parseInt(id) : Date.now(), title: f['title'].value.trim(), category: f['category'].value, status: f['status'].value, excerpt: f['excerpt'].value.trim(), content: contentHtml, image: currentPubImg || null, date: new Date().toISOString().slice(0,10) };
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
  loadStats();
  loadCarousel();
  loadCandidates();
  loadCompanies();
  loadJobs();
  loadPartners();
  loadPublications();
  loadCRM();
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
    if (perm === 'granted') showToast
    ('✅ Notifications activées', 'success');
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
    if (panel) {
      // On cache complètement si non autorisé, sinon on retire le display inline
      panel.style.display = allowed ? 'none' : 'none'; 
    }
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


// URL du CV — Supabase Storage = URL publique directe
function _fixCvUrl(url) {
  if (!url) return '#';
  return url.startsWith('http') ? url : API + url;
}

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
        ? '<a href="' + _fixCvUrl(r.cv_url) + '" target="_blank" rel="noopener" class="badge-cv">⬇ Télécharger CV</a>'
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
    await fetch(API + '/api/candidates/' + id, { method: 'DELETE', headers: { 'Authorization': 'Bearer ' + token } });
  } catch { /* silencieux */ }
  btn.closest('tr').remove();
  const badge = document.getElementById('countCandidates');
  if (badge) badge.textContent = Math.max(0, parseInt(badge.textContent) - 1);
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
    await fetch(API + '/api/companies/' + id, { method: 'DELETE', headers: { 'Authorization': 'Bearer ' + token } });
  } catch { /* silencieux */ }
  btn.closest('tr').remove();
  const badge = document.getElementById('countCompanies');
  if (badge) badge.textContent = Math.max(0, parseInt(badge.textContent) - 1);
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
    <div class="admin-job-row" style="display: grid; grid-template-columns: 1fr auto; align-items: center; gap: 16px; background: #fff; border: 1px solid var(--border); border-radius: var(--radius); padding: 18px 20px; margin-bottom: 12px;">
      <div>
        <div class="admin-job-title" style="font-size: 15px; font-weight: 600; color: var(--dark); margin-bottom: 3px;">${_esc(j.title)}</div>
        <div class="admin-job-meta" style="font-size: 12px; color: var(--muted); display: flex; gap: 12px; flex-wrap: wrap;">
          <span>📍 ${_esc([j.city, j.country].filter(Boolean).join(', ') || '—')}</span>
          <span>🗂 ${_esc(j.contract_type || '—')}</span>
          <span>💼 ${_esc(j.sector || '—')}</span>
          ${j.salary ? '<span>💶 ' + _esc(j.salary) + '</span>' : ''}
        </div>
      </div>
      <div style="display: flex; gap: 8px;">
        <button class="btn-edit-pub" type="button" onclick="editJob(${i})" style="padding: 7px 14px; background: transparent; border: 1px solid var(--border); border-radius: 6px; color: var(--mid); font-size: 12px; font-weight: 600; cursor: pointer;">✎ Modifier</button>
        <button class="btn-delete" type="button" onclick="deleteJob(${i}, ${j.id || 'null'})">Supprimer</button>
      </div>
    </div>
  `).join('');
}

// Charger une offre existante dans le formulaire pour la modifier
function editJob(index) {
  const j = adminJobsDemo[index];
  const form = document.getElementById('jobForm');
  if (!form) return;

  // Remplissage des champs du formulaire
  document.getElementById('job-id').value = j.id || index;
  form.title.value = j.title || '';
  form.city.value = j.city || '';
  form.country.value = j.country || '';
  form.sector.value = j.sector || '';
  form.contract_type.value = j.contract_type || '';
  form.salary.value = j.salary || '';
  form.tags.value = Array.isArray(j.tags) ? j.tags.join(', ') : (j.tags || '');
  if (jobDescQuill) {
    jobDescQuill.setContents([]);
    jobDescQuill.clipboard.dangerouslyPasteHTML(j.description || '');
  }
  if (jobReqsQuill) {
    jobReqsQuill.setContents([]);
    jobReqsQuill.clipboard.dangerouslyPasteHTML(j.requirements || '');
  }

  // Adapter les textes des boutons
  const submitBtn = form.querySelector('.btn-publish-gold');
  if (submitBtn) submitBtn.textContent = "Enregistrer les modifications";

  // Optionnel : ajouter un bouton d'annulation s'il n'existe pas encore
  if (!document.getElementById('jobCancelBtn')) {
    const cancelBtn = document.createElement('button');
    cancelBtn.type = "button";
    cancelBtn.id = "jobCancelBtn";
    cancelBtn.className = "btn-filter btn-reset";
    cancelBtn.style = "background:transparent; color:var(--muted); border:1px solid var(--border); margin-left: 10px; padding: 12px 24px; border-radius: 6px; font-weight: 600; cursor: pointer;";
    cancelBtn.textContent = "Annuler";
    cancelBtn.addEventListener('click', resetJobForm);
    form.querySelector('.job-form-actions').appendChild(cancelBtn);
  }

  // Remonter en douceur vers le formulaire
  form.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// Réinitialiser le formulaire d'offre
function resetJobForm() {
  const form = document.getElementById('jobForm');
  if (!form) return;
  form.reset();
  document.getElementById('job-id').value = '';
  if (jobDescQuill) jobDescQuill.setContents([]);
  if (jobReqsQuill) jobReqsQuill.setContents([]);
  
  const submitBtn = form.querySelector('.btn-publish-gold');
  if (submitBtn) submitBtn.textContent = "Publier l'offre";

  const cancelBtn = document.getElementById('jobCancelBtn');
  if (cancelBtn) cancelBtn.remove();
}

async function deleteJob(index, id) {
  if (!confirm('Supprimer cette offre définitivement ?')) return;
  try {
    const token = sessionStorage.getItem('talentyah_token');
    if (id) await fetch(API + '/api/jobs/' + id, { method: 'DELETE', headers: { 'Authorization': 'Bearer ' + token }});
  } catch { /* silencieux en démo */ }
  adminJobsDemo.splice(index, 1);
  const badge = document.getElementById('countJobs');
  if (badge) badge.textContent = adminJobsDemo.length;
  renderAdminJobs(adminJobsDemo);
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
      <img src="${s.image_url && s.image_url.startsWith('http') ? s.image_url : API + s.image_url}" alt="${_esc(s.title)}"
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
        imgSrc = p.img.startsWith('http') ? p.img : 'https://talentyah-website.onrender.com' + p.img;
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

// Insérer le contenu dans Quill
  if (quillEditor) {
    quillEditor.clipboard.dangerouslyPasteHTML(p.content || '');
  }

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
  const id = publications[i].id;
  publications.splice(i, 1); renderPubList();
  try {
    const token = sessionStorage.getItem('talentyah_token');
    await fetch(API + '/api/publications/' + id, {
      method: 'DELETE', headers: { 'Authorization': 'Bearer ' + token }
    });
  } catch { /* silencieux */ }
}

function resetPubForm() {
  document.getElementById('pubForm').reset();
  document.getElementById('pub-id').value = '';
  document.getElementById('pubFormTitle').textContent   = 'Nouvelle publication';
  document.getElementById('pubSubmitBtn').textContent   = "Publier l'article →";
  document.getElementById('pubCancelBtn').style.display = 'none';
  currentPubImg = null;
  updatePubImgPreview(null);

  // Vider l'éditeur Quill
  if (quillEditor) {
    quillEditor.setContents([]);
  }
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
  if (newPwd === null) return; // annulé

  try {
    const token = sessionStorage.getItem('talentyah_token');
    const res   = await fetch(API + '/api/admin/reset-password/' + id, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({ password: newPwd || undefined })
    });
    const data = await res.json();
    if (res.ok) {
      alert(`✅ Mot de passe réinitialisé pour ${data.email}\n\nNouveau mot de passe :\n${data.tempPassword}\n\nCommuniquez-le à l'utilisateur.`);
    } else {
      alert('Erreur : ' + (data.error || 'Impossible de réinitialiser'));
    }
  } catch {
    alert('Impossible de joindre le serveur.');
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
   CRM
══════════════════════════════ */

async function loadCRM() {
  const tbody = document.getElementById('crmTbody');
  tbody.innerHTML = '<tr><td colspan="4">Chargement…</td></tr>';
  
  try {
    const token = sessionStorage.getItem('talentyah_token');
    const res   = await fetch(API + '/api/crm', { headers: { 'Authorization': 'Bearer ' + token } });
    const data  = await res.json();
    
    tbody.innerHTML = data.map(c => `
      <tr>
        <td><strong>${c.entreprise}</strong></td>
        <td>${c.contact}</td>
        <td><span class="badge-active">${c.stade}</span></td>
        <td><button class="btn-edit-pub">Modifier</button></td>
      </tr>
    `).join('');
  } catch (err) {
    tbody.innerHTML = '<tr><td colspan="4">Erreur de chargement.</td></tr>';
  }
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

/* ══════════════════════════════════════════════════════════════
   ATS PROSPECTION B2B — Module CRM intégré (Partie 2)
   Remplace la fonction loadCRM() basique
   Toute la logique ATS est namespaced sous l'objet `ATS`
══════════════════════════════════════════════════════════════ */

/* ── Données ATS (embarquées) ── */
const ATS_RAW = {"clients":[{"id":1,"entreprise":"Deloitte","secteur":"Conseil","contact":"Sidy DIOP","fonction":"Associé Sénégal, Maroc","email":"sidiop@deloitte.fr","tel":"06 88 52 45 81","source":"Prospection AMID","stade":"Client actif","besoin":"Analystes économiques surtout au Maroc","prochaine_action":"Dejeuner pour discuter des besoins de recrutement","date_relance":"","linkedin":"","commentaires":"Brillantes écoles"},{"id":2,"entreprise":"Orabank","secteur":"Banque","contact":"Serge Tohouenou","fonction":"","email":"serge.tohouenou@orabank.net","tel":"","source":"","stade":"Client actif","besoin":"","prochaine_action":"","date_relance":"","linkedin":"","commentaires":""},{"id":3,"entreprise":"Mstudio","secteur":"Service aux entreprises","contact":"Longa Andrea MBUYAMBA","fonction":"Directrice des Programmes","email":"andrea@mstudio.vc","tel":"2250768593572","source":"AMID","stade":"Négociation","besoin":"","prochaine_action":"","date_relance":"","linkedin":"","commentaires":""},{"id":4,"entreprise":"Lodge me at","secteur":"Service / stages Afrique du Sud","contact":"Myriam NEBIE","fonction":"Fondatrice","email":"myriam.nebie@lodge-me-at.com","tel":"","source":"AMID","stade":"Négociation","besoin":"","prochaine_action":"","date_relance":"","linkedin":"","commentaires":""},{"id":5,"entreprise":"Attijariwafa","secteur":"Banque","contact":"Babacar GUEYE","fonction":"Directeur exécutif capital humain","email":"Bgueye@cbao.sn","tel":"221775294581","source":"AfricTalents","stade":"Relance","besoin":"Jeunes diplômés grandes écoles","prochaine_action":"","date_relance":"Relance Whatsapp : 17/11/25 // Relance Mail 16/12/2025","linkedin":"","commentaires":"Programme Nortel"},{"id":6,"entreprise":"Cofina","secteur":"Banque","contact":"Johanna MOBIO","fonction":"DRH Groupe","email":"johanna.mobio@cofinacorp.com","tel":"225 27 22 51 51 80","source":"Prospection AMID","stade":"Premier contact","besoin":"","prochaine_action":"","date_relance":"","linkedin":"","commentaires":""},{"id":7,"entreprise":"Omeavie","secteur":"Assurances","contact":"Judicael Guendehou","fonction":"Fondateur","email":"","tel":"07 64 63 19 78","source":"","stade":"Premier contact","besoin":"Marketing","prochaine_action":"","date_relance":"","linkedin":"","commentaires":"Pas de recrutement pour le moment"},{"id":8,"entreprise":"Fonsis","secteur":"Fond d'investissement","contact":"Ousmane NDIAYE","fonction":"Chef division capital humain","email":"Ondiaye@fonsis.org","tel":"221783719931","source":"AfricaTalents","stade":"Premier contact","besoin":"2 directeurs d'investissement, 3 juristes d'affaires, DAF","prochaine_action":"","date_relance":"","linkedin":"","commentaires":""},{"id":9,"entreprise":"Julaya","secteur":"Tech","contact":"Mathias LEOPOLDIE","fonction":"CEO","email":"mleopoldie@julaya.co","tel":"","source":"Prospection AMID","stade":"Premier contact","besoin":"","prochaine_action":"","date_relance":"","linkedin":"","commentaires":""},{"id":10,"entreprise":"Afrijjet","secteur":"Transports / Logistique","contact":"Fadimatou NOUTCHEMO","fonction":"Country Manager Cameroun et Nigeria","email":"","tel":"237670897408","source":"Prospection AMID","stade":"Premier contact","besoin":"","prochaine_action":"","date_relance":"","linkedin":"","commentaires":"Pas de recrutement pour le moment"},{"id":11,"entreprise":"Castel","secteur":"Agroalimentaire","contact":"Marion Navarre","fonction":"DRH Groupe","email":"","tel":"","source":"","stade":"Premier contact","besoin":"","prochaine_action":"","date_relance":"","linkedin":"","commentaires":""},{"id":12,"entreprise":"Danone Ghana","secteur":"Agroalimentaire","contact":"Lionel Parent","fonction":"DG, Directeur commercial","email":"","tel":"06 67 27 77 80","source":"","stade":"Premier contact","besoin":"","prochaine_action":"","date_relance":"","linkedin":"","commentaires":""},{"id":13,"entreprise":"Enexus","secteur":"","contact":"","fonction":"","email":"jean-laurent.pyndiah@enexus-finance.com","tel":"","source":"","stade":"A contacter","besoin":"","prochaine_action":"","date_relance":"","linkedin":"","commentaires":""},{"id":14,"entreprise":"ASCOMA","secteur":"","contact":"Christine BAUDRAN-LAURE","fonction":"DRH","email":"Christine.Baudran-Laure@ascoma.com","tel":"01 47 42 62 05","source":"","stade":"A contacter","besoin":"","prochaine_action":"","date_relance":"","linkedin":"","commentaires":""},{"id":15,"entreprise":"Deloitte","secteur":"","contact":"Marc Vincens WABI","fonction":"","email":"mawabi@deloitte.com","tel":"","source":"","stade":"A contacter","besoin":"","prochaine_action":"","date_relance":"","linkedin":"","commentaires":""},{"id":16,"entreprise":"Gozem","secteur":"Transports / Logistique","contact":"Marjorie CHEYNEL","fonction":"Talents Acquisition Manager","email":"marjorie@gozem.co","tel":"+22892274882","source":"","stade":"A contacter","besoin":"","prochaine_action":"","date_relance":"","linkedin":"","commentaires":""},{"id":17,"entreprise":"Deloitte CIV","secteur":"","contact":"N'Zi Kone, Ericka","fonction":"RH CIV","email":"enzikone@deloitte.fr","tel":"","source":"","stade":"A contacter","besoin":"","prochaine_action":"","date_relance":"","linkedin":"","commentaires":""},{"id":18,"entreprise":"Banque Africaine de Développement","secteur":"","contact":"David Lubega","fonction":"Outreach and Selection Officer","email":"D.LUBEGA@afdb.org","tel":"","source":"","stade":"A contacter","besoin":"","prochaine_action":"","date_relance":"","linkedin":"","commentaires":""},{"id":19,"entreprise":"Group Vivendi Africa","secteur":"","contact":"Jessica Hentzen","fonction":"","email":"jessica.hentzen@gva.africa","tel":"","source":"","stade":"A contacter","besoin":"","prochaine_action":"","date_relance":"","linkedin":"","commentaires":""},{"id":20,"entreprise":"Fed Africa","secteur":"","contact":"Jean Dantani","fonction":"RH Consultant","email":"jeandantani@fedafrica.com","tel":"","source":"","stade":"A contacter","besoin":"","prochaine_action":"","date_relance":"","linkedin":"","commentaires":""},{"id":21,"entreprise":"ACCENTURE France","secteur":"Conseil","contact":"Sophie GUINAUD","fonction":"Client Account HR Lead","email":"sophie.guinaud@accenture.com","tel":"","source":"","stade":"A contacter","besoin":"","prochaine_action":"","date_relance":"","linkedin":"","commentaires":""},{"id":22,"entreprise":"Bank of Africa Sénégal","secteur":"Banque","contact":"Aymard Matongo","fonction":"Senior HR Manager","email":"amatongo@boasenegal.com","tel":"","source":"","stade":"A contacter","besoin":"","prochaine_action":"","date_relance":"","linkedin":"","commentaires":""},{"id":23,"entreprise":"Orange","secteur":"Telecoms","contact":"Datté Kouassi","fonction":"DRH","email":"datte.kouassi@orange.com","tel":"","source":"","stade":"A contacter","besoin":"","prochaine_action":"","date_relance":"","linkedin":"","commentaires":""},{"id":24,"entreprise":"Total Energies","secteur":"Energies","contact":"André Manahen KOFFI","fonction":"DRH","email":"andre.koffi@totalenergies.com","tel":"","source":"Michael","stade":"A contacter","besoin":"","prochaine_action":"","date_relance":"","linkedin":"","commentaires":""},{"id":25,"entreprise":"NSIA banque","secteur":"Banque","contact":"Marie-Thérèse BOUA N'GUESSAN","fonction":"DRH","email":"nsiabanque.ci@nsiabanque.com","tel":"","source":"Michael","stade":"A contacter","besoin":"","prochaine_action":"","date_relance":"","linkedin":"","commentaires":""},{"id":26,"entreprise":"CIE","secteur":"Energies","contact":"Jessica Carole Gnizako","fonction":"Juriste et Cadre de projet RH","email":"directiongeneralecie@cie.ci","tel":"27 21 23 33 00","source":"Michael","stade":"A contacter","besoin":"","prochaine_action":"","date_relance":"","linkedin":"","commentaires":"Treichville"},{"id":27,"entreprise":"SODECI","secteur":"Eau","contact":"Kadidia KONATE","fonction":"DRH","email":"sodeci@sodeci.ci","tel":"+225 21233000","source":"Michael","stade":"A contacter","besoin":"","prochaine_action":"","date_relance":"","linkedin":"","commentaires":""},{"id":28,"entreprise":"COOPEC","secteur":"MicroFinance","contact":"Armelle BAH","fonction":"DRH","email":"info@unacoopec.ci","tel":"27 22 40 49 99","source":"Michael","stade":"A contacter","besoin":"","prochaine_action":"","date_relance":"","linkedin":"","commentaires":""},{"id":29,"entreprise":"Witti Finance","secteur":"MicroFinance","contact":"Brice NIANGORAN","fonction":"DRH","email":"info@wittifinances.com","tel":"+225 27 27 27 27 27","source":"Michael","stade":"A contacter","besoin":"","prochaine_action":"","date_relance":"","linkedin":"","commentaires":""},{"id":30,"entreprise":"COFINA","secteur":"MicroFinance","contact":"Jean brice Affian","fonction":"Directeur du capital humain","email":"recrutement@cofinacofinacorp.com","tel":"+225 27 27 22 51 51 80","source":"Michael","stade":"A contacter","besoin":"","prochaine_action":"","date_relance":"","linkedin":"","commentaires":""},{"id":31,"entreprise":"ALIOS Finance","secteur":"Finance","contact":"Olive Simo","fonction":"HR Manager central africa","email":"olive.simo@alios-finance.com","tel":"","source":"","stade":"A contacter","besoin":"","prochaine_action":"","date_relance":"","linkedin":"","commentaires":""},{"id":32,"entreprise":"Crédit Agricole","secteur":"Banque","contact":"Berenika Balamou","fonction":"HR Project Manager","email":"berenika.balamou@credit-agricole-sa.fr","tel":"","source":"","stade":"A contacter","besoin":"","prochaine_action":"","date_relance":"","linkedin":"","commentaires":""},{"id":33,"entreprise":"Colas","secteur":"BTP","contact":"Franck SINGERLÉ","fonction":"DRH","email":"franck.singerle@colas.com","tel":"","source":"","stade":"A contacter","besoin":"","prochaine_action":"","date_relance":"","linkedin":"","commentaires":""},{"id":34,"entreprise":"Allianz","secteur":"Assurances","contact":"Marelsa Ligeon","fonction":"TA associée","email":"marelsa.ligeon@allianz.fr","tel":"","source":"","stade":"A contacter","besoin":"","prochaine_action":"","date_relance":"","linkedin":"","commentaires":""}],"partenariats":[{"id":1,"organisme":"Afroscep (ESCP)","activite":"Grande école","contact":"Nizar KABLANI","fonction":"Président","email":"nizar.kablani@edu.escp.eu","tel":"","source":"ABC","stade":"Client actif","besoin":"","prochaine_action":"","date_relance":"","commentaires":""},{"id":2,"organisme":"X-Afrique Polytech","activite":"Association étudiante","contact":"Fritz Morel EPOH NZOKI","fonction":"Président","email":"","tel":"","source":"","stade":"Négociation","besoin":"","prochaine_action":"","date_relance":"","commentaires":""},{"id":3,"organisme":"ASPA","activite":"Association étudiante","contact":"Hapsatou BAL","fonction":"","email":"","tel":"","source":"","stade":"Relance","besoin":"","prochaine_action":"","date_relance":"","commentaires":""},{"id":4,"organisme":"Skema AFRICA","activite":"Grande école","contact":"Jessica FREITAS","fonction":"Présidente","email":"","tel":"","source":"","stade":"A contacter","besoin":"","prochaine_action":"","date_relance":"","commentaires":""},{"id":5,"organisme":"HEC Africa","activite":"Grande école","contact":"Alexis JOHN AHYEE","fonction":"Directeur Général HEC Paris Bureau régional Afrique","email":"","tel":"","source":"ABC","stade":"Client actif","besoin":"","prochaine_action":"","date_relance":"","commentaires":""},{"id":6,"organisme":"Club Afrique emlyon alumni","activite":"Alumni","contact":"Mélissa OUIDIR","fonction":"","email":"","tel":"","source":"","stade":"A contacter","besoin":"","prochaine_action":"","date_relance":"","commentaires":""},{"id":7,"organisme":"EDHEC for African Business","activite":"Grande école","contact":"Yann-Adrien YACE","fonction":"Président","email":"","tel":"","source":"ABC","stade":"A contacter","besoin":"","prochaine_action":"","date_relance":"","commentaires":""},{"id":8,"organisme":"ESSEC Africa Society","activite":"Grande école","contact":"Reda LAKEHAL","fonction":"Président","email":"","tel":"","source":"ABC","stade":"A contacter","besoin":"","prochaine_action":"","date_relance":"","commentaires":""},{"id":9,"organisme":"Repat Africa","activite":"Réseau diaspora","contact":"Kara DIABY","fonction":"Founder - CEO","email":"","tel":"","source":"ABC","stade":"A contacter","besoin":"","prochaine_action":"","date_relance":"","commentaires":""},{"id":10,"organisme":"Club Efficience","activite":"Réseau pro","contact":"Elie NKAMGUEU","fonction":"President","email":"","tel":"","source":"ABC","stade":"A contacter","besoin":"","prochaine_action":"","date_relance":"","commentaires":""},{"id":11,"organisme":"Meet Africa","activite":"Réseau diaspora","contact":"Habiba ADDI","fonction":"Coordinatrice","email":"","tel":"","source":"ABC","stade":"A contacter","besoin":"","prochaine_action":"","date_relance":"","commentaires":""},{"id":12,"organisme":"Nyota (CVthèque)","activite":"Tech RH","contact":"Sérine IDRISSI","fonction":"Co-founder","email":"","tel":"","source":"ABC","stade":"A contacter","besoin":"","prochaine_action":"","date_relance":"","commentaires":""},{"id":13,"organisme":"Africa Finance Bootcamp","activite":"Formation","contact":"Julio Dibwe MUPEMBA","fonction":"Co-founder","email":"","tel":"","source":"ABC","stade":"A contacter","besoin":"","prochaine_action":"","date_relance":"","commentaires":""},{"id":14,"organisme":"AMDIE","activite":"Institution","contact":"Ali Seddiki","fonction":"Directeur Général","email":"","tel":"","source":"ABC","stade":"A contacter","besoin":"","prochaine_action":"","date_relance":"","commentaires":""}]};

const ATS = (() => {
  /* ── State ── */
  const STADE_ORDER = {'Partenaire actif':1,'B2C actif':2,'Client actif':3,'Négociation':4,'Relance':5,'Premier contact':6,'A contacter':7,'Mission terminée':8,"Repositionner l'offre":9,'Fermée':10,'Stand by':11,'':12};
  const STORAGE_KEY = 'talentyah_crm_data_v1';

  /* Charge les données sauvegardées localement si elles existent, sinon les données par défaut */
  function loadInitialData() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && Array.isArray(parsed.clients) && Array.isArray(parsed.partenariats)) {
          return parsed;
        }
      }
    } catch (e) { console.warn('CRM: lecture localStorage impossible, utilisation des données par défaut.', e); }
    return ATS_RAW;
  }

  const initialData = loadInitialData();
  let db = initialData.clients.map((r,i) => ({...r, _idx:i}));
  let parts = initialData.partenariats.map((r,i) => ({...r, _idx:i}));
  let sortCol = 'stade', sortDir = 1;
  let currentModalIdx = null;

  /* Sauvegarde l'état courant dans localStorage (persiste entre les sessions/rechargements) */
  function persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ clients: db, partenariats: parts }));
    } catch (e) { console.warn('CRM: échec de la sauvegarde locale.', e); }
  }

  /* ── Badge stade ── */
  function badge(s) {
    const map = {'Client actif':'ats-badge-client','Négociation':'ats-badge-nego','Relance':'ats-badge-relance','Premier contact':'ats-badge-premier','A contacter':'ats-badge-contacter','Mission terminée':'ats-badge-terminee',"Repositionner l'offre":'ats-badge-reposi','Fermée':'ats-badge-fermee','Stand by':'ats-badge-standby','B2C actif':'ats-badge-b2c','Partenaire actif':'ats-badge-part'};
    return `<span class="ats-badge ${map[s]||'ats-badge-contacter'}">${s||'—'}</span>`;
  }

  function stadeColor(s) {
    const map = {'Client actif':'#1B5E20','Négociation':'#1565C0','Relance':'#E65100','Premier contact':'#6A1B9A','A contacter':'#37474F','Mission terminée':'#388E3C',"Repositionner l'offre":'#F57F17','Fermée':'#880E4F','Stand by':'#283593','B2C actif':'#880E4F','Partenaire actif':'#1B5E20'};
    return map[s] || '#37474F';
  }

  function toast(msg) {
    let cont = document.getElementById('ats-toasts');
    if (!cont) { cont = document.createElement('div'); cont.id='ats-toasts'; cont.className='ats-toast-container'; document.body.appendChild(cont); }
    const t = document.createElement('div'); t.className='ats-toast'; t.textContent=msg;
    cont.appendChild(t); setTimeout(() => t.remove(), 2800);
  }

  function sorted(arr) {
    return [...arr].sort((a,b) => {
      if (sortCol === 'stade') return ((STADE_ORDER[a.stade]||10) - (STADE_ORDER[b.stade]||10)) * sortDir;
      const va=(a[sortCol]||'').toLowerCase(), vb=(b[sortCol]||'').toLowerCase();
      return (va<vb?-1:va>vb?1:0)*sortDir;
    });
  }

  function getFiltered() {
    const q = (document.getElementById('ats-search')?.value||'').toLowerCase();
    const fs = document.getElementById('ats-filter-stade')?.value||'';
    const fse = document.getElementById('ats-filter-secteur')?.value||'';
    return db.filter(r => {
      if (fs && r.stade!==fs) return false;
      if (fse && r.secteur!==fse) return false;
      if (q && !`${r.entreprise} ${r.contact} ${r.secteur} ${r.email} ${r.source}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }

  /* ── Export CSV (liste clients filtrée/triée à l'écran) ── */
  function exportClientsCSV() {
    const rows = sorted(getFiltered());
    if (!rows.length) { toast('⚠️ Rien à exporter'); return; }
    const headers = ['Entreprise','Secteur','Contact','Fonction','Email','Téléphone','Source','Stade','Besoin','Prochaine action','Date de relance','Commentaires'];
    const keys = ['entreprise','secteur','contact','fonction','email','tel','source','stade','besoin','prochaine_action','date_relance','commentaires'];
    const csvEscape = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const lines = [headers.map(csvEscape).join(',')];
    rows.forEach(r => lines.push(keys.map(k => csvEscape(r[k])).join(',')));
    const csvContent = '\uFEFF' + lines.join('\r\n'); // BOM pour accents corrects dans Excel
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `talentyah-crm-clients-${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
    toast(`✅ ${rows.length} contact${rows.length>1?'s':''} exporté${rows.length>1?'s':''}`);
  }

  /* ── Init dashboard KPIs ── */
  function initDashboard() {
    const qs = (id) => document.getElementById(id);
    const set = (id, val) => { const el=qs(id); if(el) el.textContent=val; };
    set('ats-kpi-total', db.length);
    set('ats-kpi-actifs', db.filter(r=>r.stade==='Client actif').length);
    set('ats-kpi-nego', db.filter(r=>r.stade==='Négociation').length);
    set('ats-kpi-relance', db.filter(r=>r.stade==='Relance').length);
    set('ats-kpi-contacter', db.filter(r=>r.stade==='A contacter').length);
    set('ats-kpi-terminee', db.filter(r=>r.stade==='Mission terminée').length);
    set('ats-kpi-reposi', db.filter(r=>r.stade==="Repositionner l'offre").length);
    set('ats-kpi-fermee', db.filter(r=>r.stade==='Fermée').length);
    set('ats-kpi-standby', db.filter(r=>r.stade==='Stand by').length);
    set('ats-kpi-b2c', db.filter(r=>r.stade==='B2C actif').length);
    set('ats-kpi-part', db.filter(r=>r.stade==='Partenaire actif').length);

    // Récent
    const rt = qs('ats-recent-tbody');
    if(rt) rt.innerHTML = db.slice(0,8).map(r=>`
      <tr onclick="ATS.openModal(${r._idx})" style="cursor:pointer">
        <td><div class="ats-company-name">${r.entreprise}</div></td>
        <td>${badge(r.stade)}</td>
        <td><small style="color:var(--muted)">${r.source||'—'}</small></td>
      </tr>`).join('');

    // Secteurs
    const sectors = {};
    db.forEach(r => { if(r.secteur) sectors[r.secteur]=(sectors[r.secteur]||0)+1; });
    const top = Object.entries(sectors).sort((a,b)=>b[1]-a[1]).slice(0,8);
    const st = qs('ats-sector-tbody');
    if(st) st.innerHTML = top.map(([s,n])=>`<tr><td>${s}</td><td><strong>${n}</strong></td></tr>`).join('');

    // Populate secteur filter
    const sel = qs('ats-filter-secteur');
    if(sel && sel.options.length<=1) {
      top.forEach(([s])=>{ const o=document.createElement('option'); o.value=s; o.textContent=s; sel.appendChild(o); });
    }
  }

  /* ── Clients table ── */
  function renderClients() {
    const filtered = getFiltered();
    const s = sorted(filtered);
    const rc = document.getElementById('ats-result-count');
    if(rc) rc.textContent=`${s.length} résultat${s.length>1?'s':''}`;
    const tbody = document.getElementById('ats-clients-tbody');
    if(!tbody) return;
    if(!s.length) { tbody.innerHTML=`<tr><td colspan="8"><div class="ats-empty"><div class="ats-empty-icon">🔍</div><p>Aucun résultat trouvé</p></div></td></tr>`; return; }
    tbody.innerHTML = s.map(r=>`
      <tr onclick="ATS.openModal(${r._idx})">
        <td><div class="ats-company-name">${r.entreprise}</div><div class="ats-contact-name">${r.contact||''}</div></td>
        <td>${r.secteur?`<span class="ats-sector-tag">${r.secteur}</span>`:'—'}</td>
        <td>${r.contact||'—'}</td>
        <td style="max-width:150px;font-size:12px;color:var(--muted)">${r.fonction||'—'}</td>
        <td>${r.email?`<a class="ats-email-link" href="mailto:${r.email}" onclick="event.stopPropagation()">${r.email}</a>`:'—'}</td>
        <td><small style="color:var(--muted)">${r.source||'—'}</small></td>
        <td>${badge(r.stade)}</td>
        <td><button class="ats-action-btn" onclick="event.stopPropagation();ATS.openModal(${r._idx})">Ouvrir →</button></td>
      </tr>`).join('');
  }

  /* ── Pipeline kanban (glisser-déposer) ── */
  function renderPipeline() {
    const board = document.getElementById('ats-pipeline-board');
    if(!board) return;
    const stades = ['Client actif','Négociation','Relance','A contacter','Mission terminée',"Repositionner l'offre",'Fermée','Stand by','B2C actif','Partenaire actif'];
    board.innerHTML = stades.map(stade=>{
      const items = db.filter(r=>r.stade===stade);
      return `
        <div class="ats-pipeline-col" data-stade="${_esc(stade)}" ondragover="ATS.onColDragOver(event)" ondragleave="ATS.onColDragLeave(event)" ondrop="ATS.onColDrop(event)">
          <div class="ats-pipeline-header">
            <span class="ats-pipeline-title" style="color:${stadeColor(stade)}">${stade}</span>
            <span class="ats-pipeline-count">${items.length}</span>
          </div>
          <div class="ats-pipeline-cards">
            ${items.slice(0,15).map(r=>`
              <div class="ats-pipeline-card" draggable="true" ondragstart="ATS.onCardDragStart(event,${r._idx})" ondragend="ATS.onCardDragEnd(event)" onclick="ATS.openModal(${r._idx})">
                <div class="ats-pc-company">${r.entreprise}</div>
                <div class="ats-pc-contact">${r.contact||'—'}</div>
                ${r.secteur?`<div class="ats-pc-sector">${r.secteur}</div>`:''}
              </div>`).join('')}
            ${items.length>15?`<div style="text-align:center;font-size:11px;color:var(--muted);padding:6px">+${items.length-15} autres</div>`:''}
          </div>
        </div>`;
    }).join('');
  }

  let dragIdx = null;
  function onCardDragStart(ev, idx) {
    dragIdx = idx;
    ev.dataTransfer.effectAllowed = 'move';
    ev.target.classList.add('ats-dragging');
  }
  function onCardDragEnd(ev) {
    ev.target.classList.remove('ats-dragging');
    document.querySelectorAll('.ats-pipeline-col').forEach(c => c.classList.remove('ats-drop-hover'));
  }
  function onColDragOver(ev) {
    ev.preventDefault();
    ev.dataTransfer.dropEffect = 'move';
    ev.currentTarget.classList.add('ats-drop-hover');
  }
  function onColDragLeave(ev) {
    ev.currentTarget.classList.remove('ats-drop-hover');
  }
  function onColDrop(ev) {
    ev.preventDefault();
    ev.currentTarget.classList.remove('ats-drop-hover');
    const newStade = ev.currentTarget.dataset.stade;
    if (dragIdx === null) return;
    const r = db[dragIdx];
    if (!r || r.stade === newStade) { dragIdx = null; return; }
    const oldStade = r.stade;
    r.stade = newStade;
    if (!Array.isArray(r.historique)) r.historique = [];
    r.historique.push({ date: new Date().toISOString(), text: `Stade changé : "${oldStade || '—'}" → "${newStade}"` });
    db.sort((a,b)=>(STADE_ORDER[a.stade]||10)-(STADE_ORDER[b.stade]||10));
    db.forEach((row,i)=>row._idx=i);
    persist();
    renderPipeline(); renderClients(); renderRelances(); initDashboard();
    toast(`✅ ${r.entreprise} déplacé vers "${newStade}"`);
    dragIdx = null;
  }

  /* ── Partenariats ── */
  function renderPartenariats() {
    const q = (document.getElementById('ats-search-part')?.value||'').toLowerCase();
    const fs = document.getElementById('ats-filter-stade-part')?.value||'';
    let list = parts.filter(r => {
      if(fs && r.stade!==fs) return false;
      if(q && !`${r.organisme} ${r.contact} ${r.activite}`.toLowerCase().includes(q)) return false;
      return true;
    });
    const rc = document.getElementById('ats-result-count-part');
    if(rc) rc.textContent=`${list.length} organisme${list.length>1?'s':''}`;
    const grid = document.getElementById('ats-part-grid');
    if(!grid) return;
    grid.innerHTML = list.map(r=>`
      <div class="ats-part-card" onclick="ATS.openPartModal(${r._idx})">
        <div class="ats-part-name">${r.organisme}</div>
        <div class="ats-part-contact">${r.activite||''} ${r.contact?'· '+r.contact:''}</div>
        ${badge(r.stade)}
        ${r.email?`<div style="margin-top:8px"><a class="ats-email-link" href="mailto:${r.email}" onclick="event.stopPropagation()">${r.email}</a></div>`:''}
      </div>`).join('');
  }

  /* ── Relances ── */
  function renderRelances() {
    const list = document.getElementById('ats-relances-list');
    if(!list) return;
    const relances = db.filter(r=>['Relance','Négociation','Premier contact'].includes(r.stade));
    if(!relances.length) { list.innerHTML=`<div class="ats-empty"><div class="ats-empty-icon">✅</div><p>Aucune relance en attente</p></div>`; return; }
    list.innerHTML = relances.map(r=>`
      <div class="ats-activity-item" onclick="ATS.openModal(${r._idx})">
        <div class="ats-activity-dot" style="background:${stadeColor(r.stade)}"></div>
        <div class="ats-activity-content">
          <div class="ats-activity-company">${r.entreprise}${r.contact?` — <span style="font-weight:400;color:var(--muted)">${r.contact}</span>`:''}</div>
          <div class="ats-activity-action">${r.prochaine_action||r.commentaires||r.date_relance||'Aucune action définie'}</div>
        </div>
        ${badge(r.stade)}
      </div>`).join('');
  }

  function renderHistory(r) {
    const box = document.getElementById('ats-modal-history');
    if (!box) return;
    const hist = Array.isArray(r.historique) ? r.historique : [];
    if (!hist.length) { box.innerHTML = `<span style="color:var(--muted);">Aucun échange enregistré pour l'instant.</span>`; return; }
    box.innerHTML = hist.slice().reverse().map(h => `
      <div style="padding:6px 0;border-bottom:1px solid var(--border);">
        <div style="font-size:11px;color:var(--muted);font-weight:600;">${_fmtDate(h.date)}</div>
        <div>${_esc(h.text)}</div>
      </div>`).join('');
  }

  function addHistoryNote() {
    if (currentModalIdx === null) return;
    const input = document.getElementById('ats-modal-history-input');
    const text = (input?.value || '').trim();
    if (!text) return;
    const isClient = currentModalIdx >= 0;
    const idx = isClient ? currentModalIdx : -currentModalIdx - 1000;
    const obj = isClient ? db[idx] : parts[idx];
    if (!Array.isArray(obj.historique)) obj.historique = [];
    obj.historique.push({ date: new Date().toISOString(), text });
    persist();
    renderHistory(obj);
    input.value = '';
    toast('✅ Note ajoutée à l\'historique');
  }

  /* ── Modal client ── */
  function openModal(idx) {
    currentModalIdx = idx;
    const r = db[idx];
    document.getElementById('ats-modal-company').textContent = r.entreprise;
    document.getElementById('ats-modal-sector').textContent  = r.secteur||'Secteur non renseigné';
    document.getElementById('ats-modal-stade-badge').innerHTML = badge(r.stade);
    document.getElementById('ats-modal-stade-select').value = r.stade||'A contacter';
    const fields = {contact:'mf2-contact',fonction:'mf2-fonction',email:'mf2-email',tel:'mf2-tel',source:'mf2-source',linkedin:'mf2-linkedin',besoin:'mf2-besoin',prochaine_action:'mf2-action',commentaires:'mf2-commentaires'};
    Object.entries(fields).forEach(([k,id])=>{ const el=document.getElementById(id); if(el) el.value=r[k]||''; });
    renderHistory(r);
    document.getElementById('ats-modal-overlay').classList.add('open');
  }

  function openPartModal(idx) {
    currentModalIdx = -idx - 1000;
    const r = parts[idx];
    document.getElementById('ats-modal-company').textContent = r.organisme;
    document.getElementById('ats-modal-sector').textContent  = r.activite||'Partenariat';
    document.getElementById('ats-modal-stade-badge').innerHTML = badge(r.stade);
    document.getElementById('ats-modal-stade-select').value = r.stade||'A contacter';
    const el = {contact:'mf2-contact',fonction:'mf2-fonction',email:'mf2-email',tel:'mf2-tel',source:'mf2-source'};
    Object.entries(el).forEach(([k,id])=>{ const e=document.getElementById(id); if(e) e.value=r[k]||''; });
    ['mf2-linkedin','mf2-besoin','mf2-action','mf2-commentaires'].forEach(id=>{ const e=document.getElementById(id); if(e) e.value=r.commentaires||''; });
    renderHistory(r);
    document.getElementById('ats-modal-overlay').classList.add('open');
  }

  function closeModal(ev) {
    if(ev && ev.target!==document.getElementById('ats-modal-overlay')) return;
    document.getElementById('ats-modal-overlay').classList.remove('open');
    currentModalIdx=null;
  }

  function updateStadeBadge() {
    const s=document.getElementById('ats-modal-stade-select').value;
    document.getElementById('ats-modal-stade-badge').innerHTML=badge(s);
  }

  function saveModal() {
    const isClient = currentModalIdx>=0;
    const idx = isClient ? currentModalIdx : -currentModalIdx-1000;
    const obj = isClient ? db[idx] : parts[idx];
    obj.stade = document.getElementById('ats-modal-stade-select').value;
    const fields = {contact:'mf2-contact',fonction:'mf2-fonction',email:'mf2-email',tel:'mf2-tel',source:'mf2-source',linkedin:'mf2-linkedin',besoin:'mf2-besoin',prochaine_action:'mf2-action',commentaires:'mf2-commentaires'};
    Object.entries(fields).forEach(([k,id])=>{ const el=document.getElementById(id); if(el) obj[k]=el.value; });
    db.sort((a,b)=>(STADE_ORDER[a.stade]||10)-(STADE_ORDER[b.stade]||10));
    db.forEach((r,i)=>r._idx=i);
    persist();
    renderClients(); renderPipeline(); renderRelances(); initDashboard();
    document.getElementById('ats-modal-overlay').classList.remove('open');
    currentModalIdx=null;
    toast('✅ Fiche mise à jour');
  }

  /* ── Ajouter ── */
  function addEntry() {
    const ent=document.getElementById('ats-add-entreprise').value.trim();
    if(!ent){toast('⚠️ Entreprise obligatoire');return;}
    const rec={id:db.length+1,entreprise:ent,secteur:document.getElementById('ats-add-secteur').value.trim(),contact:document.getElementById('ats-add-contact').value.trim(),fonction:document.getElementById('ats-add-fonction').value.trim(),email:document.getElementById('ats-add-email').value.trim(),tel:document.getElementById('ats-add-tel').value.trim(),source:document.getElementById('ats-add-source').value.trim(),stade:document.getElementById('ats-add-stade').value,besoin:document.getElementById('ats-add-besoin').value.trim(),prochaine_action:'',commentaires:document.getElementById('ats-add-commentaires').value.trim(),linkedin:''};
    db.push(rec);
    db.sort((a,b)=>(STADE_ORDER[a.stade]||10)-(STADE_ORDER[b.stade]||10));
    db.forEach((r,i)=>r._idx=i);
    persist();
    initDashboard(); renderClients(); renderPipeline(); renderRelances();
    ['ats-add-entreprise','ats-add-secteur','ats-add-contact','ats-add-fonction','ats-add-email','ats-add-tel','ats-add-source','ats-add-besoin','ats-add-commentaires'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
    document.getElementById('ats-add-stade').value='A contacter';
    toast(`✅ "${ent}" ajouté à la base`);
    showAtsPage('ats-page-clients', document.querySelector('.crm-tab[data-ats="ats-page-clients"]'));
  }

  /* ── Dashboard filter ── */
  function filterByStade(stade, el) {
    document.querySelectorAll('.ats-kpi-card').forEach(c=>c.classList.remove('active'));
    el.classList.add('active');
    showAtsPage('ats-page-clients');
    document.querySelectorAll('.crm-tab').forEach(t=>{if(t.dataset.ats==='ats-page-clients')t.classList.add('active');else t.classList.remove('active');});
    const sel=document.getElementById('ats-filter-stade');
    if(sel) sel.value=stade||'';
    renderClients();
  }

  /* ── Navigation interne ── */
  function showAtsPage(pageId, btn) {
    document.querySelectorAll('.ats-page').forEach(p=>p.classList.remove('active'));
    const page=document.getElementById(pageId);
    if(page) page.classList.add('active');
    if(btn) { document.querySelectorAll('.crm-tab').forEach(t=>t.classList.remove('active')); btn.classList.add('active'); }
  }

  /* ── Entry point (appelé par loadCRM) ── */
  function init() {
    initDashboard();
    renderClients();
    renderPipeline();
    renderPartenariats();
    renderRelances();
  }

  /* ── Expose public API ── */
  return { init, openModal, openPartModal, closeModal, updateStadeBadge, saveModal, addEntry, filterByStade, showAtsPage, renderClients, renderPartenariats, renderRelances, badge, exportClientsCSV, addHistoryNote, onCardDragStart, onCardDragEnd, onColDragOver, onColDragLeave, onColDrop };
})();

/* Override loadCRM pour pointer vers ATS.init */
function loadCRM() {
  // Petit délai pour s'assurer que le DOM est rendu
  setTimeout(() => ATS.init(), 50);
}