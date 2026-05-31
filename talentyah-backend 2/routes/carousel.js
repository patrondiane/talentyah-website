// routes/carousel.js
const router = require('express').Router();
const multer = require('multer');
const path   = require('path');
const fs     = require('fs');
const db     = require('../db');
const { auth } = require('../middleware/auth');

const UPLOADS_DIR = path.join(__dirname, '../uploads');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

// Migration : ajouter la colonne pages si elle n'existe pas
try {
  db.run(`ALTER TABLE carousel_slides ADD COLUMN pages TEXT DEFAULT 'all'`);
} catch { /* colonne existe déjà */ }

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename:    (req, file, cb) => {
    const ext  = path.extname(file.originalname);
    const safe = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9-]/g, '_');
    cb(null, `slide_${Date.now()}_${safe}${ext}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

const ALL_PAGES = ['index', 'talents', 'entreprises', 'carrieres', 'apropos', 'notre-approche', 'ressources'];

// GET /api/carousel?page=talents — public, filtré par page
router.get('/', (req, res) => {
  res.set('Cache-Control', 'no-store');
  const page   = req.query.page || 'all';
  const slides = db.all(`SELECT * FROM carousel_slides WHERE active=1 ORDER BY sort_order ASC, created_at ASC`);

  // Filtrer : slide visible si pages='all' ou si la page est dans la liste
  const filtered = slides.filter(s => {
    if (!s.pages || s.pages === 'all') return true;
    const list = s.pages.split(',').map(p => p.trim());
    return list.includes('all') || list.includes(page);
  });

  res.json({ slides: filtered, total: filtered.length });
});

// GET /api/carousel/all — admin (tous)
router.get('/all', auth, (req, res) => {
  const slides = db.all(`SELECT * FROM carousel_slides ORDER BY sort_order ASC, created_at ASC`);
  res.json({ slides, total: slides.length });
});

// POST /api/carousel — admin
router.post('/', auth, upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Image requise' });
  const { eyebrow, title, subtitle, cta1_text, cta1_url, cta2_text, cta2_url, sort_order, pages } = req.body;
  const image_url  = `/uploads/${req.file.filename}`;
  const pagesValue = Array.isArray(pages) ? pages.join(',') : (pages || 'all');

  db.run(
    `INSERT INTO carousel_slides (image_url, eyebrow, title, subtitle, cta1_text, cta1_url, cta2_text, cta2_url, pages, sort_order)
     VALUES (?,?,?,?,?,?,?,?,?,?)`,
    [image_url, eyebrow||'Cabinet de recrutement', title||'Talentyah', subtitle||null,
     cta1_text||'En savoir plus →', cta1_url||'entreprises.html',
     cta2_text||null, cta2_url||null, pagesValue, Number(sort_order)||0]
  );
  const id = db.lastInsertRowId();
  res.status(201).json(db.get(`SELECT * FROM carousel_slides WHERE id=?`, [id]));
});

// PUT /api/carousel/:id — admin
router.put('/:id', auth, upload.single('image'), (req, res) => {
  const ex = db.get(`SELECT * FROM carousel_slides WHERE id=?`, [req.params.id]);
  if (!ex) return res.status(404).json({ error: 'Slide introuvable' });
  const { eyebrow, title, subtitle, cta1_text, cta1_url, cta2_text, cta2_url, sort_order, active, pages } = req.body;
  const image_url  = req.file ? `/uploads/${req.file.filename}` : ex.image_url;
  const pagesValue = Array.isArray(pages) ? pages.join(',') : (pages || ex.pages || 'all');

  db.run(
    `UPDATE carousel_slides SET image_url=?,eyebrow=?,title=?,subtitle=?,cta1_text=?,cta1_url=?,cta2_text=?,cta2_url=?,pages=?,sort_order=?,active=? WHERE id=?`,
    [image_url, eyebrow||ex.eyebrow, title||ex.title, subtitle??ex.subtitle,
     cta1_text||ex.cta1_text, cta1_url||ex.cta1_url,
     cta2_text??ex.cta2_text, cta2_url??ex.cta2_url,
     pagesValue, Number(sort_order)||ex.sort_order,
     active!==undefined?Number(active):ex.active,
     req.params.id]
  );
  res.json(db.get(`SELECT * FROM carousel_slides WHERE id=?`, [req.params.id]));
});

// DELETE /api/carousel/:id — admin
router.delete('/:id', auth, (req, res) => {
  const slide = db.get(`SELECT image_url FROM carousel_slides WHERE id=?`, [req.params.id]);
  if (slide?.image_url) {
    const fpath = path.join(UPLOADS_DIR, path.basename(slide.image_url));
    if (fs.existsSync(fpath)) fs.unlinkSync(fpath);
  }
  db.run(`DELETE FROM carousel_slides WHERE id=?`, [req.params.id]);
  res.json({ ok: true });
});

module.exports = router;