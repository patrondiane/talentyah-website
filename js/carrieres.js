/* =====================================================
   TALENTYAH — carrieres.js
   Filtrage, recherche et chargement des offres
===================================================== */

const API = 'http://localhost:4000';

/* Offres de demo (affichees quand le backend n'est pas disponible) */
const DEMO_JOBS = [
  {
    id: 1, title: 'Responsable Administratif et Financier',
    city: 'Dakar', country: 'Senegal', contract_type: 'CDI',
    sector: 'Finance', salary: '2 500 – 3 500 EUR / mois',
    description: 'Pilotage financier, structuration des process et accompagnement de la direction au sein d\'une PME en forte croissance.',
    tags: ['Finance', 'Gestion', 'Management'], is_new: true
  },
  {
    id: 2, title: 'Charge(e) des Ressources Humaines',
    city: 'Abidjan', country: 'Cote d\'Ivoire', contract_type: 'CDD',
    sector: 'Ressources humaines', salary: '1 200 – 1 800 EUR / mois',
    description: 'Recrutement operationnel, onboarding, suivi administratif RH et appui au developpement des talents.',
    tags: ['RH', 'Recrutement'], is_new: false
  },
  {
    id: 3, title: 'Business Analyst – Data & Reporting',
    city: 'Nairobi', country: 'Kenya', contract_type: 'Freelance',
    sector: 'Tech / Data', salary: '250 – 350 EUR / jour',
    description: 'Mission data / reporting : cadrage des besoins metier, creation de dashboards et amelioration de la qualite des donnees.',
    tags: ['Data', 'Analyse', 'Reporting'], is_new: true
  },
  {
    id: 4, title: 'Directeur Commercial Afrique de l\'Ouest',
    city: 'Abidjan', country: 'Cote d\'Ivoire', contract_type: 'CDI',
    sector: 'Commerce', salary: '4 000 – 5 500 EUR / mois',
    description: 'Developpement du portefeuille clients B2B, management d\'une equipe commerciale et definition de la strategie de croissance.',
    tags: ['Commercial', 'Management', 'Strategie'], is_new: false
  },
  {
    id: 5, title: 'Chef de Projet Digital',
    city: 'Casablanca', country: 'Maroc', contract_type: 'CDI',
    sector: 'Tech / Digital', salary: '2 000 – 2 800 EUR / mois',
    description: 'Pilotage de projets de transformation digitale, coordination des equipes techniques et metier, suivi des KPIs.',
    tags: ['Digital', 'Gestion de projet'], is_new: true
  },
  {
    id: 6, title: 'Responsable Marketing & Communication',
    city: 'Paris', country: 'France', contract_type: 'CDI',
    sector: 'Marketing', salary: '3 000 – 3 800 EUR / mois',
    description: 'Strategie de marque, gestion des reseaux sociaux, production de contenus et coordination des campagnes pour un acteur panafricain.',
    tags: ['Marketing', 'Communication', 'Branding'], is_new: false
  },
];

let allJobs     = [];
let activeFilters = { types: [], sectors: [], countries: [] };

document.addEventListener('DOMContentLoaded', () => {
  loadJobs();

  /* Recherche */
  document.getElementById('searchBtn')?.addEventListener('click', filterJobs);
  document.getElementById('searchKeyword')?.addEventListener('keydown', e => { if (e.key === 'Enter') filterJobs(); });

  /* Filtres sidebar */
  document.querySelectorAll('.filter-option input').forEach(cb => {
    cb.addEventListener('change', filterJobs);
  });

  /* Reset */
  document.getElementById('resetFilters')?.addEventListener('click', resetAll);

  /* Sort */
  document.getElementById('sortSelect')?.addEventListener('change', filterJobs);
});

async function loadJobs() {
  try {
    const res  = await fetch(API + '/api/jobs');
    const data = await res.json();
    allJobs = data.jobs || data;
  } catch {
    allJobs = DEMO_JOBS;
  }
  renderJobs(allJobs);
  updateCount(allJobs.length);
}

