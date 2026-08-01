// js/lucide-utils.js
// Helper pour générer des icônes Lucide dans les templates JS dynamiques

/**
 * Génère un tag <i data-lucide="..."> pour utilisation dans les innerHTML.
 * Après avoir injecté le HTML, appeler lucide.createIcons() pour rendre les icônes.
 * @param {string} name - Nom de l'icône Lucide (ex: 'map-pin', 'check', 'x')
 * @param {string} [cls=''] - Classes CSS supplémentaires
 * @param {number} [size=16] - Taille en pixels
 * @returns {string} HTML string
 */
function lIcon(name, cls = '', size = 16) {
  return `<i data-lucide="${name}" class="licon ${cls}" style="width:${size}px;height:${size}px;stroke-width:1.75;vertical-align:middle;display:inline-flex;flex-shrink:0;"></i>`;
}
