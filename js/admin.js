/* =====================================================
   TALENTYAH — admin.js
   Rôles : superadmin | admin | editor
===================================================== */

const API = 'http://localhost:4000';

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
    panelPartners:     true,
    panelPublications: true,
    panelAccess:       true,   // gestion des utilisateurs
  },
  admin: {
    panelCandidates:   true,
    panelCompanies:    true,
    panelJobs:         true,
    panelPartners:     true,
    panelPublications: true,
    panelAccess:       false,  // ne gère pas les accès
  },
  editor: {
    panelCandidates:   false,
    panelCompanies:    false,
    panelJobs:         false,
    panelPartners:     false,
    panelPublications: true,   // blog uniquement
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

      try {
        const res  = await fetch(API + '/api/admin/login', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (res.ok && data.token) {
          sessionStorage.setItem('talentyah_token', data.token);
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
      document.querySelectorAll('.admin-panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      const panel = document.getElementById(btn.dataset.panel);
      if (panel) panel.classList.add('active');
      const titleEl = document.getElementById('topbarTitle');
      const subEl   = document.getElementById('topbarSub');
      if (titleEl && btn.dataset.title) titleEl.textContent = btn.dataset.title;
      if (subEl   && btn.dataset.sub)   subEl.textContent   = btn.dataset.sub;
      if (btn.dataset.panel === 'panelAccess') loadAccessList();
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
  document.getElementById('savePartnersBtn')?.addEventListener('click', () => {
    const msg = document.getElementById('partnersMsg');
    if (msg) { msg.textContent = '✓ Modifications enregistrées.'; msg.style.color = 'var(--emerald)'; setTimeout(() => { msg.textContent = ''; }, 3000); }
  });

  /* ── Publications ── */
  document.getElementById('pubForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const f  = e.target;
    const id = document.getElementById('pub-id').value;
    const pub = {
      id:       id ? parseInt(id) : Date.now(),
      title:    f['title'].value.trim(),
      category: f['category'].value,
      status:   f['status'].value,
      excerpt:  f['excerpt'].value.trim(),
      content:  f['content'].value.trim(),
      image:    currentPubImg || null,
      date:     new Date().toISOString().slice(0, 10),
    };
    if (id) {
      const idx = publications.findIndex(p => p.id === parseInt(id));
      if (idx !== -1) publications[idx] = pub;
    } else {
      publications.unshift(pub);
    }
    renderPubList(); resetPubForm();
    const msg = document.getElementById('pubMsg');
    if (msg) { msg.textContent = '✓ Publication enregistrée.'; msg.style.color = 'var(--emerald)'; setTimeout(() => { msg.textContent = ''; }, 3000); }
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
    const f     = e.target;
    const email = f.email.value.trim();
    const role  = f.role.value;
    const msg   = document.getElementById('accessMsg');
    try {
      const token = sessionStorage.getItem('talentyah_token');
      const res   = await fetch(API + '/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify({ email, role })
      });
      if (res.ok) {
        if (msg) { msg.textContent = '✓ Accès créé.'; msg.style.color = 'var(--emerald)'; }
        f.reset(); loadAccessList();
      } else {
        const d = await res.json();
        if (msg) { msg.textContent = d.error || 'Erreur.'; msg.style.color = '#c0392b'; }
      }
    } catch {
      if (msg) { msg.textContent = '✓ Accès ajouté (mode démo).'; msg.style.color = 'var(--emerald)'; }
      f.reset(); loadAccessList();
    }
  });

});

/* ══════════════════════════════
   SHOW DASHBOARD
══════════════════════════════ */
function showDashboard() {
  document.getElementById('adminLoginSection').style.display     = 'none';
  document.getElementById('adminDashboardSection').style.display = 'flex';
  loadCandidates();
  loadCompanies();
  loadJobs();
  initPartners();
  initPublications();
  applyPermissions();
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
    if (panel && !allowed) panel.style.display = 'none';
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
  tbody.innerHTML = '<tr class="empty-row"><td colspan="7">Chargement…</td></tr>';

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
    tbody.innerHTML = '<tr class="empty-row"><td colspan="7">Aucune candidature reçue pour le moment.</td></tr>';
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
        ? '<a href="' + _esc(r.cv_url) + '" target="_blank" rel="noopener" class="badge-cv">📎 Voir CV</a>'
        : '<span style="color:var(--border);">—</span>'
      }</td>
    </tr>`).join('');
}

/* ══════════════════════════════
   ENTREPRISES
══════════════════════════════ */
async function loadCompanies() {
  const tbody = document.getElementById('companiesTbody');
  if (!tbody) return;
  tbody.innerHTML = '<tr class="empty-row"><td colspan="7">Chargement…</td></tr>';

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
    tbody.innerHTML = '<tr class="empty-row"><td colspan="7">Aucune demande reçue pour le moment.</td></tr>';
    return;
  }
  tbody.innerHTML = rows.map(r => `
    <tr>
      <td style="color:var(--muted);white-space:nowrap;">${_fmtDate(r.created_at)}</td>
      <td><strong>${_esc(r.company_name || '—')}</strong></td>
      <td><a href="mailto:${_esc(r.email)}" style="color:var(--emerald);text-decoration:none;">${_esc(r.email)}</a></td>
      <td style="color:var(--muted);">${_esc(r.region || '—')}</td>
      <td>${_esc(r.role_needed || '—')}</td>
      <td>${urgencyMap[r.urgency] || '—'}</td>
      <td style="max-width:180px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--muted);" title="${_esc(r.message||'')}">${_esc(r.message || '—')}</td>
    </tr>`).join('');
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
   PARTENAIRES
══════════════════════════════ */
let partners = [
  { name:'Orange Africa',   desc:'Télécommunications',  img:null },
  { name:'Ecobank',         desc:'Services financiers', img:null },
  { name:'NSIA Banque',     desc:'Banque & Assurances', img:null },
  { name:'Africa Finance',  desc:'Conseil & Finance',   img:null },
  { name:'Partenaire 5',    desc:'',                    img:null },
  { name:'Partenaire 6',    desc:'',                    img:null },
];

function initPartners() {
  const badge = document.getElementById('countPartners');
  if (badge) badge.textContent = partners.length;
  renderPartnersGrid();
  renderPartnerNames();
}

function renderPartnersGrid() {
  const grid = document.getElementById('partnersGrid');
  if (!grid) return;
  grid.innerHTML = partners.map((p, i) => `
    <div class="partner-slot ${p.img ? 'filled' : ''}" id="pslot-${i}">
      <input type="file" accept="image/*" onchange="handlePartnerImg(this, ${i})">
      ${p.img
        ? '<img src="' + p.img + '" alt="' + _esc(p.name) + '"><button class="partner-remove" onclick="removePartnerImg(event,' + i + ')">✕</button>'
        : '<div class="partner-slot-placeholder"><svg viewBox="0 0 24 24" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg><span>' + _esc(p.name) + '</span></div>'
      }
    </div>
  `).join('');
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

function handlePartnerImg(input, i) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => { partners[i].img = e.target.result; renderPartnersGrid(); renderPartnerNames(); };
  reader.readAsDataURL(file);
}

function removePartnerImg(e, i) {
  e.preventDefault(); e.stopPropagation();
  partners[i].img = null; renderPartnersGrid();
}

function removePartner(i) {
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

function initPublications() {
  const badge = document.getElementById('countPublications');
  if (badge) badge.textContent = publications.length;
  renderPubList();
}

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

function togglePubStatus(i) {
  publications[i].status = publications[i].status === 'published' ? 'draft' : 'published';
  renderPubList();
}

function deletePub(i) {
  if (!confirm('Supprimer cette publication ?')) return;
  publications.splice(i, 1); renderPubList();
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

  list.innerHTML = users.map(u => {
    const s = roleStyle[u.role] || roleStyle['editor'];
    return `<tr>
      <td><strong>${_esc(u.email)}</strong></td>
      <td><span style="display:inline-flex;align-items:center;gap:5px;padding:3px 9px;font-size:11px;font-weight:600;border-radius:4px;${s}">${_esc(u.role)}</span></td>
      <td>${u.role !== 'superadmin'
        ? `<button class="btn-delete" onclick="deleteAccess(${u.id})">Révoquer</button>`
        : '—'
      }</td>
    </tr>`;
  }).join('');
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