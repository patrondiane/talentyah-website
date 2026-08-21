// routes/candidates.js
const router = require('express').Router();
const multer = require('multer');
const db     = require('../db');
const { auth } = require('../middleware/auth');
const { notifyNewCandidate } = require('../mailer');
const { uploadCV, deleteCV } = require('../supabase-storage');
const { uploadToR2 } = require('../cloudflare-r2');

// Multer en mémoire (pas de disque — on envoie direct vers R2 ou Supabase)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.pdf', '.doc', '.docx'];
    const ext = require('path').extname(file.originalname).toLowerCase();
    cb(null, allowed.includes(ext));
  },
});

const rateLimiter = require('../middleware/rateLimiter');

const candidateLimiter = rateLimiter({
  windowMs: 60 * 60 * 1000, // 1 heure
  maxRequests: 10,
  message: 'Trop de candidatures envoyées depuis cette IP. Veuillez réessayer dans une heure.'
});

// POST /api/candidates — public
router.post('/', candidateLimiter, upload.single('cv'), async (req, res) => {
  try {
    const { first_name, last_name, email, phone, role_target, sector, country, experience_level, message, job_id, source } = req.body;
    if (!first_name || !last_name || !email) return res.status(400).json({ error: 'Prénom, nom et email requis' });
    if (!req.file) return res.status(400).json({ error: 'Le CV (format PDF ou Word) est obligatoire.' });

    let cv_url      = null;
    let cv_filename = null;

    if (req.file) {
      cv_filename = req.file.originalname;
      try {
        if (process.env.R2_ACCESS_KEY_ID) {
          const uniqueKey = `cvs/cv_${Date.now()}_${cv_filename.replace(/\s+/g, '_')}`;
          cv_url = await uploadToR2(req.file.buffer, uniqueKey, req.file.mimetype);
        } else {
          cv_url = await uploadCV(req.file.buffer, cv_filename, req.file.mimetype);
        }
      } catch (uploadErr) {
        console.error('[CV] Upload échoué:', uploadErr.message);
      }
    }

    const { data: candidate, error } = await db.client
      .from('candidates')
      .insert([{
        first_name: first_name.trim(),
        last_name: last_name.trim(),
        email: email.trim(),
        phone: phone?.trim() || null,
        role_target: role_target?.trim() || null,
        sector: sector?.trim() || null,
        country: country?.trim() || null,
        experience_level: experience_level || null,
        message: message || null,
        cv_url: cv_url || null,
        cv_filename: cv_filename || null,
        job_id: job_id ? Number(job_id) : null,
        source: source || null
      }])
      .select()
      .single();

    if (error) throw error;

    notifyNewCandidate({ first_name, last_name, email, phone, role_target, sector, country, experience_level, message, cv_url, source }).catch(() => {});

    res.status(201).json({ id: candidate?.id, message: 'Candidature enregistrée avec succès' });
  } catch (err) {
    console.error('[POST /candidates]', err.message);
    res.status(500).json({ error: 'Erreur lors de l\'enregistrement de la candidature.' });
  }
});

// GET /api/candidates — admin only
router.get('/', auth, async (req, res) => {
  const { sector, country, search } = req.query;
  try {
    let query = db.client.from('candidates').select('*');
    if (sector)  query = query.eq('sector', sector);
    if (country) query = query.eq('country', country);
    if (search) {
      const q = `%${search}%`;
      query = query.or(`first_name.ilike.${q},last_name.ilike.${q},email.ilike.${q},role_target.ilike.${q}`);
    }
    query = query.order('created_at', { ascending: false });

    const { data: candidates, error } = await query;
    if (error) throw error;
    res.json({ candidates: candidates || [], total: (candidates || []).length });
  } catch (err) {
    console.error('[GET /api/candidates]', err.message);
    res.status(500).json({ error: 'Erreur lors du chargement des candidats.' });
  }
});

// GET /api/candidates/:id — admin only
router.get('/:id', auth, async (req, res) => {
  const idNum = Number(req.params.id);
  if (isNaN(idNum)) return res.status(400).json({ error: 'ID invalide' });
  try {
    const { data: c, error } = await db.client
      .from('candidates')
      .select('*')
      .eq('id', idNum)
      .single();
    if (error || !c) return res.status(404).json({ error: 'Candidat introuvable' });
    res.json(c);
  } catch (err) {
    console.error('[GET /api/candidates/:id]', err.message);
    res.status(500).json({ error: 'Erreur lors du chargement du candidat.' });
  }
});

// DELETE /api/candidates/:id — admin only
router.delete('/:id', auth, async (req, res) => {
  const idNum = Number(req.params.id);
  if (isNaN(idNum)) return res.status(400).json({ error: 'ID invalide' });
  try {
    const { data: c } = await db.client.from('candidates').select('cv_url').eq('id', idNum).single();
    await deleteCV(c?.cv_url);
    const { error } = await db.client.from('candidates').delete().eq('id', idNum);
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) {
    console.error('[DELETE /api/candidates/:id]', err.message);
    res.status(500).json({ error: 'Erreur lors de la suppression.' });
  }
});

module.exports = router;