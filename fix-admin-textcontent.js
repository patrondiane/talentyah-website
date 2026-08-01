const fs = require('fs');
let content = fs.readFileSync('js/admin.js', 'utf8');

// The lines matched look like: msg.textContent = '...<i data-lucide...'
content = content.replace(/msg\.textContent\s*=\s*(.*?<i data-lucide.*?;)/g, 'msg.innerHTML = $1 setTimeout(() => { if (typeof lucide !== "undefined") lucide.createIcons(); }, 10);');

fs.writeFileSync('js/admin.js', content);
console.log('Fixed admin.js msg.innerHTML');
