require('dotenv').config();
const db = require('./db');

function blocksToHtml(content) {
  if (!content) return '';
  if (typeof content === 'string') {
    if (content.trim().startsWith('{')) {
      try {
        const parsed = JSON.parse(content);
        if (parsed.blocks) {
          return parsed.blocks.map(b => {
             if (b.type === 'paragraph') return `<p>${b.data.text}</p>`;
             if (b.type === 'header') return `<h${b.data.level || 2}>${b.data.text}</h${b.data.level || 2}>`;
             if (b.type === 'list') {
               const tag = b.data.style === 'ordered' ? 'ol' : 'ul';
               const items = (b.data.items || []).map(i => `<li>${i}</li>`).join('');
               return `<${tag}>${items}</${tag}>`;
             }
             return b.data.text || '';
          }).join('');
        }
      } catch(e) {}
    }
  }
  return content; // Return as-is if not JSON string
}

async function migrate() {
  await db.init();
  
  console.log('Migrating jobs...');
  const jobs = await db.all('SELECT id, description, requirements FROM jobs');
  for (const job of jobs) {
    const descHtml = blocksToHtml(job.description);
    const reqHtml = blocksToHtml(job.requirements);
    if (descHtml !== job.description || reqHtml !== job.requirements) {
      await db.run('UPDATE jobs SET description = ?, requirements = ? WHERE id = ?', [descHtml, reqHtml, job.id]);
      console.log(`Updated job ${job.id}`);
    }
  }

  console.log('Migrating publications...');
  const pubs = await db.all('SELECT id, content FROM publications');
  for (const pub of pubs) {
    const contentHtml = blocksToHtml(pub.content);
    if (contentHtml !== pub.content) {
      await db.run('UPDATE publications SET content = ? WHERE id = ?', [contentHtml, pub.id]);
      console.log(`Updated publication ${pub.id}`);
    }
  }
  
  console.log('Migration complete.');
}

migrate().catch(console.error);
