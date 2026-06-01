// routes/carousel.js
const router = require('express').Router();
const multer = require('multer');
const db     = require('../db');
const { auth } = require('../middleware/auth');
const { uploadBuffer, deleteByUrl } = require('../cloudinary');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// GET /api/carousel?page=talents — public
router.get('/', async (req, res) => {
  res.set('Cache-Control', 'no-store');
  const page   = req.query.page || 'all';
  const slides = await db.all(`SELECT * FROM carousel_slides WHERE active=1 ORDER BY sort_order ASC, created_at ASC`);
  const filtered = slides.filter(s => {
    if (!s.pages || s.pages === 'all') return true;
    const list = s.pages.split(',').map(p => p.trim());
    return list.includes('all') || list.includes(page);
  });
  res.json({ slides: filtered, total: filtered.length });
});

// GET /api/carousel/all — admin
router.get('/all', auth, async (req, res) => {
  const slides = await db.all(`SELECT * FROM carousel_slides ORDER BY sort_order ASC, created_at ASC`);
  res.json({ slides, total: slides.length });
});

// POST /api/carousel — admin
router.post('/', auth, upload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Image requise' });
  const { eyebrow, title, subtitle, cta1_text, cta1_url, cta2_text, cta2_url, sort_order, pages } = req.body;
  const pagesValue = Array.isArray(pages) ? pages.join(',') : (pages || 'all');

  const image_url = await uploadBuffer(req.file.buffer, 'talentyah/slides', { resource_type: 'image' });

  const result = await db.run(
    `INSERT INTO carousel_slides (image_url, eyebrow, title, subtitle, cta1_text, cta1_url, cta2_text, cta2_url, pages, sort_order)
     VALUES (?,?,?,?,?,?,?,?,?,?)`,
    [image_url, eyebrow||'Cabinet de recrutement', title||'Talentyah', subtitle||null,
     cta1_text||'En savoir plus →', cta1_url||'entreprises.html',
     cta2_text||null, cta2_url||null, pagesValue, Number(sort_order)||0]
  );
  const id = db.lastInsertRowId(result);
  res.status(201).json(await db.get(`SELECT * FROM carousel_slides WHERE id=?`, [id]));
});

// PUT /api/carousel/:id — admin
router.put('/:id', auth, upload.single('image'), async (req, res) => {
  const ex = await db.get(`SELECT * FROM carousel_slides WHERE id=?`, [req.params.id]);
  if (!ex) return res.status(404).json({ error: 'Slide introuvable' });
  const { eyebrow, title, subtitle, cta1_text, cta1_url, cta2_text, cta2_url, sort_order, active, pages } = req.body;
  const pagesValue = Array.isArray(pages) ? pages.join(',') : (pages || ex.pages || 'all');

  let image_url = ex.image_url;
  if (req.file) {
    await deleteByUrl(ex.image_url);  // supprime l'ancienne image
    image_url = await uploadBuffer(req.file.buffer, 'talentyah/slides', { resource_type: 'image' });
  }

  await db.run(
    `UPDATE carousel_slides SET image_url=?,eyebrow=?,title=?,subtitle=?,cta1_text=?,cta1_url=?,cta2_text=?,cta2_url=?,pages=?,sort_order=?,active=? WHERE id=?`,
    [image_url, eyebrow||ex.eyebrow, title||ex.title, subtitle??ex.subtitle,
     cta1_text||ex.cta1_text, cta1_url||ex.cta1_url,
     cta2_text??ex.cta2_text, cta2_url??ex.cta2_url,
     pagesValue, Number(sort_order)||ex.sort_order,
     active!==undefined ? Number(active) : ex.active,
     req.params.id]
  );
  res.json(await db.get(`SELECT * FROM carousel_slides WHERE id=?`, [req.params.id]));
});

// DELETE /api/carousel/:id — admin
router.delete('/:id', auth, async (req, res) => {
  const slide = await db.get(`SELECT image_url FROM carousel_slides WHERE id=?`, [req.params.id]);
  await deleteByUrl(slide?.image_url);
  await db.run(`DELETE FROM carousel_slides WHERE id=?`, [req.params.id]);
  res.json({ ok: true });
});

module.exports = router;