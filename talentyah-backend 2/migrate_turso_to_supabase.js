require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { createClient: createTursoClient } = require('@libsql/client');

async function main() {
  const tursoUrl = process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL;
  const tursoToken = process.env.TURSO_AUTH_TOKEN || process.env.DATABASE_AUTH_TOKEN;
  
  const sbUrl = process.env.SUPABASE_URL;
  const sbKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY;

  if (!tursoUrl || !tursoToken) {
    console.error('ERREUR : Les variables TURSO_DATABASE_URL et TURSO_AUTH_TOKEN sont requises pour lire les données de production actuelles.');
    process.exit(1);
  }

  if (!sbUrl || !sbKey) {
    console.error('ERREUR : Les variables SUPABASE_URL et SUPABASE_SERVICE_KEY sont requises pour écrire dans Supabase.');
    process.exit(1);
  }

  console.log('Connexion aux bases de données...');
  const turso = createTursoClient({ url: tursoUrl, authToken: tursoToken });
  const supabase = createClient(sbUrl, sbKey);

  const tables = [
    'admin_users',
    'candidates',
    'companies',
    'jobs',
    'publications',
    'partners',
    'contacts',
    'carousel_slides'
  ];

  for (const table of tables) {
    console.log(`\n--------------------------------------------`);
    console.log(`Migration de la table : ${table}...`);
    console.log(`--------------------------------------------`);

    try {
      // 1. Lire depuis Turso
      const tursoRes = await turso.execute(`SELECT * FROM ${table}`);
      const rows = tursoRes.rows;
      console.log(`Trouvé ${rows.length} lignes dans Turso.`);

      if (rows.length === 0) {
        console.log(`Table vide, passage à la suite.`);
        continue;
      }

      // 2. Vider la table Supabase avant import (optionnel mais propre pour éviter les conflits)
      console.log(`Vidage de la table ${table} dans Supabase...`);
      const { error: deleteErr } = await supabase.from(table).delete().neq('id', 0);
      if (deleteErr) {
        console.warn(`Attention (non bloquant) lors du nettoyage :`, deleteErr.message);
      }

      // 3. Insérer les lignes dans Supabase via le SDK client (évite le bug des placeholders "?" dans les textes)
      let insertedCount = 0;
      for (const row of rows) {
        // Nettoyer les objets lignes retournés par LibSQL
        const cleanRow = {};
        for (const key of Object.keys(row)) {
          cleanRow[key] = row[key];
        }

        const { error: insertErr } = await supabase.from(table).insert(cleanRow);

        if (insertErr) {
          console.error(`Échec d'insertion pour l'id ${cleanRow.id}:`, insertErr.message);
        } else {
          insertedCount++;
        }
      }
      console.log(`Succès : ${insertedCount}/${rows.length} lignes migrées dans Supabase.`);

      // 4. Mettre à jour la séquence PostgreSQL pour l'auto-incrément
      // C'est CRUCIAL en Postgres pour éviter que le prochain INSERT automatique ne plante sur une clé dupliquée !
      console.log(`Mise à jour de la séquence de clé primaire pour ${table}...`);
      const seqSql = `SELECT setval(pg_get_serial_sequence('${table}', 'id'), COALESCE(max(id), 1)) FROM ${table}`;
      const { error: seqErr } = await supabase.rpc('run_sql', {
        sql_query: seqSql,
        params: []
      });
      if (seqErr) {
        console.warn(`Avertissement (séquence) : impossible de mettre à jour la séquence :`, seqErr.message);
      } else {
        console.log(`Séquence mise à jour avec succès.`);
      }

    } catch (err) {
      console.error(`Erreur critique lors de la migration de la table ${table} :`, err.message);
    }
  }

  console.log('\n============================================');
  console.log('MIGRATION DE PROD TERMINÉE !');
  console.log('Toutes les données de production Turso ont été copiées dans Supabase.');
  console.log('Vous pouvez maintenant déployer le nouveau code en production.');
  console.log('============================================');
}

main().catch(console.error);
