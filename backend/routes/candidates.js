const express = require('express');
const db      = require('../db');
const auth    = require('../middleware/auth');
const router  = express.Router();

router.post('/', (req, res) => {
  const { first_name, last_name, email, country, role_target, experience_level, message } = req.body;
  if (!first_name || !last_name || !email) return res.status(400).json({ error: 'Champs requis.' });
  const cv_url = req.file ? '/uploads/' + req.file.filename : null;
  db.prepare(`INSERT INTO candidates (first_name,last_name,email,country,role_target,experience_level,cv_url,message) VALUES (?,?,?,?,?,?,?,?)`)
    .run(first_name, last_name, email, country||null, role_target||null, experience_level||null, cv_url, message||null);
  res.json({ ok: true });
});

router.get('/', auth, (req, res) => {
  const { country, sector } = req.query;
  let sql = 'SELECT * FROM candidates WHERE 1=1';
  const p = [];
  if (country) { sql += ' AND country LIKE ?';     p.push('%'+country+'%'); }
  if (sector)  { sql += ' AND role_target LIKE ?'; p.push('%'+sector+'%'); }
  sql += ' ORDER BY created_at DESC';
  res.json({ candidates: db.prepare(sql).all(...p) });
});

router.delete('/:id', auth, (req, res) => {
  db.prepare('DELETE FROM candidates WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;