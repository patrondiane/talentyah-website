/* =====================================================
   TALENTYAH — carrieres.js
   Filtrage, recherche et affichage des offres
===================================================== */

const API = window.API_BASE;
let allJobs = [];

document.addEventListener('DOMContentLoaded', () => {
  loadJobs();
  document.getElementById('searchBtn')?.addEventListener('click', filterJobs);
  document.getElementById('searchKeyword')?.addEventListener('keydown', e => { if (e.key === 'Enter') filterJobs(); });
  document.getElementById('searchKeyword')?.addEventListener('input', filterJobs);
  document.getElementById('searchCountry')?.addEventListener('input', filterJobs);
  document.getElementById('searchSector')?.addEventListener('change', filterJobs);
  document.querySelectorAll('.filter-option input').forEach(cb => cb.addEventListener('change', filterJobs));
  document.getElementById('resetFilters')?.addEventListener('click', resetAll);
  document.getElementById('sortSelect')?.addEventListener('change', filterJobs);
});

async function loadJobs() {
  try {
    const res  = await fetch(API + '/api/jobs');
    const data = await res.json();
    allJobs = data.jobs || data;
  } catch {
    allJobs = [];
  }
  buildDynamicFilters(allJobs);
  renderJobs(allJobs);
  updateCount(allJobs.length);
  updateFilterCounts(allJobs);
}

// Construit dynamiquement les filtres secteurs depuis les jobs réels
function buildDynamicFilters(jobs) {
  // -- Secteurs dynamiques --
  const sectors = {};
  const types   = {};
  const countries = {};
  jobs.forEach(j => {
    if (j.sector)        sectors[j.sector]              = (sectors[j.sector] || 0) + 1;
    if (j.contract_type) types[j.contract_type]         = (types[j.contract_type] || 0) + 1;
    if (j.country)       countries[j.country.trim()]    = (countries[j.country.trim()] || 0) + 1;
  });

  // Reconstruire le bloc sidebar Secteurs
  const sectorBlock = document.getElementById('sectorFilterOptions');
  if (sectorBlock) {
    if (Object.keys(sectors).length === 0) {
      sectorBlock.innerHTML = '<p style="font-size:12px;color:var(--muted);">Aucun secteur disponible</p>';
    } else {
      sectorBlock.innerHTML = Object.entries(sectors)
        .sort((a, b) => b[1] - a[1])
        .map(([sector, count]) => `
          <label class="filter-option">
            <input type="checkbox" data-group="sector" value="${sector}">
            <span class="filter-option-label">${sector}</span>
            <span class="filter-option-count">${count}</span>
          </label>`).join('');
      // Réattacher les listeners
      sectorBlock.querySelectorAll('input').forEach(cb => cb.addEventListener('change', () => { _updateCheckedStyle(cb); filterJobs(); }));
    }
  }

  // Reconstruire le select secteur dans la barre de recherche
  const sectorSelect = document.getElementById('searchSector');
  if (sectorSelect) {
    sectorSelect.innerHTML = '<option value="">Tous les secteurs</option>' +
      Object.keys(sectors).sort().map(s => `<option value="${s}">${s}</option>`).join('');
    if (typeof rebuildCustomSelect !== 'undefined') {
      rebuildCustomSelect(sectorSelect);
    }
  }

  // Mettre à jour les compteurs types de contrat
  const typeBlock = document.getElementById('typeFilterOptions');
  if (typeBlock) {
    typeBlock.innerHTML = Object.entries(types)
      .sort((a, b) => b[1] - a[1])
      .map(([type, count]) => `
        <label class="filter-option">
          <input type="checkbox" data-group="type" value="${type}">
          <span class="filter-option-label">${type}</span>
          <span class="filter-option-count">${count}</span>
        </label>`).join('');
    typeBlock.querySelectorAll('input').forEach(cb => cb.addEventListener('change', () => { _updateCheckedStyle(cb); filterJobs(); }));
  }

  // Mettre à jour les pays
  const countryBlock = document.getElementById('countryFilterOptions');
  if (countryBlock) {
    countryBlock.innerHTML = Object.entries(countries)
      .sort((a, b) => b[1] - a[1])
      .map(([country, count]) => `
        <label class="filter-option">
          <input type="checkbox" data-group="country" value="${country}">
          <span class="filter-option-label">${country}</span>
          <span class="filter-option-count">${count}</span>
        </label>`).join('');
    countryBlock.querySelectorAll('input').forEach(cb => cb.addEventListener('change', () => { _updateCheckedStyle(cb); filterJobs(); }));
  }
}

