// routes/publications.js
const router = require('express').Router();
const multer = require('multer');
const db     = require('../db');
const { auth } = require('../middleware/auth');
const { uploadBuffer, deleteByUrl } = require('../cloudinary');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// GET /api/publications — public
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

// GET /api/publications/all — admin
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

  const image_url    = req.file ? await uploadBuffer(req.file.buffer, 'talentyah/publications', { resource_type: 'image' }) : null;
  const published_at = status === 'published' ? new Date().toISOString().slice(0,10) : null;

  const result = await db.run(
    `INSERT INTO publications (title, category, status, excerpt, content, image_url, published_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [title, category || 'Conseil carrière', status || 'draft', excerpt || null, content || null, image_url, published_at]
  );
  const id  = db.lastInsertRowId(result);
  res.status(201).json(await db.get(`SELECT * FROM publications WHERE id = ?`, [id]));
});

// PUT /api/publications/:id — admin
router.put('/:id', auth, upload.single('image'), async (req, res) => {
  const { title, category, status, excerpt, content } = req.body;
  const existing = await db.get(`SELECT * FROM publications WHERE id = ?`, [req.params.id]);
  if (!existing) return res.status(404).json({ error: 'Article introuvable' });

  let image_url = existing.image_url;
  if (req.file) {
    await deleteByUrl(existing.image_url);
    image_url = await uploadBuffer(req.file.buffer, 'talentyah/publications', { resource_type: 'image' });
  }
  const published_at = status === 'published' ? (existing.published_at || new Date().toISOString().slice(0,10)) : null;

  await db.run(
    `UPDATE publications SET title=?, category=?, status=?, excerpt=?, content=?, image_url=?, published_at=?, updated_at=datetime('now') WHERE id=?`,
    [title || existing.title, category || existing.category, status || existing.status,
     excerpt || null, content || null, image_url, published_at, req.params.id]
  );
  res.json(await db.get(`SELECT * FROM publications WHERE id = ?`, [req.params.id]));
});

// PATCH /api/publications/:id/status
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

// DELETE /api/publications/:id
router.delete('/:id', auth, async (req, res) => {
  const pub = await db.get(`SELECT image_url FROM publications WHERE id = ?`, [req.params.id]);
  await deleteByUrl(pub?.image_url);
  await db.run(`DELETE FROM publications WHERE id = ?`, [req.params.id]);
  res.json({ ok: true });
});

module.exports = router;