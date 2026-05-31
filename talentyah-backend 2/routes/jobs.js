// routes/jobs.js
const router = require('express').Router();
const db     = require('../db');
const { auth } = require('../middleware/auth');

// GET /api/jobs — public
router.get('/', (req, res) => {
  const { sector, country, contract_type } = req.query;
  let sql = `SELECT * FROM jobs WHERE status='active'`;
  const params = [];
  if (sector)        { sql += ` AND sector = ?`;        params.push(sector); }
  if (country)       { sql += ` AND country = ?`;       params.push(country); }
  if (contract_type) { sql += ` AND contract_type = ?`; params.push(contract_type); }
  sql += ` ORDER BY created_at DESC`;
  const jobs = db.all(sql, params);
  res.json({ jobs, total: jobs.length });
});

// GET /api/jobs/:id — public
router.get('/:id', (req, res) => {
  const job = db.get(`SELECT * FROM jobs WHERE id = ? AND status='active'`, [req.params.id]);
  if (!job) return res.status(404).json({ error: 'Offre introuvable' });
  res.json(job);
});

// POST /api/jobs — admin only
router.post('/', auth, (req, res) => {
  const { title, city, country, contract_type, sector, salary, description, requirements } = req.body;
  if (!title) return res.status(400).json({ error: 'Titre requis' });

  db.run(
    `INSERT INTO jobs (title, city, country, contract_type, sector, salary, description, requirements)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [title, city||null, country||null, contract_type||null, sector||null, salary||null, description||null, requirements||null]
  );
  const id = db.lastInsertRowId();
  const job = db.get(`SELECT * FROM jobs WHERE id = ?`, [id]);
  res.status(201).json(job);
});

// PUT /api/jobs/:id — admin only
router.put('/:id', auth, (req, res) => {
  const { title, city, country, contract_type, sector, salary, description, requirements, status } = req.body;
  db.run(
    `UPDATE jobs SET title=?, city=?, country=?, contract_type=?, sector=?, salary=?, description=?, requirements=?, status=?
     WHERE id=?`,
    [title, city||null, country||null, contract_type||null, sector||null, salary||null, description||null, requirements||null, status||'active', req.params.id]
  );
  const job = db.get(`SELECT * FROM jobs WHERE id = ?`, [req.params.id]);
  res.json(job);
});

// DELETE /api/jobs/:id — admin only
router.delete('/:id', auth, (req, res) => {
  db.run(`DELETE FROM jobs WHERE id = ?`, [req.params.id]);
  res.json({ ok: true });
});

module.exports = router;