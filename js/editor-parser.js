/* =====================================================
   TALENTYAH — editor-parser.js
   Convertisseur universel Editor.js JSON -> HTML sécurisé
===================================================== */

function parseEditorJsToHtml(content) {
  if (!content) return '';

  // Si c'est déjà du HTML ou du texte brut classique
  if (typeof content === 'string') {
    const trimmed = content.trim();
    if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
      return content; // Retourner directement le texte/HTML legacy
    }
    try {
      content = JSON.parse(content);
    } catch {
      return content;
    }
  }

  if (!content || !content.blocks || !Array.isArray(content.blocks)) {
    return '';
  }

  return content.blocks.map(block => {
    switch (block.type) {
      case 'header': {
        const level = block.data.level || 2;
        const text = block.data.text || '';
        return `<h${level}>${text}</h${level}>`;
      }
      case 'paragraph': {
        const text = block.data.text || '';
        return `<p>${text}</p>`;
      }
      case 'list': {
        const tag = block.data.style === 'ordered' ? 'ol' : 'ul';
        const items = (block.data.items || []).map(item => {
          const itemText = typeof item === 'string' ? item : (item.content || item.text || '');
          return `<li>${itemText}</li>`;
        }).join('');
        return `<${tag}>${items}</${tag}>`;
      }
      case 'quote': {
        const text = block.data.text || '';
        const caption = block.data.caption ? `<cite>${block.data.caption}</cite>` : '';
        return `<blockquote><p>${text}</p>${caption}</blockquote>`;
      }
      case 'delimiter': {
        return `<hr class="editor-delimiter">`;
      }
      default: {
        const text = block.data?.text || '';
        return text ? `<p>${text}</p>` : '';
      }
    }
  }).join('');
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { parseEditorJsToHtml };
}
