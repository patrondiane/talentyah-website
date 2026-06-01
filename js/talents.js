/* =====================================================
   TALENTYAH — talents.js
   Scripts spécifiques à la page Talents
===================================================== */

window._talentsJsLoaded = true;

document.addEventListener('DOMContentLoaded', () => {

  /* ── Charger max 4 offres depuis l'API ── */
  (async function loadJobsPreview() {
    const container = document.getElementById('jobsPreview');
    const section   = document.getElementById('offres');
    if (!container) return;

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

    function cardHTML(job) {
      return `
        <article class="job-card" onclick="window.location='offre.html?id=${job.id}'">
          <div>
            <div class="job-top">
              ${_sectorBadge(job.sector)}
              <span style="font-size:11px;font-weight:600;padding:3px 10px;border-radius:999px;background:rgba(83,74,183,0.10);color:#3C3489;">${job.contract_type || ''}</span>
              <span class="job-location">📍 ${[job.city, job.country].filter(Boolean).join(', ')}</span>
            </div>
            <h3 class="job-title">${job.title}</h3>
            ${job.description ? `<p class="job-desc">${job.description.substring(0, 110)}…</p>` : ''}
          </div>
          <div class="job-footer">
            ${job.salary ? `<span class="job-salary">${job.salary}</span>` : ''}
            <a href="offre.html?id=${job.id}" class="job-link" onclick="event.stopPropagation()">Postuler →</a>
          </div>
        </article>`;
    }

    try {
      const res  = await fetch('https://talentyah-website.onrender.com/api/jobs');
      const data = await res.json();
      const jobs = (data.jobs || []).slice(0, 4);

      if (!jobs.length) {
        container.innerHTML = `
          <div style="text-align:center;padding:48px 20px;background:var(--white);border:1px solid var(--border);border-radius:10px;">
            <p style="font-size:15px;color:var(--muted);margin-bottom:20px;">Aucune offre disponible en ce moment.</p>
            <a href="talents.html#candidature" style="display:inline-block;background:var(--emerald);color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-size:14px;font-weight:600;">
              Déposer une candidature spontanée →
            </a>
          </div>`;
        return;
      }
      container.innerHTML = jobs.map(cardHTML).join('');

    } catch {
      if (typeof JOBS_DATA !== 'undefined' && JOBS_DATA.length) {
        container.innerHTML = JOBS_DATA.slice(0, 4).map(cardHTML).join('');
      } else {
        container.innerHTML = `
          <div style="text-align:center;padding:48px 20px;background:var(--white);border:1px solid var(--border);border-radius:10px;">
            <p style="font-size:15px;color:var(--muted);margin-bottom:20px;">Aucune offre disponible en ce moment.</p>
            <a href="talents.html#candidature" style="display:inline-block;background:var(--emerald);color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-size:14px;font-weight:600;">
              Déposer une candidature spontanée →
            </a>
          </div>`;
      }
    }
  })();

  /* =====================
     FILE UPLOAD — affichage nom du fichier
  ===================== */
  const fileInput = document.getElementById('cv_upload');
  const fileLabel = document.getElementById('fileLabel');
  const fileLabelEl = document.querySelector('.file-label');

  if (fileInput && fileLabel) {
    fileInput.addEventListener('change', () => {
      const file = fileInput.files[0];
      if (file) {
        fileLabel.textContent = `✓ ${file.name}`;
        if (fileLabelEl) fileLabelEl.classList.add('has-file');
      } else {
        fileLabel.textContent = 'Cliquez pour ajouter votre CV';
        if (fileLabelEl) fileLabelEl.classList.remove('has-file');
      }
    });
  }

  /* =====================
     SMOOTH SCROLL vers sections
     (les ancres #accompagnement, #offres, #candidature)
  ===================== */
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
      const target = document.querySelector(anchor.getAttribute('href'));
      if (!target) return;
      e.preventDefault();
      const offset = 80; // hauteur navbar
      const top = target.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: 'smooth' });
    });
  });

  /* =====================
     ENVOI FORMULAIRE CANDIDAT (FormData + CV)
  ===================== */
  const form = document.getElementById('candidateForm');
  const successBox = document.getElementById('candidateSuccess');

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      try {
        // Vérifie que le CV est bien sélectionné
        if (fileInput && (!fileInput.files || !fileInput.files[0])) {
          alert("Veuillez ajouter votre CV avant d'envoyer.");
          return;
        }

        const fd = new FormData(form);

        for (const [k, v] of fd.entries()) {
          console.log(k, v);
        }


        // IMPORTANT : le champ fichier doit s'appeler "cv"
        // Ton input est name="cv" => OK.
        // Si jamais tu changes le name, il faudra faire : fd.set('cv', fileInput.files[0]);

        console.log("Submit OK — envoi en cours...");

        await window.apiFetch('/candidates', {
          method: 'POST',
          body: fd
          // ⚠️ Ne pas mettre Content-Type : le navigateur gère le boundary
        });

        form.reset();
        if (successBox) successBox.style.display = 'block';

        // Reset label fichier
        if (fileLabel) fileLabel.textContent = 'Cliquez pour ajouter votre CV';
        if (fileLabelEl) fileLabelEl.classList.remove('has-file');

      } catch (err) {
        console.error(err);
        alert("Erreur lors de l'envoi : " + err.message);
      }
    });
  }

});