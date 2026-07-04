/* =====================================================
   TALENTYAH — article.js
===================================================== */

const API_BASE = 'https://talentyah-website.onrender.com';

function _esc(str) {
  return String(str || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Écouteur pour la barre de progression (scroll)
window.addEventListener('scroll', () => {
  const winScroll = document.body.scrollTop || document.documentElement.scrollTop;
  const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
  const scrolled = (winScroll / height) * 100;
  const progressBar = document.getElementById('progressBar');
  if (progressBar) progressBar.style.width = scrolled + "%";
});

async function loadSingleArticle() {
  const container = document.getElementById('articleContentPlaceholder');
  if (!container) return;

  // 1. Extraire l'ID depuis les paramètres de l'URL
  const urlParams = new URLSearchParams(window.location.search);
  const articleId = urlParams.get('id');

  if (!articleId) {
    container.innerHTML = '<p style="padding: 50px; text-align: center; color:#c0392b;">Erreur : Aucun identifiant d\'article spécifié.</p>';
    return;
  }

  try {
    // 2. Appeler l'API de publication pour cet article spécifique
    const res = await fetch(`${API_BASE}/api/publications/${articleId}`);
    if (!res.ok) throw new Error('Article introuvable (HTTP ' + res.status + ')');
    
    const data = await res.json();
    // Gérer si le backend renvoie directement l'objet ou un wrapper { publication: ... }
    const article = data.publication || data; 

    if (!article || !article.title) {
      throw new Error('Données de l\'article invalides.');
    }

    // Mettre à jour le titre de l'onglet du navigateur dynamiquement
    document.title = `${article.title} - Talentyah`;

    // Génération des boutons de partage (Déplacé ici pour avoir accès aux infos de l'article)
    const currentUrl = encodeURIComponent(window.location.href);
    const encodedTitle = encodeURIComponent(article.title);

    const shareButtons = `
      <div style="display:flex; gap:12px; margin-top:16px; align-items:center;">
        <span style="font-size:13px; color:var(--muted); font-weight:600;">Partager :</span>
        <a href="https://www.linkedin.com/shareArticle?mini=true&url=${currentUrl}&title=${encodedTitle}" target="_blank" rel="noopener" style="display:inline-flex; align-items:center; justify-content:center; width:32px; height:32px; background:#0077b5; color:#fff; border-radius:50%; text-decoration:none;" title="Partager sur LinkedIn">
          in
        </a>
        <a href="mailto:?subject=${encodedTitle}&body=J'ai pensé que cet article pourrait t'intéresser : ${currentUrl}" style="display:inline-flex; align-items:center; justify-content:center; width:32px; height:32px; background:var(--emerald); color:#fff; border-radius:50%; text-decoration:none; font-weight:bold;" title="Envoyer par email">
          @
        </a>
      </div>
    `;

    // 3. Formater la date de publication
    const dateStr = article.published_at
      ? new Date(article.published_at).toLocaleDateString('fr-FR', { day:'numeric', month:'long', year:'numeric' })
      : 'Talentyah Editorial';

// Remplacez cette partie dans votre fonction loadSingleArticle :

// 4. Générer le code HTML du contenu de l'article
// On vérifie si l'URL commence par 'http' ; sinon, on ajoute l'API_BASE
const imageUrl = article.image_url 
  ? (article.image_url.startsWith('http') ? article.image_url : API_BASE + article.image_url)
  : null;

const imgHtml = imageUrl
  ? `<img src="${imageUrl}" class="article-hero-img" alt="${_esc(article.title)}">`
  : '';

    container.innerHTML =`
      ${imgHtml}
      <div class="article-main-content">
        <div class="article-meta-top">${_esc(article.category || 'Actualités')}</div>
        <h1 class="article-main-title">${_esc(article.title)}</h1>
        
        <div class="article-date-author">
          Publié le ${dateStr} par l'Équipe Rédactionnelle
          ${shareButtons}
        </div>
        
        <!-- Injection DIRECTE du code HTML généré par Quill -->
        <div class="article-body-text">${article.content || "Le contenu de cet article est vide."}</div>
      </div>
    `;

  } catch (err) {
    console.error('[Talentyah] Erreur lors du chargement de l\'article:', err);
    container.innerHTML = `
      <div style="padding: 50px; text-align: center;">
        <p style="color:#c0392b; font-weight:500;">Impossible de charger cet article.</p>
        <p style="color:var(--muted); font-size:14px; margin-top:8px;">${err.message}</p>
      </div>`;
  }
}

// Lancement au chargement du DOM
document.addEventListener('DOMContentLoaded', loadSingleArticle);