// Met à jour les compteurs visibles à côté des filtres sidebar
function updateFilterCounts(jobs) {
  const bySector  = {};
  const byType    = {};
  const byCountry = {};

  jobs.forEach(j => {
    if (j.sector)        bySector[j.sector]            = (bySector[j.sector]          || 0) + 1;
    if (j.contract_type) byType[j.contract_type]        = (byType[j.contract_type]      || 0) + 1;
    if (j.country)       byCountry[j.country.trim()]    = (byCountry[j.country.trim()]  || 0) + 1;
  });

  // Mettre à jour uniquement le .filter-option-count déjà dans le DOM (généré par buildDynamicFilters)
  document.querySelectorAll('.filter-option input[data-group]').forEach(cb => {
    const group = cb.dataset.group;
    const val   = cb.value;
    let count = 0;
    if (group === 'sector')  count = bySector[val]  || 0;
    if (group === 'type')    count = byType[val]    || 0;
    if (group === 'country') count = byCountry[val] || 0;

    const countEl = cb.closest('.filter-option')?.querySelector('.filter-option-count');
    if (countEl) countEl.textContent = count;

    // Style visuel : griser si 0 offres
    const option = cb.closest('.filter-option');
    if (option) option.style.opacity = count === 0 ? '0.4' : '1';
  });
}

function _updateCheckedStyle(_cb) { /* géré par CSS :has(:checked) */ }

function filterJobs() {
  const keyword = (document.getElementById('searchKeyword')?.value || '').toLowerCase().trim();
  const country = (document.getElementById('searchCountry')?.value  || '').toLowerCase().trim();
  const sector  = (document.getElementById('searchSector')?.value   || '').toLowerCase();
  const checkedTypes     = getChecked('type');
  const checkedSectors   = getChecked('sector');
  const checkedCountries = getChecked('country');

  let filtered = allJobs.filter(job => {
    const titleMatch   = !keyword || job.title.toLowerCase().includes(keyword) || (job.description || '').toLowerCase().includes(keyword);
    const countryMatch = !country || (job.country || '').toLowerCase().includes(country) || (job.city || '').toLowerCase().includes(country);
    const sectorMatch  = !sector  || (job.sector || '').toLowerCase().includes(sector);
    const typeFilter   = checkedTypes.length     === 0 || checkedTypes.includes(job.contract_type);
    const secFilter    = checkedSectors.length   === 0 || checkedSectors.some(s => (job.sector || '').toLowerCase().includes(s.toLowerCase()));
    const ctryFilter   = checkedCountries.length === 0 || checkedCountries.some(c => (job.country || '').toLowerCase().includes(c.toLowerCase()));
    return titleMatch && countryMatch && sectorMatch && typeFilter && secFilter && ctryFilter;
  });

  const sort = document.getElementById('sortSelect')?.value || 'recent';
  if (sort === 'recent') filtered.sort((a, b) => b.id - a.id);
  if (sort === 'alpha')  filtered.sort((a, b) => a.title.localeCompare(b.title));

  renderJobs(filtered);
  updateCount(filtered.length);
}

function _sectorBadge(sector) {
  if (!sector) return '';
  const map = {
    'Finance':    ['rgba(26,92,69,0.10)',   '#085041'],
    'RH':         ['rgba(186,117,23,0.15)', '#633806'],
    'Tech':       ['rgba(24,95,165,0.10)',  '#0C447C'],
    'Commercial': ['rgba(180,40,40,0.10)',  '#791F1F'],
    'Juridique':  ['rgba(83,74,183,0.10)',  '#3C3489'],
    'Marketing':  ['rgba(216,90,48,0.10)',  '#4A1B0C'],
  };
  const [bg, col] = map[sector] || ['rgba(100,100,100,0.10)', '#555'];
  return `<span style="font-size:11px;font-weight:600;padding:3px 10px;border-radius:999px;background:${bg};color:${col};">${sector}</span>`;
}

