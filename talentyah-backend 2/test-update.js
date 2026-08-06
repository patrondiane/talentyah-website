require('dotenv').config();
const db = require('./db.js');
db.init().then(async () => {
  try {
    await db.run(
      `UPDATE crm_clients SET entreprise = ?, secteur = ?, contact = ?, fonction = ?, email = ?, tel = ?, source = ?, stade = ?, besoin = ?, commentaires = ?, linkedin = ?, prochaine_action = ?, historique = ? WHERE id = ?`,
      ['Test', null, null, null, null, null, null, 'Négociation', null, null, null, null, '[]', '4']
    );
    console.log('Success');
  } catch(e) {
    console.log('Error:', e.message);
  }
}).catch(console.error);
