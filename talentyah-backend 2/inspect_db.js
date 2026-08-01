require('dotenv').config();
const db = require('./db');

async function checkCandidates() {
  try {
    await db.init();
    const candidates = await db.all('SELECT * FROM candidates ORDER BY id DESC');
    console.log('--- CANDIDATS DANS LA BASE DE DONNÉES ---');
    console.log(`Total candidats: ${candidates.length}`);
    console.log(JSON.stringify(candidates, null, 2));
  } catch (err) {
    console.error('Erreur lecture DB:', err);
  }
}

checkCandidates();
