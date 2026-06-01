/* =====================================================
   TALENTYAH — carousel-dynamic.js
   Charge les slides depuis le backend filtrés par page.
===================================================== */

function _safeText(str) {
  return String(str || '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// Détecter le nom de la page courante (ex: "talents" depuis "talents.html")
function _getCurrentPage() {
  const file = window.location.pathname.split('/').pop() || 'index.html';
  return file.replace('.html', '') || 'index';
}

async function initDynamicCarousel() {
  const slidesContainer =
    document.getElementById('carouselSlides') ||
    document.querySelector('.carousel-slides');
  if (!slidesContainer) return;

  try {
    const page = _getCurrentPage();
    const res  = await fetch('https://talentyah-website.onrender.com/api/carousel?page=' + page + '&_=' + Date.now());
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data   = await res.json();
    const slides = data.slides || [];
    if (!slides.length) return; // fallback slides statiques HTML

    // Utiliser <img> au lieu de background-image pour iOS Safari
    const resolveUrl = (url) => (url && url.startsWith('http')) ? url : 'https://talentyah-website.onrender.com' + url;

    slidesContainer.innerHTML = slides.map(s => `
      <div class="carousel-slide">
        <div class="carousel-slide-media" style="overflow:hidden;">
          <img src="${resolveUrl(s.image_url)}" alt=""
               style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center;display:block;"
               loading="eager"></div>
        <div class="carousel-slide-overlay"></div>
        <div class="carousel-slide-content">
          <div class="carousel-slide-inner">
            ${s.eyebrow ? `
            <div class="carousel-slide-eyebrow">
              <span class="carousel-slide-eyebrow-line"></span>
              <span class="carousel-slide-eyebrow-text">${_safeText(s.eyebrow)}</span>
            </div>` : ''}
            <h1 class="carousel-slide-title">${_safeText(s.title || '')}</h1>
            ${s.subtitle ? `<p class="carousel-slide-desc">${_safeText(s.subtitle)}</p>` : ''}
            <div class="carousel-slide-ctas">
              ${s.cta1_text ? `<a href="${_safeText(s.cta1_url||'#')}" class="btn-gold">${_safeText(s.cta1_text)}</a>` : ''}
              ${s.cta2_text ? `<a href="${_safeText(s.cta2_url||'#')}" class="btn-ghost">${_safeText(s.cta2_text)}</a>` : ''}
            </div>
          </div>
        </div>
      </div>`).join('');

    // Dots
    const dotsContainer = document.querySelector('.carousel-dots');
    if (dotsContainer) {
      dotsContainer.innerHTML = slides.map((_, i) =>
        `<button class="carousel-dot" role="tab" aria-label="Slide ${i+1}"></button>`
      ).join('');
    }

    // Compteur
    const total = document.querySelector('.carousel-counter-total');
    if (total) total.textContent = String(slides.length).padStart(2, '0');

    // Réinitialiser le carousel JS après injection des slides
    if (typeof window.reinitCarousel === 'function') {
      window.reinitCarousel();
    } else if (typeof window.initCarousel === 'function') {
      window.initCarousel();
    } else {
      const first    = slidesContainer.querySelector('.carousel-slide');
      const firstDot = dotsContainer?.querySelector('.carousel-dot');
      if (first)    first.classList.add('active');
      if (firstDot) firstDot.classList.add('active');
    }

  } catch (err) {
    console.warn('[Talentyah] Carousel:', err.message);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initDynamicCarousel);
} else {
  initDynamicCarousel();
}