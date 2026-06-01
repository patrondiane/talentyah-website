// routes/candidates.js
const router = require('express').Router();
const multer = require('multer');
const path   = require('path');
const db     = require('../db');
const { auth } = require('../middleware/auth');
const { notifyNewCandidate } = require('../mailer');

const UPLOADS_DIR = path.join(__dirname, '../uploads');
if (!require('fs').existsSync(UPLOADS_DIR)) require('fs').mkdirSync(UPLOADS_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename:    (req, file, cb) => {
    const ext  = path.extname(file.originalname);
    const safe = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9-]/g, '_');
    cb(null, `cv_${Date.now()}_${safe}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.pdf', '.doc', '.docx'];
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, allowed.includes(ext));
  },
});

// POST /api/candidates — public
router.post('/', upload.single('cv'), async (req, res) => {
  const { first_name, last_name, email, phone, role_target, sector, country, experience_level, message, job_id } = req.body;
  if (!first_name || !last_name || !email) return res.status(400).json({ error: 'Prénom, nom et email requis' });

  const cv_filename = req.file ? req.file.filename : null;
  const cv_url      = cv_filename ? `/uploads/${cv_filename}` : null;

  const result = await db.run(
    `INSERT INTO candidates (first_name, last_name, email, phone, role_target, sector, country, experience_level, message, cv_url, cv_filename, job_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [first_name, last_name, email, phone||null, role_target||null, sector||null, country||null, experience_level||null, message||null, cv_url, cv_filename, job_id||null]
  );
  const id = db.lastInsertRowId(result);

  notifyNewCandidate({ first_name, last_name, email, phone, role_target, sector, country, experience_level, message, cv_url }).catch(() => {});

  res.status(201).json({ id, message: 'Candidature enregistrée avec succès' });
});

// GET /api/candidates — admin only
router.get('/', auth, async (req, res) => {
  const { sector, country, search } = req.query;
  let sql    = `SELECT * FROM candidates WHERE 1=1`;
  const params = [];

  if (sector)  { sql += ` AND sector = ?`;  params.push(sector); }
  if (country) { sql += ` AND country = ?`; params.push(country); }
  if (search)  {
    sql += ` AND (first_name LIKE ? OR last_name LIKE ? OR email LIKE ? OR role_target LIKE ?)`;
    const q = `%${search}%`;
    params.push(q, q, q, q);
  }

  sql += ` ORDER BY created_at DESC`;
  const candidates = await db.all(sql, params);
  res.json({ candidates, total: candidates.length });
});

// GET /api/candidates/:id — admin only
router.get('/:id', auth, async (req, res) => {
  const c = await db.get(`SELECT * FROM candidates WHERE id = ?`, [req.params.id]);
  if (!c) return res.status(404).json({ error: 'Candidat introuvable' });
  res.json(c);
});

// DELETE /api/candidates/:id — admin only
router.delete('/:id', auth, async (req, res) => {
  const c = await db.get(`SELECT cv_filename FROM candidates WHERE id = ?`, [req.params.id]);
  if (c?.cv_filename) {
    const fs    = require('fs');
    const fpath = path.join(__dirname, '../uploads', c.cv_filename);
    if (fs.existsSync(fpath)) fs.unlinkSync(fpath);
  }
  await db.run(`DELETE FROM candidates WHERE id = ?`, [req.params.id]);
  res.json({ ok: true });
});

module.exports = router;