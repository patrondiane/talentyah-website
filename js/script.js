/* =====================================================
   TALENTYAH — script.js
   Shared scripts + formulaires connectés au backend
===================================================== */

const BACKEND = 'https://talentyah-website.onrender.com';

document.addEventListener('DOMContentLoaded', () => {

  /* ── HAMBURGER ── */
  const hamburger = document.getElementById('hamburger');
  const mainNav   = document.getElementById('main-nav');
  if (hamburger && mainNav) {
    hamburger.addEventListener('click', () => mainNav.classList.toggle('open'));
    mainNav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => mainNav.classList.remove('open')));
    document.addEventListener('click', (e) => {
      if (!hamburger.contains(e.target) && !mainNav.contains(e.target)) mainNav.classList.remove('open');
    });
  }

  /* ── HEADER OMBRE ── */
  const header = document.getElementById('header');
  if (header) {
    window.addEventListener('scroll', () => {
      header.style.boxShadow = window.scrollY > 40 ? '0 2px 20px rgba(0,0,0,0.08)' : 'none';
    }, { passive: true });
  }

  /* ── SCROLL REVEAL ── */
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('visible'); revealObserver.unobserve(entry.target); }
    });
  }, { threshold: 0.1 });
  document.querySelectorAll('.reveal').forEach((el, i) => {
    el.style.transitionDelay = (i % 4) * 0.08 + 's';
    revealObserver.observe(el);
  });

  /* ── ACCORDION OFFRES ── */
  document.querySelectorAll('.offre-header').forEach(hdr => {
    hdr.addEventListener('click', () => {
      const item   = hdr.closest('.offre-item');
      const isOpen = item.classList.contains('open');
      document.querySelectorAll('.offre-item').forEach(i => i.classList.remove('open'));
      if (!isOpen) item.classList.add('open');
    });
  });

  /* ── SMOOTH SCROLL ── */
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
      const target = document.querySelector(anchor.getAttribute('href'));
      if (!target) return;
      e.preventDefault();
      window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - 80, behavior: 'smooth' });
    });
  });

  /* ══════════════════════════════════════════
     FORMULAIRE ENTREPRISES — #companyForm
  ══════════════════════════════════════════ */
  const companyForm = document.getElementById('companyForm');
  if (companyForm) {
    companyForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn       = companyForm.querySelector('button[type="submit"]');
      const successEl = document.getElementById('formSuccess');
      const errorEl   = document.getElementById('formError');

      _btnLoading(btn, 'Envoi en cours…');

      const payload = {
        company_name: (companyForm.company?.value || '').trim(),
        email:        (companyForm.email?.value   || '').trim(),
        phone:        (companyForm.phone?.value   || '').trim(),
        region:       (companyForm.location?.value || companyForm.region?.value || '').trim(),
        role_needed:  (companyForm.position?.value || companyForm.role_needed?.value || '').trim(),
        urgency:      companyForm.urgency?.value || 'moyenne',
        message:      (companyForm.context?.value || companyForm.message?.value || '').trim(),
      };

      try {
        const res  = await fetch(BACKEND + '/api/companies', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (res.ok) {
          _showSuccess(companyForm, btn, successEl, 'Votre demande a bien été envoyée. Nous vous recontactons rapidement.');
        } else {
          _showError(btn, errorEl, data.error || 'Erreur lors de l\'envoi.');
        }
      } catch (err) {
        // Si le backend est injoignable, message clair
        _showError(btn, errorEl, 'Impossible de joindre le serveur. Vérifiez que le backend tourne sur le port 4000.');
      }
    });
  }

  /* ══════════════════════════════════════════
     FORMULAIRE CANDIDAT — #candidateForm
     (page talents.html — géré aussi par talents.js)
  ══════════════════════════════════════════ */
  // talents.js prend la main si présent, sinon on gère ici
  if (document.getElementById('candidateForm') && typeof window._talentsJsLoaded === 'undefined') {
    const candidateForm = document.getElementById('candidateForm');
    candidateForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn       = candidateForm.querySelector('button[type="submit"]');
      const successEl = document.getElementById('candidateSuccess');
      const fileInput = document.getElementById('cv_upload');

      if (fileInput && (!fileInput.files || !fileInput.files[0])) {
        alert('Veuillez ajouter votre CV avant d\'envoyer.');
        return;
      }

      _btnLoading(btn, 'Envoi en cours…');

      try {
        const fd = new FormData(candidateForm);
        const res = await fetch(BACKEND + '/api/candidates', { method: 'POST', body: fd });
        const data = await res.json();
        if (res.ok) {
          _showSuccess(candidateForm, btn, successEl, 'Votre candidature a bien été transmise !');
        } else {
          _btnReset(btn, 'Réessayer');
          alert(data.error || 'Erreur lors de l\'envoi.');
        }
      } catch {
        _btnReset(btn, 'Réessayer');
        alert('Impossible de joindre le serveur. Vérifiez que le backend tourne sur le port 4000.');
      }
    });
  }

  /* ══════════════════════════════════════════
     FORMULAIRE CONTACT — #contactForm
  ══════════════════════════════════════════ */
  const contactForm = document.getElementById('contactForm');
  if (contactForm) {
    // Ajouter un bloc succès dynamiquement si absent
    let contactSuccess = document.getElementById('contactSuccess');
    if (!contactSuccess) {
      contactSuccess = document.createElement('div');
      contactSuccess.id = 'contactSuccess';
      contactSuccess.style.cssText = 'display:none;background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:16px 20px;margin-top:16px;color:#166534;font-weight:500;';
      contactSuccess.textContent = 'Message envoyé ! Nous vous répondrons sous 48h.';
      contactForm.after(contactSuccess);
    }

    contactForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = contactForm.querySelector('button[type="submit"]');
      _btnLoading(btn, 'Envoi en cours…');

      const payload = {
        fullname: (contactForm.name?.value || contactForm.fullname?.value || '').trim(),
        email:    (contactForm.email?.value || '').trim(),
        subject:  contactForm.subject?.value || '',
        type:     contactForm.subject?.value || contactForm.type?.value || '',
        message:  (contactForm.message?.value || '').trim(),
      };

      try {
        const res  = await fetch(BACKEND + '/api/contact', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (res.ok) {
          _showSuccess(contactForm, btn, contactSuccess, 'Message envoyé ! Nous vous répondrons sous 48h.');
        } else {
          _btnReset(btn, 'Réessayer');
          alert(data.error || 'Erreur lors de l\'envoi.');
        }
      } catch {
        _btnReset(btn, 'Réessayer');
        alert('Impossible de joindre le serveur. Vérifiez que le backend tourne sur le port 4000.');
      }
    });
  }

});

