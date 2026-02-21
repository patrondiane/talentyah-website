/* =====================================================
   TALENTYAH — admin.js
   Login + Dashboard : candidatures, entreprises, offres
===================================================== */

const API = 'http://localhost:4000';

document.addEventListener('DOMContentLoaded', () => {

  const loginSection     = document.getElementById('adminLoginSection');
  const dashboardSection = document.getElementById('adminDashboardSection');

  /* ---- AUTO-LOGIN si token present ---- */
  if (sessionStorage.getItem('talentyah_token')) showDashboard();

  /* ---- FORM LOGIN ---- */
  const loginForm = document.getElementById('adminLoginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = loginForm.querySelector('.admin-login-btn');
      const msg = document.getElementById('adminMsg');
      const email    = loginForm.email.value.trim();
      const password = loginForm.password.value;
      btn.textContent = 'Connexion...'; btn.disabled = true;
      _hideMsg(msg);

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
          _showMsg(msg, 'Email ou mot de passe incorrect.', 'error');
          btn.textContent = 'Se connecter'; btn.disabled = false;
        }
      } catch {
        /* Dev mode sans backend — identifiants par defaut */
        if (email === 'admin@talentyah.com' && password === 'admin') {
          sessionStorage.setItem('talentyah_token', 'dev_token');
          showDashboard();
        } else {
          _showMsg(msg, 'Identifiants incorrects. (dev: admin@talentyah.com / admin)', 'error');
          btn.textContent = 'Se connecter'; btn.disabled = false;
        }
      }
    });
  }

  /* ---- LOGOUT ---- */
  document.getElementById('logoutBtn')?.addEventListener('click', () => {
    sessionStorage.removeItem('talentyah_token');
    dashboardSection.style.display = 'none';
    loginSection.style.display     = 'flex';
    loginForm?.reset();
  });

  /* ---- TABS ---- */
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.admin-panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      const panel = document.getElementById(btn.dataset.panel);
      if (panel) panel.classList.add('active');
    });
  });

  /* ---- FILTRES CANDIDATS ---- */
  document.getElementById('applyFiltersBtn')?.addEventListener('click', loadCandidates);
  document.getElementById('resetFiltersBtn')?.addEventListener('click', () => {
    document.getElementById('filterSector').value  = '';
    document.getElementById('filterCountry').value = '';
    loadCandidates();
  });

  /* ---- FORMULAIRE OFFRE ---- */
  const jobForm = document.getElementById('jobForm');
  if (jobForm) {
    jobForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = jobForm.querySelector('.btn-publish');
      const msg = document.getElementById('jobMsg');
      btn.textContent = 'Publication...'; btn.disabled = true;

      const payload = {
        title:         jobForm.title.value.trim(),
        country:       jobForm.country.value.trim(),
        city:          jobForm.city.value.trim(),
        sector:        jobForm.sector.value.trim(),
        contract_type: jobForm.contract_type.value,
        salary:        jobForm.salary.value.trim(),
        description:   jobForm.description.value.trim(),
      };

      try {
        const token = sessionStorage.getItem('talentyah_token');
        const res   = await fetch(API + '/api/jobs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          _showMsg(msg, '✓ Offre publiee avec succes !', 'success');
          jobForm.reset(); loadJobs();
        } else {
          const d = await res.json();
          _showMsg(msg, d.error || 'Erreur publication.', 'error');
        }
      } catch {
        _showMsg(msg, '✓ Offre ajoutee (mode dev).', 'success');
        jobForm.reset();
      }
      btn.textContent = "Publier l'offre"; btn.disabled = false;
    });
  }

});

/* =====================
   SHOW DASHBOARD
===================== */
function showDashboard() {
  document.getElementById('adminLoginSection').style.display     = 'none';
  document.getElementById('adminDashboardSection').style.display = 'block';
  loadCandidates();
  loadCompanies();
  loadJobs();
}

/* =====================
   CANDIDATS
===================== */
async function loadCandidates() {
  const tbody   = document.getElementById('candidatesTbody');
  const sector  = document.getElementById('filterSector')?.value.trim()  || '';
  const country = document.getElementById('filterCountry')?.value.trim() || '';
  if (!tbody) return;
  tbody.innerHTML = '<tr class="empty-row"><td colspan="6">Chargement...</td></tr>';

  try {
    const token = sessionStorage.getItem('talentyah_token');
    const params = new URLSearchParams();
    if (sector)  params.append('sector', sector);
    if (country) params.append('country', country);
    const res  = await fetch(API + '/api/candidates?' + params, { headers: { 'Authorization': 'Bearer ' + token }});
    const data = await res.json();
    _renderCandidates(tbody, data.candidates || data);
    const badge = document.getElementById('countCandidates');
    if (badge) badge.textContent = (data.candidates || data).length;
  } catch {
    _renderCandidates(tbody, []);
  }
}

