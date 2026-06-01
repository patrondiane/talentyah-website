// routes/publications.js
const router = require('express').Router();
const multer = require('multer');
const path   = require('path');
const db     = require('../db');
const { auth } = require('../middleware/auth');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../uploads')),
  filename:    (req, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `pub_${Date.now()}_${safe}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// GET /api/publications — public (articles publiés)
router.get('/', async (req, res) => {
  const { status, category } = req.query;
  let sql = `SELECT * FROM publications WHERE 1=1`;
  const params = [];
  if (status)   { sql += ` AND status = ?`;   params.push(status); }
  else          { sql += ` AND status = 'published'`; }
  if (category) { sql += ` AND category = ?`; params.push(category); }
  sql += ` ORDER BY created_at DESC`;
  const publications = await db.all(sql, params);
  res.json({ publications, total: publications.length });
});

// GET /api/publications/all — admin (tous statuts)
router.get('/all', auth, async (req, res) => {
  const publications = await db.all(`SELECT * FROM publications ORDER BY created_at DESC`);
  res.json({ publications, total: publications.length });
});

// GET /api/publications/:id — public
router.get('/:id', async (req, res) => {
  const pub = await db.get(`SELECT * FROM publications WHERE id = ?`, [req.params.id]);
  if (!pub) return res.status(404).json({ error: 'Article introuvable' });
  res.json(pub);
});

// POST /api/publications — admin
router.post('/', auth, upload.single('image'), async (req, res) => {
  const { title, category, status, excerpt, content } = req.body;
  if (!title) return res.status(400).json({ error: 'Titre requis' });

  const image_url    = req.file ? `/uploads/${req.file.filename}` : null;
  const published_at = status === 'published' ? new Date().toISOString().slice(0,10) : null;

  const result = await db.run(
    `INSERT INTO publications (title, category, status, excerpt, content, image_url, published_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [title, category || 'Conseil carrière', status || 'draft', excerpt || null, content || null, image_url, published_at]
  );
  const id  = db.lastInsertRowId(result);
  const pub = await db.get(`SELECT * FROM publications WHERE id = ?`, [id]);
  res.status(201).json(pub);
});

// PUT /api/publications/:id — admin
router.put('/:id', auth, upload.single('image'), async (req, res) => {
  const { title, category, status, excerpt, content } = req.body;
  const existing = await db.get(`SELECT * FROM publications WHERE id = ?`, [req.params.id]);
  if (!existing) return res.status(404).json({ error: 'Article introuvable' });

  const image_url    = req.file ? `/uploads/${req.file.filename}` : existing.image_url;
  const published_at = status === 'published' ? (existing.published_at || new Date().toISOString().slice(0,10)) : null;

  await db.run(
    `UPDATE publications SET title=?, category=?, status=?, excerpt=?, content=?, image_url=?, published_at=?, updated_at=datetime('now')
     WHERE id=?`,
    [title || existing.title, category || existing.category, status || existing.status,
     excerpt || null, content || null, image_url, published_at, req.params.id]
  );
  res.json(await db.get(`SELECT * FROM publications WHERE id = ?`, [req.params.id]));
});

// PATCH /api/publications/:id/status — toggle publié/brouillon
router.patch('/:id/status', auth, async (req, res) => {
  const pub = await db.get(`SELECT * FROM publications WHERE id = ?`, [req.params.id]);
  if (!pub) return res.status(404).json({ error: 'Article introuvable' });
  const newStatus    = pub.status === 'published' ? 'draft' : 'published';
  const published_at = newStatus === 'published' ? (pub.published_at || new Date().toISOString().slice(0,10)) : null;
  await db.run(
    `UPDATE publications SET status=?, published_at=?, updated_at=datetime('now') WHERE id=?`,
    [newStatus, published_at, req.params.id]
  );
  res.json({ id: pub.id, status: newStatus });
});

// DELETE /api/publications/:id — admin
router.delete('/:id', auth, async (req, res) => {
  await db.run(`DELETE FROM publications WHERE id = ?`, [req.params.id]);
  res.json({ ok: true });
});

module.exports = router;