function renderJobs(jobs) {
  const list = document.getElementById('jobsList');
  if (!list) return;

  if (!jobs || jobs.length === 0) {
    list.innerHTML = `
      <div class="jobs-empty">
        <i data-lucide="briefcase" style="width:48px;height:48px;stroke-width:1.25;color:var(--muted);"></i>
        <h3>Aucune offre disponible en ce moment</h3>
        <p>Nous publions régulièrement de nouvelles opportunités. Déposez votre candidature spontanée et nous vous contacterons dès qu'un poste correspond à votre profil.</p>
        <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;margin-top:24px;">
          <a href="talents.html#candidature" class="btn-gold" style="display:inline-flex;align-items:center;gap:8px;padding:13px 24px;background:var(--emerald);color:#fff;text-decoration:none;font-size:14px;font-weight:600;border-radius:6px;">
            Déposer ma candidature →
          </a>
          <a href="contact.html" style="display:inline-flex;align-items:center;gap:8px;padding:13px 24px;border:1px solid var(--border);color:var(--dark);text-decoration:none;font-size:14px;font-weight:600;border-radius:6px;">
            Nous contacter
          </a>
        </div>
      </div>`;
    if (typeof lucide !== 'undefined') lucide.createIcons();
    return;
  }

  function stripHtml(html) { return (html || '').replace(/<[^>]*>?/gm, '').trim(); }

  list.innerHTML = jobs.map(job => `
    <article class="job-card" onclick="window.location='offre.html?id=${job.id}'">
      <div>
        <div class="job-top">
          ${_sectorBadge(job.sector)}
          <span style="font-size:11px;font-weight:600;padding:3px 10px;border-radius:999px;background:rgba(83,74,183,0.10);color:#3C3489;">${job.contract_type || ''}</span>
          ${job.is_new ? '<span class="job-badge-new">Nouveau</span>' : ''}
          <span class="job-location" style="display:inline-flex;align-items:center;gap:4px;"><i data-lucide="map-pin" style="width:13px;height:13px;"></i> ${[job.city, job.country].filter(Boolean).join(', ')}</span>
        </div>
        <h3 class="job-title">${job.title}</h3>
        ${job.description ? `<p class="job-desc">${stripHtml(job.description).substring(0, 130)}…</p>` : ''}
        ${(() => { const tags = Array.isArray(job.tags) ? job.tags : (job.tags || '').split(',').map(t => t.trim()).filter(Boolean); return tags.length ? `<div class="job-tags">${tags.map(t => `<span class="job-tag">${t}</span>`).join('')}</div>` : ''; })()}
      </div>
      <div class="job-footer">
        ${job.salary ? `<span class="job-salary">${job.salary}</span>` : ''}
        <a href="offre.html?id=${job.id}" class="job-link" onclick="event.stopPropagation()">Postuler →</a>
      </div>
    </article>
  `).join('');
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

function updateCount(n) {
  const el = document.getElementById('jobsCount');
  if (el) el.innerHTML = `<strong>${n}</strong> offre${n > 1 ? 's' : ''} disponible${n > 1 ? 's' : ''}`;
}

function getChecked(group) {
  return [...document.querySelectorAll(`.filter-option input[data-group="${group}"]:checked`)].map(cb => cb.value);
}

function resetAll() {
  const kw = document.getElementById('searchKeyword');
  const ct = document.getElementById('searchCountry');
  const sc = document.getElementById('searchSector');
  if (kw) kw.value = '';
  if (ct) ct.value = '';
  if (sc) sc.value = '';
  document.querySelectorAll('.filter-option input').forEach(cb => {
    cb.checked = false;
    _updateCheckedStyle(cb);
  });
  renderJobs(allJobs);
  updateCount(allJobs.length);
  updateFilterCounts(allJobs);
}

/* Échappe les caractères HTML pour éviter les injections */
function esc(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}