function _renderCandidates(tbody, rows) {
  if (!rows || !rows.length) {
    tbody.innerHTML = '<tr class="empty-row"><td colspan="6">Aucune candidature recue pour le moment.</td></tr>';
    return;
  }
  tbody.innerHTML = rows.map(r => `
    <tr>
      <td class="muted nowrap">${_fmtDate(r.created_at)}</td>
      <td><strong>${_esc(r.first_name)} ${_esc(r.last_name)}</strong></td>
      <td class="td-email"><a href="mailto:${_esc(r.email)}">${_esc(r.email)}</a></td>
      <td class="muted">${_esc(r.role_target || '—')}</td>
      <td class="muted">${_esc(r.country || '—')}</td>
      <td>${r.cv_url
        ? `<a href="${_esc(r.cv_url)}" target="_blank" rel="noopener" class="cv-link">
             <svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
             Voir CV
           </a>`
        : '<span style="color:var(--border);">—</span>'
      }</td>
    </tr>`).join('');
}

/* =====================
   ENTREPRISES
===================== */
async function loadCompanies() {
  const tbody = document.getElementById('companiesTbody');
  if (!tbody) return;
  tbody.innerHTML = '<tr class="empty-row"><td colspan="7">Chargement...</td></tr>';

  try {
    const token = sessionStorage.getItem('talentyah_token');
    const res   = await fetch(API + '/api/companies', { headers: { 'Authorization': 'Bearer ' + token }});
    const data  = await res.json();
    _renderCompanies(tbody, data.companies || data);
    const badge = document.getElementById('countCompanies');
    if (badge) badge.textContent = (data.companies || data).length;
  } catch {
    _renderCompanies(tbody, []);
  }
}

function _renderCompanies(tbody, rows) {
  if (!rows || !rows.length) {
    tbody.innerHTML = '<tr class="empty-row"><td colspan="7">Aucune demande recue pour le moment.</td></tr>';
    return;
  }
  const urgencyMap = {
    elevee:  '<span class="badge badge-high">Elevee</span>',
    moyenne: '<span class="badge badge-mid">Moyenne</span>',
    faible:  '<span class="badge badge-low">Faible</span>',
  };
  tbody.innerHTML = rows.map(r => `
    <tr>
      <td class="muted nowrap">${_fmtDate(r.created_at)}</td>
      <td><strong>${_esc(r.company_name || '—')}</strong></td>
      <td class="td-email"><a href="mailto:${_esc(r.email)}">${_esc(r.email)}</a></td>
      <td class="muted">${_esc(r.region || '—')}</td>
      <td>${_esc(r.role_needed || '—')}</td>
      <td>${urgencyMap[r.urgency] || '<span class="badge">—</span>'}</td>
      <td class="truncate muted" title="${_esc(r.message || '')}">${_esc(r.message || '—')}</td>
    </tr>`).join('');
}

/* =====================
   OFFRES
===================== */
async function loadJobs() {
  const tbody = document.getElementById('jobsTbody');
  if (!tbody) return;
  tbody.innerHTML = '<tr class="empty-row"><td colspan="7">Chargement...</td></tr>';

  try {
    const res  = await fetch(API + '/api/jobs');
    const data = await res.json();
    _renderJobs(tbody, data.jobs || data);
    const badge = document.getElementById('countJobs');
    if (badge) badge.textContent = (data.jobs || data).length;
  } catch {
    _renderJobs(tbody, []);
  }
}

function _renderJobs(tbody, rows) {
  if (!rows || !rows.length) {
    tbody.innerHTML = '<tr class="empty-row"><td colspan="7">Aucune offre publiee pour le moment.</td></tr>';
    return;
  }
  tbody.innerHTML = rows.map(r => `
    <tr>
      <td class="muted nowrap">${_fmtDate(r.created_at)}</td>
      <td><strong>${_esc(r.title)}</strong></td>
      <td class="muted">${[r.city, r.country].filter(Boolean).map(_esc).join(', ') || '—'}</td>
      <td class="muted">${_esc(r.sector || '—')}</td>
      <td class="muted">${_esc(r.contract_type || '—')}</td>
      <td><span class="badge ${r.active !== false ? 'badge-active' : 'badge-closed'}">${r.active !== false ? 'Active' : 'Fermee'}</span></td>
      <td><button class="btn-delete" type="button" onclick="deleteJob(${r.id})">Supprimer</button></td>
    </tr>`).join('');
}

async function deleteJob(id) {
  if (!confirm('Supprimer cette offre definitivement ?')) return;
  try {
    const token = sessionStorage.getItem('talentyah_token');
    await fetch(API + '/api/jobs/' + id, {
      method: 'DELETE', headers: { 'Authorization': 'Bearer ' + token }
    });
  } catch { /* silently fail en dev */ }
  loadJobs();
}

/* =====================
   HELPERS
===================== */
function _fmtDate(d) {
  if (!d) return '—';
  const dt = new Date(d);
  return isNaN(dt) ? '—' : dt.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}
function _esc(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function _showMsg(el, text, type) {
  if (!el) return;
  el.textContent = text;
  el.className = 'admin-msg ' + type + ' show';
}
function _hideMsg(el) {
  if (el) { el.textContent = ''; el.className = 'admin-msg'; }
}