/* ── Helpers ── */
function _btnLoading(btn, text) {
  if (!btn) return;
  btn.dataset.originalText = btn.textContent;
  btn.textContent = text;
  btn.disabled = true;
}

function _btnReset(btn, text) {
  if (!btn) return;
  btn.textContent = text || btn.dataset.originalText || 'Envoyer';
  btn.disabled = false;
}

function _showSuccess(form, btn, successEl, message) {
  if (form)      { form.reset(); form.style.opacity = '0.4'; form.style.pointerEvents = 'none'; }
  if (btn)       { btn.textContent = '✓ Envoyé !'; btn.style.background = 'var(--emerald, #1a5233)'; }
  if (successEl) {
    successEl.textContent = message;
    successEl.style.display = 'block';
    successEl.classList.add('show');
    successEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

function _showError(btn, errorEl, message) {
  _btnReset(btn, 'Réessayer');
  if (errorEl) { errorEl.textContent = message; errorEl.style.display = 'block'; }
}

/* ══════════════════════════════════════════
   PARTENAIRES — section "Ils nous font confiance" (index.html)
   Charge depuis l'API, garde les logos statiques en fallback
══════════════════════════════════════════ */
(async function loadClientLogos() {
  const track = document.getElementById('clientsTrack');
  if (!track) return;

  try {
    const res  = await fetch('https://talentyah-website.onrender.com/api/partners');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data     = await res.json();
    const partners = data.partners || [];
    if (!partners.length) return;

    track.innerHTML = [...partners, ...partners].map(p => `
      <div class="client-logo">
        <img src="https://talentyah-website.onrender.com${p.image_url}"
             alt="${p.name}"
             class="client-logo-img"
             onerror="this.parentElement.style.display='none'">
        <span class="client-logo-text">${p.name}</span>
      </div>`).join('');

  } catch (err) {
    console.warn('[Talentyah] Partenaires non chargés depuis API:', err.message);
  }
})();

/* ══════════════════════════════════════════
   CAROUSEL — charge depuis l'API si slides uploadés
   Sinon garde les slides statiques HTML
══════════════════════════════════════════ */
(async function loadCarouselFromAPI() {
  const slidesWrap = document.getElementById('carouselSlides');
  if (!slidesWrap) return;

  try {
    const res  = await fetch('https://talentyah-website.onrender.com/api/carousel');
    if (!res.ok) throw new Error();
    const data = await res.json();
    const slides = data.slides || [];
    if (!slides.length) return; // garde les slides statiques HTML

    slidesWrap.innerHTML = slides.map(s => `
      <div class="carousel-slide">
        <div class="carousel-slide-media"
             style="background-image: url('https://talentyah-website.onrender.com${s.image_url}')">
        </div>
        <div class="carousel-slide-overlay"></div>
        <div class="carousel-slide-content">
          <div class="carousel-slide-inner">
            ${s.eyebrow ? `<div class="carousel-slide-eyebrow">
              <span class="carousel-slide-eyebrow-line"></span>
              <span class="carousel-slide-eyebrow-text">${s.eyebrow}</span>
            </div>` : ''}
            <h1 class="carousel-slide-title">${s.title || ''}</h1>
            ${s.subtitle ? `<p class="carousel-slide-desc">${s.subtitle}</p>` : ''}
            <div class="carousel-slide-ctas">
              ${s.btn1_text ? `<a href="${s.btn1_href || '#'}" class="btn-gold">${s.btn1_text} &#8594;</a>` : ''}
              ${s.btn2_text ? `<a href="${s.btn2_href || '#'}" class="btn-ghost">${s.btn2_text} &#8594;</a>` : ''}
            </div>
          </div>
        </div>
      </div>`).join('');

    // Réinitialiser le carousel JS après injection
    if (typeof window.reinitCarousel === 'function') window.reinitCarousel();

  } catch { /* fallback silencieux — slides statiques HTML */ }
})();