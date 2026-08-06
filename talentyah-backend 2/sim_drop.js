require('dotenv').config();
const db = require('./db.js');

const r = { id: 4, entreprise: 'Test Drop', stade: 'A contacter', historique: [] };
const oldStade = 'A contacter';
const newStade = 'Relance';
r.stade = newStade;
r.historique.push({ date: new Date().toISOString(), text: `Stade changé : "${oldStade || '—'}" → "${newStade}"` });

const histStr = JSON.stringify(r.historique);

db.init().then(async () => {
  try {
    const result = await db.run(
      `UPDATE crm_clients SET entreprise = ?, secteur = ?, contact = ?, fonction = ?, email = ?, tel = ?, source = ?, stade = ?, besoin = ?, commentaires = ?, linkedin = ?, prochaine_action = ?, historique = ? WHERE id = ?`,
      [r.entreprise, r.secteur||null, r.contact||null, r.fonction||null, r.email||null, r.tel||null, r.source||null, r.stade||'A contacter', r.besoin||null, r.commentaires||null, r.linkedin||null, r.prochaine_action||null, histStr, r.id]
    );
    console.log('Success:', result);
  } catch(e) {
    console.log('Error:', e.message);
  }
}).catch(console.error);
