// routes/crm.js
const router = require('express').Router();
const db     = require('../db');
const { auth } = require('../middleware/auth');

// GET /api/crm/clients
router.get('/clients', auth, async (req, res) => {
  try {
    const rows = await db.all('SELECT * FROM crm_clients ORDER BY created_at DESC');
    // Parse historique field if it's text or keep as object
    const clients = rows.map(r => ({
      ...r,
      historique: typeof r.historique === 'string' ? JSON.parse(r.historique) : (r.historique || [])
    }));
    res.json(clients);
  } catch (err) {
    console.error('[GET /crm/clients]', err.message);
    res.status(500).json({ error: 'Erreur lors de la récupération des clients.' });
  }
});

// POST /api/crm/clients
router.post('/clients', auth, async (req, res) => {
  const { entreprise, secteur, contact, fonction, email, tel, source, stade, besoin, commentaires, linkedin, prochaine_action, historique } = req.body;
  if (!entreprise) return res.status(400).json({ error: 'Entreprise requise' });
  try {
    const histStr = JSON.stringify(historique || []);
    const result = await db.run(
      `INSERT INTO crm_clients (entreprise, secteur, contact, fonction, email, tel, source, stade, besoin, commentaires, linkedin, prochaine_action, historique)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?::json)`,
      [entreprise, secteur||null, contact||null, fonction||null, email||null, tel||null, source||null, stade||'A contacter', besoin||null, commentaires||null, linkedin||null, prochaine_action||null, histStr]
    );
    const id = db.lastInsertRowId(result);
    res.status(201).json({ id, message: 'Client créé avec succès' });
  } catch (err) {
    console.error('[POST /crm/clients]', err.message);
    res.status(500).json({ error: 'Erreur de création du client.' });
  }
});

// PUT /api/crm/clients/:id
router.put('/clients/:id', auth, async (req, res) => {
  const { id } = req.params;
  const { entreprise, secteur, contact, fonction, email, tel, source, stade, besoin, commentaires, linkedin, prochaine_action, historique } = req.body;
  if (!entreprise) return res.status(400).json({ error: 'Entreprise requise' });
  try {
    const histStr = JSON.stringify(historique || []);
    await db.run(
      `UPDATE crm_clients
       SET entreprise = ?, secteur = ?, contact = ?, fonction = ?, email = ?, tel = ?, source = ?, stade = ?, besoin = ?, commentaires = ?, linkedin = ?, prochaine_action = ?, historique = ?::json
       WHERE id = ?`,
      [entreprise, secteur||null, contact||null, fonction||null, email||null, tel||null, source||null, stade||'A contacter', besoin||null, commentaires||null, linkedin||null, prochaine_action||null, histStr, id]
    );
    res.json({ message: 'Client mis à jour avec succès' });
  } catch (err) {
    console.error('[PUT /crm/clients]', err.message, err.stack);
    console.error('Params were:', [entreprise, secteur, contact, fonction, email, tel, source, stade, besoin, commentaires, linkedin, prochaine_action, req.body.historique, id]);
    res.status(500).json({ error: 'Erreur de mise à jour du client.', details: err.message });
  }
});

