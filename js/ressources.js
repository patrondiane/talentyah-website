/* =====================================================
   TALENTYAH — ressources.js
===================================================== */

const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const API_BASE = window.API_BASE || (isLocal ? "http://localhost:4001" : "https://talentyah-website.onrender.com");

const catMap = {
  'Conseil carrière':      'carriere',
  "Marché de l'emploi":   'marche',
  'Actualités Talentyah': 'recrutement',
  'International':         'rh',
};

const pageLabels = {
  carriere: 'Conseil carrière', 
  marche: "Marché de l'emploi",
  recrutement: 'Actualités', 
  rh: 'International',
};

let allCards = [];

function applyFilter(cat) {
  const cards = document.querySelectorAll('.article-card');
  let visible = 0;
  cards.forEach(card => {
    const match = cat === 'all' || card.dataset.category === cat;
    card.style.display = match ? '' : 'none';
    if (match) visible++;
  });
  const numEl = document.getElementById('articlesCountNum');
  if (numEl) {
    numEl.textContent = visible;
    const parentP = numEl.closest('.articles-count');
    if (parentP) parentP.innerHTML = `<span id="articlesCountNum">${visible}</span> ${visible > 1 ? 'articles disponibles' : 'article disponible'}`;
  }
}

function _esc(str) {
  return String(str || '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function renderArticles(pubs) {
  const grid = document.getElementById('articlesGrid');
  if (!grid) return;

  grid.innerHTML = pubs.map(p => {
    const cat  = catMap[p.category] || 'recrutement';
    const date = p.published_at
      ? new Date(p.published_at).toLocaleDateString('fr-FR', { day:'numeric', month:'long', year:'numeric' })
      : 'Talentyah Editorial';
    return `
      <article class="article-card reveal visible" data-category="${cat}">
        <div class="article-card-thumb thumb-${cat}">
          ${p.image_url 
            ? `<img src="${p.image_url.startsWith('http') ? p.image_url : API_BASE + p.image_url}" 
                    alt="${_esc(p.title)}" 
                    style="width:100%;height:100%;object-fit:cover;"
                    onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">`
            : `<div class="article-card-thumb-placeholder"><i data-lucide="file-text" style="width:28px;height:28px;"></i></div>`
          }
        </div>
        <div class="article-card-body">
          <div class="article-card-tag">${_esc(p.category || '')}</div>
          <h3 class="article-card-title">${_esc(p.title)}</h3>
          <p class="article-card-desc">${_esc((p.excerpt || '').substring(0, 150))}${p.excerpt && p.excerpt.length > 150 ? '…' : ''}</p>
          <div class="article-card-footer">
            <span class="article-card-date">${date}</span>
            <a href="article.html?id=${p.id}" class="article-card-link">Lire &#8594;</a>
          </div>
        </div>
      </article>`;
  }).join('');

  const numEl = document.getElementById('articlesCountNum');
  if (numEl) {
    numEl.textContent = pubs.length;
    const parentP = numEl.closest('.articles-count');
    if (parentP) parentP.innerHTML = `<span id="articlesCountNum">${pubs.length}</span> ${pubs.length > 1 ? 'articles disponibles' : 'article disponible'}`;
  }

  // Mise à jour dynamique des compteurs de filtres
  updateFilterCounts(pubs);

  const activeBtn = document.querySelector('.filter-btn.active');
  if (activeBtn) applyFilter(activeBtn.dataset.filter || 'all');
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

function updateFilterCounts(pubs) {
  const counts = { all: pubs.length, carriere: 0, marche: 0, recrutement: 0, rh: 0 };
  pubs.forEach(p => {
    const cat = catMap[p.category] || 'recrutement';
    counts[cat] = (counts[cat] || 0) + 1;
  });

  document.querySelectorAll('.filter-btn').forEach(btn => {
    const filterVal = btn.dataset.filter || 'all';
    const countSpan = btn.querySelector('.filter-count');
    if (countSpan) {
      countSpan.textContent = counts[filterVal] || 0;
    }
    btn.style.opacity = (filterVal !== 'all' && !counts[filterVal]) ? '0.5' : '1';
  });
}

async function loadArticles() {
  const grid = document.getElementById('articlesGrid');
  if (!grid) return;

  try {
    const res  = await fetch(API_BASE + '/api/publications');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    const pubs = data.publications || [];

    if (pubs.length) {
      renderArticles(pubs);
    } else {
      grid.innerHTML = '<p style="color:var(--muted);font-size:14px;padding:30px 0;grid-column:1/-1;text-align:center;">Aucun article publié pour le moment.</p>';
      updateFilterCounts([]);
    }
  } catch (err) {
    console.warn('[Talentyah] Publications:', err.message);
    grid.innerHTML = '<p style="color:var(--muted);font-size:14px;padding:30px 0;grid-column:1/-1;text-align:center;">Impossible de charger les articles.</p>';
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

function init() {

  /* ── Filtres ── */
  const filterBtns = document.querySelectorAll('.filter-btn');
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      applyFilter(btn.dataset.filter || 'all');
    });
  });

  /* ── Newsletter ── */
  const nlForm = document.getElementById('newsletterForm');
  if (nlForm) {
    nlForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const input = nlForm.querySelector('.newsletter-input') || nlForm.querySelector('input[type="email"]');
      const btn   = nlForm.querySelector('.newsletter-submit') || nlForm.querySelector('button');
      if (!input?.value.trim()) return;
      try {
        await fetch(window.API_BASE + '/api/contact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: input.value.trim(), subject: 'newsletter', message: 'Inscription newsletter' })
        });
      } catch {}
      if (btn)   { btn.textContent = 'Inscrit !'; btn.style.background = 'var(--emerald)'; }
      if (input) { input.value = ''; }
      setTimeout(() => {
        if (btn) { btn.textContent = "S'inscrire"; btn.style.background = ''; }
      }, 3000);
    });
  }

  /* ── Charger les articles depuis l'API ── */
  loadArticles();
}

function _staticArticles() {
  const articles = [
    { cat: 'recrutement', tag: 'Recrutement',       title: 'Les défis du recrutement de cadres en Afrique de l\'Ouest',   desc: 'Pourquoi certaines entreprises peinent à attirer les bons profils malgré un fort vivier de talents, et comment y remédier.' },
    { cat: 'carriere',    tag: 'Carrière',           title: 'Construire une trajectoire professionnelle non linéaire',       desc: 'Comment valoriser des parcours atypiques et transformer les transitions en véritables atouts pour votre carrière.' },
    { cat: 'marche',      tag: 'Marché',             title: 'Pourquoi les soft skills deviennent stratégiques',             desc: 'Les compétences relationnelles et comportementales s\'imposent désormais comme critères clés dans la sélection des profils cadres.' },
    { cat: 'rh',          tag: 'International',      title: 'Mobilité internationale : réussir sa prise de poste',         desc: 'Les clés pour préparer et réussir une prise de poste à l\'international, de la logistique à l\'intégration culturelle.' },
    { cat: 'recrutement', tag: 'Recrutement',        title: 'Comment optimiser votre profil LinkedIn pour les recruteurs', desc: 'Les bonnes pratiques pour être visible et crédible auprès des recruteurs spécialisés dans votre secteur.' },
    { cat: 'carriere',    tag: 'Conseil carrière',   title: 'Négocier sa rémunération : les erreurs à éviter',            desc: 'Les pièges classiques lors des négociations salariales et les stratégies pour maximiser votre package.' },
  ];
  return articles.map(a => `
    <article class="article-card reveal visible" data-category="${a.cat}">
      <div class="article-card-thumb thumb-${a.cat}">
        <div class="article-card-thumb-placeholder">
          <i data-lucide="file-text" style="width:24px;height:24px;"></i>
        </div>
      </div>
      <div class="article-card-body">
        <div class="article-card-tag">${a.tag}</div>
        <h3 class="article-card-title">${a.title}</h3>
        <p class="article-card-desc">${a.desc}</p>
        <div class="article-card-footer">
          <span class="article-card-date">Talentyah Editorial</span>
          <a href="#" class="article-card-link">Lire &#8594;</a>
        </div>
      </div>
    </article>`).join('');
}