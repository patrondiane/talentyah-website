/* =====================================================
   TALENTYAH — notre-approche.js
   Scripts specifiques a la page Notre Approche
===================================================== */

document.addEventListener('DOMContentLoaded', () => {

  /* Piliers : slide depuis la gauche au scroll */
  const pilierItems = document.querySelectorAll('.pilier-item');

  const pilierObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const index = Array.from(pilierItems).indexOf(entry.target);
        setTimeout(() => {
          entry.target.style.opacity = '1';
          entry.target.style.transform = 'translateX(0)';
        }, index * 100);
        pilierObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  pilierItems.forEach(item => {
    item.style.opacity = '0';
    item.style.transform = 'translateX(-20px)';
    item.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    pilierObserver.observe(item);
  });

  /* Valeurs : apparition decalee */
  const valeurCards = document.querySelectorAll('.valeur-card');

  const valeurObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const index = Array.from(valeurCards).indexOf(entry.target);
        setTimeout(() => {
          entry.target.style.opacity = '1';
          entry.target.style.transform = 'translateY(0)';
        }, index * 80);
        valeurObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  valeurCards.forEach(card => {
    card.style.opacity = '0';
    card.style.transform = 'translateY(20px)';
    card.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
    valeurObserver.observe(card);
  });

});