// DELETE /api/crm/clients/:id
router.delete('/clients/:id', auth, async (req, res) => {
  try {
    await db.run('DELETE FROM crm_clients WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error('[DELETE /crm/clients]', err.message);
    res.status(500).json({ error: 'Erreur lors de la suppression.' });
  }
});

// GET /api/crm/partners
router.get('/partners', auth, async (req, res) => {
  try {
    const rows = await db.all('SELECT * FROM crm_partners ORDER BY created_at DESC');
    const partners = rows.map(r => ({
      ...r,
      historique: typeof r.historique === 'string' ? JSON.parse(r.historique) : (r.historique || [])
    }));
    res.json(partners);
  } catch (err) {
    console.error('[GET /crm/partners]', err.message);
    res.status(500).json({ error: 'Erreur lors de la récupération des partenaires.' });
  }
});

// POST /api/crm/partners
router.post('/partners', auth, async (req, res) => {
  const { organisme, activite, contact, fonction, email, tel, source, stade, commentaires, historique } = req.body;
  if (!organisme) return res.status(400).json({ error: 'Organisme requis' });
  try {
    const histStr = JSON.stringify(historique || []);
    const result = await db.run(
      `INSERT INTO crm_partners (organisme, activite, contact, fonction, email, tel, source, stade, commentaires, historique)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?::json)`,
      [organisme, activite||null, contact||null, fonction||null, email||null, tel||null, source||null, stade||'A contacter', commentaires||null, histStr]
    );
    const id = db.lastInsertRowId(result);
    res.status(201).json({ id, message: 'Partenaire créé avec succès' });
  } catch (err) {
    console.error('[POST /crm/partners]', err.message);
    res.status(500).json({ error: 'Erreur de création du partenaire.' });
  }
});

// PUT /api/crm/partners/:id
router.put('/partners/:id', auth, async (req, res) => {
  const { id } = req.params;
  const { organisme, activite, contact, fonction, email, tel, source, stade, commentaires, historique } = req.body;
  if (!organisme) return res.status(400).json({ error: 'Organisme requis' });
  try {
    const histStr = JSON.stringify(historique || []);
    await db.run(
      `UPDATE crm_partners
       SET organisme = ?, activite = ?, contact = ?, fonction = ?, email = ?, tel = ?, source = ?, stade = ?, commentaires = ?, historique = ?::json
       WHERE id = ?`,
      [organisme, activite||null, contact||null, fonction||null, email||null, tel||null, source||null, stade||'A contacter', commentaires||null, histStr, id]
    );
    res.json({ message: 'Partenaire mis à jour avec succès' });
  } catch (err) {
    console.error('[PUT /crm/partners]', err.message);
    res.status(500).json({ error: 'Erreur de mise à jour du partenaire.' });
  }
});

// DELETE /api/crm/partners/:id
router.delete('/partners/:id', auth, async (req, res) => {
  try {
    await db.run('DELETE FROM crm_partners WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error('[DELETE /crm/partners]', err.message);
    res.status(500).json({ error: 'Erreur lors de la suppression.' });
  }
});

// POST /api/crm/migrate (automatic frontend migration)
router.post('/migrate', auth, async (req, res) => {
  const { clients, partenariats } = req.body;
  try {
    // Migrate clients
    if (Array.isArray(clients)) {
      for (const c of clients) {
        const histStr = JSON.stringify(c.historique || []);
        await db.run(
          `INSERT INTO crm_clients (entreprise, secteur, contact, fonction, email, tel, source, stade, besoin, commentaires, linkedin, prochaine_action, historique)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?::json)`,
          [c.entreprise, c.secteur||null, c.contact||null, c.fonction||null, c.email||null, c.tel||null, c.source||null, c.stade||'A contacter', c.besoin||null, c.commentaires||null, c.linkedin||null, c.prochaine_action||null, histStr]
        );
      }
    }
    // Migrate partnerships
    if (Array.isArray(partenariats)) {
      for (const p of partenariats) {
        // Map keys if they differ
        const org = p.organisme || p.entreprise || 'Sans nom';
        const act = p.activite || p.secteur || null;
        const histStr = JSON.stringify(p.historique || []);
        await db.run(
          `INSERT INTO crm_partners (organisme, activite, contact, fonction, email, tel, source, stade, commentaires, historique)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?::json)`,
          [org, act, p.contact||null, p.fonction||null, p.email||null, p.tel||null, p.source||null, p.stade||'A contacter', p.commentaires||null, histStr]
        );
      }
    }
    res.json({ success: true, message: 'Migration réussie' });
  } catch (err) {
    console.error('[POST /crm/migrate]', err.message);
    res.status(500).json({ error: 'Erreur de migration.' });
  }
});

module.exports = router;
