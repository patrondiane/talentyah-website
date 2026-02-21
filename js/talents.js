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

});