/* =====================================================
   TALENTYAH — talents.js
   Scripts spécifiques à la page Talents
===================================================== */

document.addEventListener('DOMContentLoaded', () => {

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