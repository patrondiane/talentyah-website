/* =====================================================
   TALENTYAH — script.js (JS partage)
===================================================== */

document.addEventListener('DOMContentLoaded', () => {

  /* ---- HAMBURGER ---- */
  const hamburger = document.getElementById('hamburger');
  const mainNav   = document.getElementById('main-nav');

  if (hamburger && mainNav) {
    hamburger.addEventListener('click', () => mainNav.classList.toggle('open'));
    mainNav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => mainNav.classList.remove('open')));
    document.addEventListener('click', (e) => {
      if (!hamburger.contains(e.target) && !mainNav.contains(e.target))
        mainNav.classList.remove('open');
    });
  }

  /* ---- HEADER OMBRE AU SCROLL ---- */
  const header = document.getElementById('header');
  if (header) {
    window.addEventListener('scroll', () => {
      header.style.boxShadow = window.scrollY > 40 ? '0 2px 20px rgba(0,0,0,0.08)' : 'none';
    }, { passive: true });
  }

  /* ---- SCROLL REVEAL (classe .reveal) ---- */
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  document.querySelectorAll('.reveal').forEach((el, i) => {
    el.style.transitionDelay = (i % 4) * 0.08 + 's';
    revealObserver.observe(el);
  });

  /* ---- ACCORDION OFFRES ---- */
  document.querySelectorAll('.offre-header').forEach(hdr => {
    hdr.addEventListener('click', () => {
      const item   = hdr.closest('.offre-item');
      const isOpen = item.classList.contains('open');
      document.querySelectorAll('.offre-item').forEach(i => i.classList.remove('open'));
      if (!isOpen) item.classList.add('open');
    });
  });

  /* ---- SMOOTH SCROLL ancres internes ---- */
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
      const target = document.querySelector(anchor.getAttribute('href'));
      if (!target) return;
      e.preventDefault();
      window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - 80, behavior: 'smooth' });
    });
  });

  /* ---- FORMULAIRE ENTREPRISES #companyForm ---- */
  const companyForm = document.getElementById('companyForm');
  if (companyForm) {
    companyForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = companyForm.querySelector('.btn-submit');
      const successEl = document.getElementById('formSuccess');
      btn.textContent = 'Envoi en cours...';
      btn.disabled = true;

      const payload = {
        company_name: companyForm.company?.value.trim()  || '',
        email:        companyForm.email?.value.trim()    || '',
        region:       companyForm.location?.value.trim() || '',
        role_needed:  companyForm.position?.value.trim() || '',
        urgency:      companyForm.urgency?.value         || '',
        message:      companyForm.context?.value         || '',
      };

      try {
        const res = await fetch('http://localhost:4000/api/company', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const out = await res.json();
        if (res.ok && out.ok) { _formSuccess(companyForm, btn, successEl); }
        else { btn.textContent = 'Reessayer'; btn.disabled = false; }
      } catch { _formSuccess(companyForm, btn, successEl); }
    });
  }

  /* ---- FORMULAIRE CANDIDAT #candidateForm ---- */
  const candidateForm = document.getElementById('candidateForm');
  if (candidateForm) {
    candidateForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = candidateForm.querySelector('.btn-submit');
      const successEl = document.getElementById('candidateSuccess');
      btn.textContent = 'Envoi en cours...';
      btn.disabled = true;

      try {
        const formData = new FormData(candidateForm);
        const res = await fetch('http://localhost:4000/api/candidate', { method: 'POST', body: formData });
        const out = await res.json();
        if (res.ok && out.ok) { _formSuccess(candidateForm, btn, successEl); }
        else { btn.textContent = 'Reessayer'; btn.disabled = false; }
      } catch { _formSuccess(candidateForm, btn, successEl); }
    });

    /* File upload label */
    const fileInput  = document.getElementById('cv_upload');
    const fileLabel  = document.getElementById('fileLabel');
    const fileLabelEl = document.querySelector('.file-label');
    if (fileInput && fileLabel) {
      fileInput.addEventListener('change', () => {
        const file = fileInput.files[0];
        fileLabel.textContent = file ? 'v ' + file.name : 'Cliquez pour ajouter votre CV';
        if (fileLabelEl) fileLabelEl.classList.toggle('has-file', !!file);
      });
    }
  }

  /* ---- FORMULAIRE CONTACT #contactForm ---- */
  const contactForm = document.getElementById('contactForm');
  if (contactForm) {
    contactForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = contactForm.querySelector('.btn-submit');
      const successEl = document.getElementById('contactSuccess');
      btn.textContent = 'Envoi en cours...';
      btn.disabled = true;

      const payload = {
        fullname: contactForm.fullname?.value.trim() || '',
        email:    contactForm.email?.value.trim()    || '',
        type:     contactForm.type?.value            || '',
        message:  contactForm.message?.value         || '',
      };

      try {
        const res = await fetch('http://localhost:4000/api/contact', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const out = await res.json();
        if (res.ok && out.ok) { _formSuccess(contactForm, btn, successEl); }
        else { btn.textContent = 'Reessayer'; btn.disabled = false; }
      } catch { _formSuccess(contactForm, btn, successEl); }
    });
  }

});

/* ---- Helper: affiche le succes ---- */
function _formSuccess(form, btn, successEl) {
  if (successEl) { successEl.classList.add('show'); successEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }
  form.reset();
  btn.textContent = 'Envoye !';
  btn.style.background = 'var(--emerald-light)';
}