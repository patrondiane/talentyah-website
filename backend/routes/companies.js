const express = require('express');
const db      = require('../db');
const auth    = require('../middleware/auth');
const router  = express.Router();

router.post('/', (req, res) => {
  const { company_name, email, region, role_needed, urgency, message } = req.body;
  if (!email) return res.status(400).json({ error: 'Email requis.' });
  db.prepare(`INSERT INTO companies (company_name,email,region,role_needed,urgency,message) VALUES (?,?,?,?,?,?)`)
    .run(company_name||null, email, region||null, role_needed||null, urgency||null, message||null);
  res.json({ ok: true });
});

router.get('/', auth, (req, res) => {
  const { country, urgency } = req.query;
  let sql = 'SELECT * FROM companies WHERE 1=1';
  const p = [];
  if (country) { sql += ' AND region LIKE ?'; p.push('%'+country+'%'); }
  if (urgency) { sql += ' AND urgency = ?';   p.push(urgency); }
  sql += ' ORDER BY created_at DESC';
  res.json({ companies: db.prepare(sql).all(...p) });
});

router.delete('/:id', auth, (req, res) => {
  db.prepare('DELETE FROM companies WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;