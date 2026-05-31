// Exécuter UNE SEULE FOIS depuis le dossier talentyah-backend :
// node nettoyer_db.js

const db = require('./db');
db.init().then(() => {
  const avant = db.all('SELECT id, name, image_url FROM partners');
  console.log('Partenaires avant nettoyage:', avant);

  // Supprimer les partenaires sans image (seeds inutiles)
  db.run('DELETE FROM partners WHERE image_url IS NULL');

  const apres = db.all('SELECT id, name, image_url FROM partners');
  console.log('Partenaires après nettoyage:', apres);
  console.log('Nettoyage terminé. Redémarre le backend.');
  process.exit(0);
}).catch(e => { console.error(e); process.exit(1); });