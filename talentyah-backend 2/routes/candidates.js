// routes/candidates.js
const router = require('express').Router();
const multer = require('multer');
const db     = require('../db');
const { auth } = require('../middleware/auth');
const { notifyNewCandidate } = require('../mailer');
const { uploadCV, deleteCV } = require('../supabase-storage');

// Multer en mémoire (pas de disque — on envoie direct à Cloudinary)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.pdf', '.doc', '.docx'];
    const ext = require('path').extname(file.originalname).toLowerCase();
    cb(null, allowed.includes(ext));
  },
});

// POST /api/candidates — public
router.post('/', upload.single('cv'), async (req, res) => {
  try {
    const { first_name, last_name, email, phone, role_target, sector, country, experience_level, message, job_id } = req.body;
    if (!first_name || !last_name || !email) return res.status(400).json({ error: 'Prénom, nom et email requis' });

    let cv_url      = null;
    let cv_filename = null;

    if (req.file) {
      cv_filename = req.file.originalname;
      try {
        cv_url = await uploadCV(req.file.buffer, cv_filename, req.file.mimetype);
        console.log('[CV] Upload réussi:', cv_url);
      } catch (uploadErr) {
        console.error('[CV] Upload échoué:', uploadErr.message);
        // On continue sans CV
      }
    }

    const result = await db.run(
      `INSERT INTO candidates (first_name, last_name, email, phone, role_target, sector, country, experience_level, message, cv_url, cv_filename, job_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [first_name, last_name, email, phone||null, role_target||null, sector||null, country||null, experience_level||null, message||null, cv_url, cv_filename, job_id||null]
    );
    const id = db.lastInsertRowId(result);

    notifyNewCandidate({ first_name, last_name, email, phone, role_target, sector, country, experience_level, message, cv_url }).catch(() => {});

    res.status(201).json({ id, message: 'Candidature enregistrée avec succès' });
  } catch (err) {
    console.error('[POST /candidates]', err.message);
    res.status(500).json({ error: 'Erreur lors de l\'enregistrement de la candidature.' });
  }
});

// GET /api/candidates — admin only
router.get('/', auth, async (req, res) => {
  const { sector, country, search } = req.query;
  let sql = `SELECT * FROM candidates WHERE 1=1`;
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
  const c = await db.get(`SELECT cv_url FROM candidates WHERE id = ?`, [req.params.id]);
  await deleteCV(c?.cv_url);   // supprime le CV de Supabase
  await db.run(`DELETE FROM candidates WHERE id = ?`, [req.params.id]);
  res.json({ ok: true });
});

module.exports = router;