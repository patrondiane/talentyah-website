/* ================================================
   TALENTYAH — HERO CAROUSEL JS
   ================================================ */

(function () {
  'use strict';

  const AUTOPLAY_DURATION = 5500; // ms per slide

  function initCarousel(carouselEl) {
    const slides     = carouselEl.querySelectorAll('.carousel-slide');
    const dots       = carouselEl.querySelectorAll('.carousel-dot');
    const prevBtn    = carouselEl.querySelector('.carousel-arrow-prev');
    const nextBtn    = carouselEl.querySelector('.carousel-arrow-next');
    const progressEl = carouselEl.querySelector('.carousel-progress');
    const counterCur = carouselEl.querySelector('.carousel-counter-current');
    const counterTot = carouselEl.querySelector('.carousel-counter-total');
    const thumbs     = carouselEl.querySelectorAll('.carousel-thumb');

    if (!slides.length) return;

    let current      = 0;
    let timer        = null;
    let progressTimer = null;
    let paused       = false;

    // Set total count
    if (counterTot) counterTot.textContent = String(slides.length).padStart(2, '0');

    function goTo(index, direction) {
      const prev = current;
      current = (index + slides.length) % slides.length;

      slides[prev].classList.remove('active');
      slides[current].classList.add('active');

      if (dots.length) {
        dots[prev].classList.remove('active');
        dots[current].classList.add('active');
      }

      if (thumbs.length) {
        thumbs[prev]?.classList.remove('active');
        thumbs[current]?.classList.add('active');
      }

      if (counterCur) counterCur.textContent = String(current + 1).padStart(2, '0');
    }

    function next() { goTo(current + 1); }
    function prev() { goTo(current - 1); }

    // Progress bar animation
    function startProgress() {
      if (!progressEl) return;
      clearInterval(progressTimer);
      progressEl.style.transition = 'none';
      progressEl.style.width = '0%';

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          progressEl.style.transition = `width ${AUTOPLAY_DURATION}ms linear`;
          progressEl.style.width = '100%';
        });
      });
    }

    function startAutoplay() {
      clearInterval(timer);
      startProgress();
      timer = setInterval(() => {
        if (!paused) next();
      }, AUTOPLAY_DURATION);
    }

    function stopAutoplay() {
      clearInterval(timer);
      clearInterval(progressTimer);
      if (progressEl) {
        progressEl.style.transition = 'none';
        progressEl.style.width = '0%';
      }
    }

    // Init first slide
    slides[0].classList.add('active');
    if (dots[0]) dots[0].classList.add('active');
    if (thumbs[0]) thumbs[0].classList.add('active');
    if (counterCur) counterCur.textContent = '01';
    startAutoplay();

    // Arrow buttons
    if (prevBtn) prevBtn.addEventListener('click', () => { prev(); startAutoplay(); });
    if (nextBtn) nextBtn.addEventListener('click', () => { next(); startAutoplay(); });

    // Dots
    dots.forEach((dot, i) => {
      dot.addEventListener('click', () => { goTo(i); startAutoplay(); });
    });

    // Thumbnails
    thumbs.forEach((thumb, i) => {
      thumb.addEventListener('click', () => { goTo(i); startAutoplay(); });
    });

    // Pause on hover / focus
    carouselEl.addEventListener('mouseenter', () => { paused = true; });
    carouselEl.addEventListener('mouseleave', () => { paused = false; });
    carouselEl.addEventListener('focusin',    () => { paused = true; });
    carouselEl.addEventListener('focusout',   () => { paused = false; });

    // Keyboard navigation
    carouselEl.setAttribute('tabindex', '0');
    carouselEl.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft')  { prev(); startAutoplay(); }
      if (e.key === 'ArrowRight') { next(); startAutoplay(); }
    });

    // Touch / swipe
    let touchStartX = 0;
    carouselEl.addEventListener('touchstart', (e) => {
      touchStartX = e.touches[0].clientX;
    }, { passive: true });

    carouselEl.addEventListener('touchend', (e) => {
      const dx = e.changedTouches[0].clientX - touchStartX;
      if (Math.abs(dx) > 50) {
        dx < 0 ? next() : prev();
        startAutoplay();
      }
    }, { passive: true });
  }

  // Auto-init all carousels on DOMContentLoaded
  function init() {
    document.querySelectorAll('.hero-carousel').forEach(initCarousel);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();