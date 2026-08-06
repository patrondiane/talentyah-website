const fs = require('fs');

const files = fs.readdirSync('.').filter(f => f.endsWith('.html'));
files.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');
  lines.forEach((l, i) => {
    if (l.includes('<input')) {
      const isText = l.includes('type="text"') || !l.includes('type=');
      const isTelLike = l.toLowerCase().includes('tel') || l.toLowerCase().includes('phone') || l.toLowerCase().includes('téléphone');
      const isEmailLike = l.toLowerCase().includes('email') || l.toLowerCase().includes('mail');
      const isUrlLike = l.toLowerCase().includes('url') || l.toLowerCase().includes('lien') || l.toLowerCase().includes('linkedin');
      
      if (isText && (isTelLike || isEmailLike || isUrlLike)) {
         console.log(file + ':' + (i+1) + ' - ' + l.trim());
      }
    }
  });
});