function filterJobs() {
  const keyword = (document.getElementById('searchKeyword')?.value || '').toLowerCase().trim();
  const country = (document.getElementById('searchCountry')?.value || '').toLowerCase().trim();
  const sector  = (document.getElementById('searchSector')?.value  || '').toLowerCase();

  const checkedTypes    = getChecked('type');
  const checkedSectors  = getChecked('sector');
  const checkedCountries= getChecked('country');

  let filtered = allJobs.filter(job => {
    const titleMatch  = !keyword || job.title.toLowerCase().includes(keyword) || (job.description||'').toLowerCase().includes(keyword);
    const countryMatch= !country || (job.country||'').toLowerCase().includes(country) || (job.city||'').toLowerCase().includes(country);
    const sectorMatch = !sector  || (job.sector||'').toLowerCase().includes(sector);
    const typeFilter  = checkedTypes.length    === 0 || checkedTypes.includes(job.contract_type);
    const secFilter   = checkedSectors.length  === 0 || checkedSectors.some(s => (job.sector||'').toLowerCase().includes(s.toLowerCase()));
    const ctryFilter  = checkedCountries.length=== 0 || checkedCountries.some(c => (job.country||'').toLowerCase().includes(c.toLowerCase()));
    return titleMatch && countryMatch && sectorMatch && typeFilter && secFilter && ctryFilter;
  });

  /* Sort */
  const sort = document.getElementById('sortSelect')?.value || 'recent';
  if (sort === 'recent') filtered.sort((a, b) => (b.id||0) - (a.id||0));
  if (sort === 'alpha')  filtered.sort((a, b) => a.title.localeCompare(b.title));

  renderJobs(filtered);
  updateCount(filtered.length);
}

function renderJobs(jobs) {
  const list = document.getElementById('jobsList');
  if (!list) return;

  if (!jobs.length) {
    list.innerHTML = `
      <div class="jobs-empty">
        <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
        <h3>Aucune offre correspondante</h3>
        <p>Modifiez vos criteres ou deposez une candidature spontanee.</p>
      </div>`;
    return;
  }

  list.innerHTML = jobs.map(job => `
    <div class="job-card reveal">
      <div class="job-card-inner">
        <div>
          <div class="job-card-meta">
            <span class="job-location">
              <svg viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
              ${_esc(job.city||'')}${job.city && job.country ? ', ':''}${_esc(job.country||'')}
            </span>
            <span class="job-type">${_esc(job.contract_type||'')}</span>
            ${job.is_new ? '<span class="job-new">Nouveau</span>' : ''}
          </div>
          <h3 class="job-card-title">${_esc(job.title)}</h3>
          <p class="job-card-desc">${_esc(job.description||'')}</p>
          ${job.tags && job.tags.length ? `
          <div class="job-card-footer">
            ${job.tags.map(t => `<span class="job-tag">${_esc(t)}</span>`).join('')}
          </div>` : ''}
        </div>
        <div class="job-card-right">
          ${job.salary ? `<span class="job-salary">${_esc(job.salary)}</span>` : ''}
          <a href="talents.html#candidature" class="btn-job-apply">
            Postuler <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
          </a>
        </div>
      </div>
    </div>`).join('');

  /* Re-activer le reveal observer sur les nouvelles cartes */
  if (window.revealObserver) {
    list.querySelectorAll('.reveal').forEach(el => window.revealObserver.observe(el));
  }
}

function updateCount(n) {
  const el = document.getElementById('jobsCount');
  if (el) el.innerHTML = `<strong>${n}</strong> offre${n > 1 ? 's' : ''} disponible${n > 1 ? 's' : ''}`;
}

function getChecked(name) {
  return [...document.querySelectorAll(`.filter-option input[data-group="${name}"]:checked`)]
    .map(cb => cb.value);
}

function resetAll() {
  document.getElementById('searchKeyword').value = '';
  document.getElementById('searchCountry').value = '';
  document.getElementById('searchSector').value  = '';
  document.querySelectorAll('.filter-option input').forEach(cb => cb.checked = false);
  renderJobs(allJobs);
  updateCount(allJobs.length);
}

function _esc(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}