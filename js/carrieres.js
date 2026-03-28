/* =====================================================
   TALENTYAH — carrieres.js
   Filtrage, recherche et affichage des offres
===================================================== */

const API = 'http://localhost:4000';
let allJobs = [];

document.addEventListener('DOMContentLoaded', () => {
  loadJobs();
  document.getElementById('searchBtn')?.addEventListener('click', filterJobs);
  document.getElementById('searchKeyword')?.addEventListener('keydown', e => { if (e.key === 'Enter') filterJobs(); });
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
    allJobs = JOBS_DATA;
  }
  renderJobs(allJobs);
  updateCount(allJobs.length);
}

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

function renderJobs(jobs) {
  const list = document.getElementById('jobsList');
  if (!list) return;

  if (!jobs || jobs.length === 0) {
    list.innerHTML = `
      <div class="jobs-empty">
        <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
        <h3>Aucune offre correspondante</h3>
        <p>Modifiez vos critères ou déposez une candidature spontanée.</p>
      </div>`;
    return;
  }

  list.innerHTML = jobs.map(job => `
    <article class="job-card" onclick="window.location='offre.html?id=${job.id}'" style="cursor:pointer;">
      <div class="job-top">
        <span class="job-location">${job.city}, ${job.country}</span>
        <div style="display:flex;align-items:center;gap:8px;">
          ${job.is_new ? '<span class="job-badge-new">Nouveau</span>' : ''}
          <span class="job-type">${job.contract_type}</span>
        </div>
      </div>
      <h3 class="job-title">${job.title}</h3>
      <p class="job-desc">${job.description}</p>
      ${job.tags && job.tags.length ? `<div class="job-tags">${job.tags.map(t => `<span class="job-tag">${t}</span>`).join('')}</div>` : ''}
      <div class="job-footer">
        <span class="job-salary">${job.salary}</span>
        <a href="offre.html?id=${job.id}" class="job-link" onclick="event.stopPropagation()">Postuler &#8594;</a>
      </div>
    </article>
  `).join('');
}

function updateCount(n) {
  const el = document.getElementById('jobsCount');
  if (el) el.innerHTML = `<strong>${n}</strong> offre${n > 1 ? 's' : ''} disponible${n > 1 ? 's' : ''}`;
}

function getChecked(group) {
  return [...document.querySelectorAll(`.filter-option input[data-group="${group}"]:checked`)].map(cb => cb.value);
}

function resetAll() {
  document.getElementById('searchKeyword').value = '';
  document.getElementById('searchCountry').value = '';
  document.getElementById('searchSector').value  = '';
  document.querySelectorAll('.filter-option input').forEach(cb => cb.checked = false);
  renderJobs(allJobs);
  updateCount(allJobs.length);
}

/* Échappe les caractères HTML pour éviter les injections */
function esc(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}