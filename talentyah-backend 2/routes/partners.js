// routes/partners.js
const router  = require('express').Router();
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');
const db      = require('../db');
const { auth } = require('../middleware/auth');

const UPLOADS_DIR = path.join(__dirname, '../uploads');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename:    (req, file, cb) => {
    const ext  = path.extname(file.originalname);
    const safe = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9-]/g, '_');
    cb(null, `partner_${Date.now()}_${safe}${ext}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 2 * 1024 * 1024 } });

// GET /api/partners — public
router.get('/', async (req, res) => {
  const partners = await db.all(
    `SELECT * FROM partners WHERE image_url IS NOT NULL ORDER BY sort_order ASC, created_at ASC`
  );
  res.json({ partners, total: partners.length });
});

// GET /api/partners/all — admin
router.get('/all', auth, async (req, res) => {
  const partners = await db.all(`SELECT * FROM partners ORDER BY sort_order ASC, created_at ASC`);
  res.json({ partners, total: partners.length });
});

// POST /api/partners — admin
router.post('/', auth, upload.single('image'), async (req, res) => {
  const { name, description, sort_order } = req.body;
  if (!name) return res.status(400).json({ error: 'Nom requis' });
  const image_url = req.file ? `/uploads/${req.file.filename}` : null;
  const result = await db.run(
    `INSERT INTO partners (name, description, image_url, sort_order) VALUES (?,?,?,?)`,
    [name, description || null, image_url, Number(sort_order) || 0]
  );
  const id = db.lastInsertRowId(result);
  res.status(201).json(await db.get(`SELECT * FROM partners WHERE id = ?`, [id]));
});

// PUT /api/partners/:id — admin
router.put('/:id', auth, upload.single('image'), async (req, res) => {
  const existing = await db.get(`SELECT * FROM partners WHERE id = ?`, [req.params.id]);
  if (!existing) return res.status(404).json({ error: 'Partenaire introuvable' });
  const { name, description, sort_order, existing_image_url } = req.body;
  const image_url = req.file
    ? `/uploads/${req.file.filename}`
    : (existing_image_url || existing.image_url);
  await db.run(
    `UPDATE partners SET name=?, description=?, image_url=?, sort_order=? WHERE id=?`,
    [name || existing.name, description ?? existing.description, image_url, Number(sort_order) || existing.sort_order, req.params.id]
  );
  res.json(await db.get(`SELECT * FROM partners WHERE id = ?`, [req.params.id]));
});

// POST /api/partners/bulk — admin
router.post('/bulk', auth, async (req, res) => {
  const { partners } = req.body;
  if (!Array.isArray(partners)) return res.status(400).json({ error: 'partners[] requis' });
  await db.run(`DELETE FROM partners`);
  for (let i = 0; i < partners.length; i++) {
    const p = partners[i];
    await db.run(
      `INSERT INTO partners (name, description, image_url, sort_order) VALUES (?,?,?,?)`,
      [p.name || 'Partenaire', p.description || null, p.image_url || null, i]
    );
  }
  res.json({ ok: true, count: partners.length });
});

// DELETE /api/partners/:id — admin
router.delete('/:id', auth, async (req, res) => {
  const p = await db.get(`SELECT image_url FROM partners WHERE id = ?`, [req.params.id]);
  if (p?.image_url) {
    const fpath = path.join(UPLOADS_DIR, path.basename(p.image_url));
    if (fs.existsSync(fpath)) fs.unlinkSync(fpath);
  }
  await db.run(`DELETE FROM partners WHERE id = ?`, [req.params.id]);
  res.json({ ok: true });
});

module.exports = router;