const express = require('express');
const db      = require('../db');
const auth    = require('../middleware/auth');
const router  = express.Router();

/* GET /api/jobs (public) */
router.get('/', (req, res) => {
  const { country, sector, contract_type } = req.query;
  let sql = 'SELECT * FROM jobs WHERE active = 1';
  const p = [];

  if (country)       { sql += ' AND country LIKE ?';    p.push('%' + country + '%'); }
  if (sector)        { sql += ' AND sector LIKE ?';     p.push('%' + sector  + '%'); }
  if (contract_type) { sql += ' AND contract_type = ?'; p.push(contract_type); }

  sql += ' ORDER BY created_at DESC';

  const rows = db.prepare(sql).all(...p).map(r => ({
    ...r,
    tags:   r.tags ? JSON.parse(r.tags) : [],
    active: r.active === 1,
    is_new: r.is_new === 1,
  }));
  res.json({ ok: true, total: rows.length, jobs: rows });
});

/* POST /api/jobs (admin) */
router.post('/', auth, (req, res) => {
  console.log('[POST /api/jobs] body:', req.body);
  const { title, country, city, sector, contract_type, salary, description, tags, is_new } = req.body;

  if (!title)
    return res.status(400).json({ ok: false, error: 'Titre du poste requis.' });

  const result = db.prepare(`
    INSERT INTO jobs (title, country, city, sector, contract_type, salary, description, tags, is_new)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    title.trim(), country || null, city || null, sector || null,
    contract_type || null, salary || null, description || null,
    tags ? JSON.stringify(tags) : null,
    is_new ? 1 : 0
  );

  console.log('[POST /api/jobs] Offre creee id:', result.lastInsertRowid);
  res.json({ ok: true, id: result.lastInsertRowid });
});

/* PATCH /api/jobs/:id — activer / desactiver (admin) */
router.patch('/:id', auth, (req, res) => {
  const { active } = req.body;
  db.prepare('UPDATE jobs SET active = ? WHERE id = ?').run(active ? 1 : 0, req.params.id);
  res.json({ ok: true });
});

/* DELETE /api/jobs/:id (admin) */
router.delete('/:id', auth, (req, res) => {
  db.prepare('DELETE FROM jobs WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;