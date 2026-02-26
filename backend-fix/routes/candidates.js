const express = require('express');
const db      = require('../db');
const auth    = require('../middleware/auth');
const router  = express.Router();

/* POST /api/candidates
   Champs texte via multer (multipart/form-data)
   Fichier CV via req.file (champ name="cv")
*/
router.post('/', (req, res) => {
  console.log('[POST /api/candidates] body:', req.body, '| file:', req.file?.filename);

  const {
    first_name, last_name, email,
    country, role_target, experience_level,
    message, job_id, job_title
  } = req.body;

  if (!first_name || !last_name || !email)
    return res.status(400).json({ ok: false, error: 'Prenom, nom et email sont requis.' });

  const cv_url = req.file ? '/uploads/' + req.file.filename : null;

  /* Migration douce : ajouter les colonnes si elles n'existent pas encore */
  try {
    db.exec('ALTER TABLE candidates ADD COLUMN job_id    INTEGER');
    db.exec('ALTER TABLE candidates ADD COLUMN job_title TEXT');
  } catch(e) { /* colonnes deja presentes, ok */ }

  db.prepare(`
    INSERT INTO candidates
      (first_name, last_name, email, country, role_target, experience_level, cv_url, message, job_id, job_title)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    first_name.trim(), last_name.trim(), email.trim().toLowerCase(),
    country    || null,
    role_target|| null,
    experience_level || null,
    cv_url,
    message    || null,
    job_id     ? parseInt(job_id) : null,
    job_title  || null
  );

  console.log('[POST /api/candidates] Enregistree :', email, '| Poste :', job_title || '—');
  res.json({ ok: true, message: 'Candidature enregistree.' });
});

/* GET /api/candidates (admin)
   ?country=Senegal  → filtre par pays
   ?sector=Finance   → filtre par role_target ou job_title
*/
router.get('/', auth, (req, res) => {
  const { country, sector } = req.query;
  let sql = 'SELECT * FROM candidates WHERE 1=1';
  const p = [];

  if (country) {
    sql += ' AND country LIKE ?';
    p.push('%' + country + '%');
  }
  if (sector) {
    sql += ' AND (role_target LIKE ? OR job_title LIKE ?)';
    p.push('%' + sector + '%', '%' + sector + '%');
  }

  sql += ' ORDER BY created_at DESC';
  const rows = db.prepare(sql).all(...p);
  res.json({ ok: true, total: rows.length, candidates: rows });
});

/* DELETE /api/candidates/:id (admin) */
router.delete('/:id', auth, (req, res) => {
  db.prepare('DELETE FROM candidates WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;