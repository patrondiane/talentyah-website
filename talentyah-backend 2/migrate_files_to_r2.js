require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { uploadToR2 } = require('./cloudflare-r2');
const db = require('./db');

async function main() {
  await db.init();
  
  const sbUrl = process.env.SUPABASE_URL;
  const sbKey = process.env.SUPABASE_SERVICE_KEY;
  const r2Key = process.env.R2_ACCESS_KEY_ID;

  if (!sbUrl || !sbKey) {
    console.error('ERREUR : SUPABASE_URL et SUPABASE_SERVICE_KEY sont requis.');
    process.exit(1);
  }

  if (!r2Key) {
    console.error('ERREUR : Les configurations Cloudflare R2 ne sont pas présentes dans le fichier .env.');
    process.exit(1);
  }

  console.log('Connexion au client Supabase Storage...');
  const supabase = createClient(sbUrl, sbKey);

  // 1. Récupérer tous les candidats qui ont un CV hébergé sur Supabase
  console.log('Recherche des candidats avec des CV sur Supabase...');
  const candidates = await db.all("SELECT id, first_name, last_name, cv_url FROM candidates WHERE cv_url LIKE '%supabase%'");
  console.log(`Trouvé ${candidates.length} candidats avec des fichiers à migrer.`);

  if (candidates.length === 0) {
    console.log('Aucun fichier à migrer.');
    process.exit(0);
  }

  console.log('\nDébut du transfert des fichiers vers Cloudflare R2...');
  console.log('--------------------------------------------------');

  let successCount = 0;
  for (const c of candidates) {
    console.log(`\nCandidat [ID ${c.id}] : ${c.first_name} ${c.last_name}`);
    console.log(`URL actuelle : ${c.cv_url}`);

    try {
      // Extraire le nom du fichier depuis l'URL
      const filename = c.cv_url.split('/').pop();
      if (!filename) {
        console.warn(`Impossible d'extraire le nom du fichier pour l'URL: ${c.cv_url}`);
        continue;
      }

      console.log(`Téléchargement de "${filename}" depuis Supabase Storage (bucket "cvs")...`);
      const { data: blob, error: downloadError } = await supabase.storage
        .from('cvs')
        .download(filename);

      if (downloadError) {
        throw new Error(`Téléchargement échoué : ${downloadError.message}`);
      }

      console.log('Conversion du fichier en buffer...');
      const arrayBuffer = await blob.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      console.log('Téléversement vers Cloudflare R2...');
      const uniqueKey = `cvs/${filename}`;
      const newUrl = await uploadToR2(buffer, uniqueKey, blob.type || 'application/pdf');
      console.log(`Upload R2 réussi. Nouvelle URL : ${newUrl}`);

      console.log('Mise à jour de la base de données...');
      await db.run('UPDATE candidates SET cv_url = ? WHERE id = ?', [newUrl, c.id]);
      console.log('Base de données mise à jour avec succès !');

      successCount++;
    } catch (err) {
      console.error(`❌ Échec pour le candidat ${c.first_name} ${c.last_name} (ID ${c.id}) :`, err.message);
    }
  }

  console.log('\n--------------------------------------------------');
  console.log(`Migration des fichiers terminée !`);
  console.log(`Succès : ${successCount}/${candidates.length} fichiers transférés et mis à jour.`);
  console.log('--------------------------------------------------');
}

main().catch(console.error);
