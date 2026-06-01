/* =====================================================
   TALENTYAH — offre.js
   Affichage dynamique d'une offre + postulation
===================================================== */

const API_OFFRE = 'https://talentyah-website.onrender.com';

document.addEventListener('DOMContentLoaded', async () => {

  const params = new URLSearchParams(window.location.search);
  const jobId  = parseInt(params.get('id'), 10);

  // 1. Charger l'offre depuis l'API, fallback JOBS_DATA
  let job = null;
  try {
    const res = await fetch(API_OFFRE + '/api/jobs/' + jobId);
    if (res.ok) job = await res.json();
  } catch { /* silencieux */ }

  // Fallback fichier statique
  if (!job && typeof JOBS_DATA !== 'undefined') {
    job = JOBS_DATA.find(j => j.id === jobId) || null;
  }

  if (job) {
    renderJobDetails(job);
  } else {
    showError();
    return;
  }

  // 2. Label fichier CV
  const fileInput  = document.getElementById('cv_upload');
  const fileLabel  = document.getElementById('fileLabel');
  if (fileInput && fileLabel) {
    fileInput.addEventListener('change', () => {
      const file = fileInput.files[0];
      fileLabel.textContent = file ? `✓ ${file.name}` : 'Cliquez pour ajouter votre CV';
      if (file) fileLabel.parentElement.classList.add('has-file');
      else      fileLabel.parentElement.classList.remove('has-file');
    });
  }

  // 3. Soumission formulaire candidature
  const form = document.getElementById('offreForm');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn        = form.querySelector('.btn-submit');
      const successBox = document.getElementById('offreSuccess');

      btn.textContent = 'Envoi en cours…';
      btn.disabled    = true;

      try {
        // Vérifier la taille du CV (max 4 Mo pour Render)
        if (fileInput && fileInput.files[0] && fileInput.files[0].size > 4 * 1024 * 1024) {
          btn.disabled = false; btn.textContent = 'Postuler →';
          alert('Votre CV est trop lourd (' + (fileInput.files[0].size / 1024 / 1024).toFixed(1) + ' Mo).\nTaille maximum : 4 Mo.\nCompressez votre PDF avant de l\'envoyer.');
          return;
        }

        const formData = new FormData(form);
        if (fileInput && fileInput.files[0]) {
          formData.set('cv', fileInput.files[0]);
        }

        const res = await fetch(API_OFFRE + '/api/candidates', {
          method: 'POST',
          body: formData
          // Pas de Content-Type : le navigateur gère le boundary multipart
        });

        if (res.ok) {
          form.style.opacity      = '0.3';
          form.style.pointerEvents = 'none';
          if (successBox) successBox.style.display = 'block';
          btn.textContent = 'Candidature envoyée !';
        } else {
          const data = await res.json();
          alert(data.error || 'Erreur lors de l\'envoi. Veuillez réessayer.');
          btn.disabled    = false;
          btn.textContent = 'Réessayer';
        }
      } catch (err) {
        console.error('Erreur soumission:', err);
        alert('Une erreur réseau est survenue. Veuillez réessayer.');
        btn.disabled    = false;
        btn.textContent = 'Réessayer';
      }
    });
  }
});

function renderJobDetails(job) {
  document.title = `${job.title} — Talentyah`;

  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val || ''; };
  set('jobTitle',  job.title);
  set('jobSector', job.sector);

  // jobMeta = localisation + contrat + salaire dans le hero
  const location = [job.city, job.country].filter(Boolean).join(', ');
  const meta     = [location, job.contract_type, job.salary].filter(Boolean).join(' · ');
  set('jobMeta',   meta);

  // IDs optionnels si présents dans le HTML
  const showBadge = (id, val) => {
    const el = document.getElementById(id);
    if (el && val) { el.textContent = val; el.style.display = 'inline-block'; }
  };
  showBadge('jobLocation', '📍 ' + location);
  showBadge('jobContract', job.contract_type);
  showBadge('jobSalary',   job.salary);

  // Description
  const descEl = document.getElementById('offreDescription');
  if (descEl) {
    // Préserver les sauts de ligne
    descEl.innerHTML = (job.description || '').split('\n').join('<br>');
  }

  const hiddenId = document.getElementById('hiddenJobId');
  if (hiddenId) hiddenId.value = job.id;

  // Remplir les champs cachés pour la candidature
  const hiddenTitle = document.getElementById('hiddenJobTitle');
  if (hiddenTitle) hiddenTitle.value = job.title || '';

  const hiddenSector = document.getElementById('hiddenJobSector');
  if (hiddenSector) hiddenSector.value = job.sector || '';

  // Profil recherché
  const profilList = document.getElementById('profilList');
  if (profilList && job.requirements) {
    const reqs = Array.isArray(job.requirements)
      ? job.requirements
      : job.requirements.split('\n').filter(Boolean);
    profilList.innerHTML = reqs.map(r => `
      <li style="display:flex;align-items:flex-start;gap:10px;font-size:14px;color:var(--dark);line-height:1.6;">
        <span style="color:var(--emerald);font-size:16px;flex-shrink:0;margin-top:1px;">✓</span>
        <span>${r}</span>
      </li>`).join('');
  }

  // Tags
  const tagsEl = document.getElementById('jobTags');
  if (tagsEl && job.tags) {
    const tags = Array.isArray(job.tags) ? job.tags : (job.tags || '').split(',').filter(Boolean);
    tagsEl.innerHTML = tags.map(t => `<span class="job-tag">${t.trim()}</span>`).join('');
  }

  // Salaire
  const salaryEl = document.getElementById('jobSalary');
  if (salaryEl && job.salary) salaryEl.textContent = job.salary;
}

function showError() {
  const container = document.querySelector('.offre-grid') || document.querySelector('main');
  if (container) {
    container.innerHTML = `
      <div style="text-align:center;padding:100px 0;">
        <h2>Offre introuvable</h2>
        <p>Ce poste n'est plus disponible ou le lien est incorrect.</p>
        <a href="carrieres.html" style="display:inline-block;margin-top:20px;">← Voir toutes les offres</a>
      </div>`;
  }
}