/* =====================================================
   TALENTYAH — ressources.js
   Scripts specifiques a la page Ressources (Blog)
===================================================== */

document.addEventListener('DOMContentLoaded', () => {

  /* ---- FILTRES CATEGORIES ---- */
  const filterBtns  = document.querySelectorAll('.filter-btn');
  const articleCards = document.querySelectorAll('.article-card');
  const countEl     = document.querySelector('.articles-count span');

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const cat = btn.dataset.filter;
      let visible = 0;

      articleCards.forEach(card => {
        const match = cat === 'all' || card.dataset.category === cat;
        card.style.display = match ? '' : 'none';
        if (match) visible++;
      });

      if (countEl) countEl.textContent = visible;
    });
  });

  /* ---- NEWSLETTER ---- */
  const nlForm = document.getElementById('newsletterForm');
  if (nlForm) {
    nlForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = nlForm.querySelector('.newsletter-input');
      const btn   = nlForm.querySelector('.newsletter-submit');
      if (!input.value.trim()) return;
      btn.textContent = 'Inscrit !';
      btn.style.background = 'var(--emerald-light)';
      input.value = '';
      setTimeout(() => {
        btn.textContent = "S'inscrire";
        btn.style.background = '';
      }, 3000);
    });
  }

});