// routes/jobs.js
const router = require('express').Router();
const db     = require('../db');
const { auth } = require('../middleware/auth');

// GET /api/jobs — public
router.get('/', async (req, res) => {
  const { sector, country, contract_type } = req.query;
  let sql = `SELECT * FROM jobs WHERE status='active'`;
  const params = [];
  if (sector)        { sql += ` AND sector = ?`;        params.push(sector); }
  if (country)       { sql += ` AND country = ?`;       params.push(country); }
  if (contract_type) { sql += ` AND contract_type = ?`; params.push(contract_type); }
  sql += ` ORDER BY created_at DESC`;
  const jobs = await db.all(sql, params);
  res.json({ jobs, total: jobs.length });
});

// GET /api/jobs/all — admin only
router.get('/all', auth, async (req, res) => {
  try {
    const jobs = await db.all(`SELECT * FROM jobs ORDER BY created_at DESC`);
    res.json({ jobs, total: jobs.length });
  } catch (err) {
    console.error('[GET /api/jobs/all]', err.message);
    res.status(500).json({ error: 'Erreur lors du chargement des offres.' });
  }
});

// GET /api/jobs/:id — public
router.get('/:id', async (req, res) => {
  if (isNaN(req.params.id)) return res.status(400).json({ error: 'ID invalide' });
  try {
    const job = await db.get(`SELECT * FROM jobs WHERE id = ? AND status='active'`, [req.params.id]);
    if (!job) return res.status(404).json({ error: 'Offre introuvable' });
    res.json(job);
  } catch (err) {
    console.error('[GET /api/jobs/:id]', err.message);
    res.status(500).json({ error: 'Erreur lors du chargement de l\'offre.' });
  }
});

// POST /api/jobs — admin only
router.post('/', auth, async (req, res) => {
  const { title, city, country, contract_type, sector, salary, description, requirements } = req.body;
  if (!title) return res.status(400).json({ error: 'Titre requis' });

  try {
    const result = await db.run(
      `INSERT INTO jobs (title, city, country, contract_type, sector, salary, description, requirements)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [title, city||null, country||null, contract_type||null, sector||null, salary||null, description||null, requirements||null]
    );
    const id  = db.lastInsertRowId(result);
    const job = await db.get(`SELECT * FROM jobs WHERE id = ?`, [id]);
    res.status(201).json(job);
  } catch (err) {
    console.error('[POST /api/jobs]', err.message);
    res.status(500).json({ error: 'Erreur lors de la création de l\'offre.' });
  }
});

// PUT /api/jobs/:id — admin only
router.put('/:id', auth, async (req, res) => {
  const { title, city, country, contract_type, sector, salary, description, requirements, status } = req.body;
  try {
    await db.run(
      `UPDATE jobs SET title=?, city=?, country=?, contract_type=?, sector=?, salary=?, description=?, requirements=?, status=?
       WHERE id=?`,
      [title, city||null, country||null, contract_type||null, sector||null, salary||null, description||null, requirements||null, status||'active', req.params.id]
    );
    const job = await db.get(`SELECT * FROM jobs WHERE id = ?`, [req.params.id]);
    res.json(job);
  } catch (err) {
    console.error('[PUT /api/jobs/:id]', err.message);
    res.status(500).json({ error: 'Erreur lors de la mise à jour de l\'offre.' });
  }
});

// DELETE /api/jobs/:id — admin only
router.delete('/:id', auth, async (req, res) => {
  try {
    await db.run(`DELETE FROM jobs WHERE id = ?`, [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error('[DELETE /api/jobs/:id]', err.message);
    res.status(500).json({ error: 'Erreur lors de la suppression de l\'offre.' });
  }
});

module.exports = router;