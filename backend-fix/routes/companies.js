const express = require('express');
const db      = require('../db');
const auth    = require('../middleware/auth');
const router  = express.Router();

/* POST /api/companies (public) */
router.post('/', (req, res) => {
  console.log('[POST /api/companies] body:', req.body);

  const { company_name, email, region, role_needed, urgency, message } = req.body;

  if (!email)
    return res.status(400).json({ ok: false, error: 'Email requis.' });

  db.prepare(`
    INSERT INTO companies (company_name, email, region, role_needed, urgency, message)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    company_name || null, email.trim().toLowerCase(),
    region || null, role_needed || null, urgency || null, message || null
  );

  console.log('[POST /api/companies] Demande enregistree :', email);
  res.json({ ok: true, message: 'Demande enregistree.' });
});

/* GET /api/companies (admin)
   ?country=Dakar   → filtre par region
   ?urgency=elevee  → filtre par urgence
*/
router.get('/', auth, (req, res) => {
  const { country, urgency } = req.query;
  let sql = 'SELECT * FROM companies WHERE 1=1';
  const p = [];

  if (country) { sql += ' AND region LIKE ?'; p.push('%' + country + '%'); }
  if (urgency) { sql += ' AND urgency = ?';   p.push(urgency); }

  sql += ' ORDER BY created_at DESC';
  const rows = db.prepare(sql).all(...p);
  res.json({ ok: true, total: rows.length, companies: rows });
});

/* DELETE /api/companies/:id (admin) */
router.delete('/:id', auth, (req, res) => {
  db.prepare('DELETE FROM companies WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
