// routes/admin.js
const router  = require('express').Router();
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const db      = require('../db');
const { auth, requireRole } = require('../middleware/auth');

const SECRET = process.env.JWT_SECRET || 'talentyah_secret_2026';

const rateLimiter = require('../middleware/rateLimiter');

const loginLimiter = rateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 100,
  message: 'Trop de tentatives de connexion échouées. Veuillez réessayer dans 15 minutes.'
});

/* ── POST /api/admin/login ── */
router.post('/login', loginLimiter, async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Champs manquants' });

  const user = await db.get('SELECT * FROM admin_users WHERE email = ?', [email]);
  if (!user) return res.status(401).json({ error: 'Email ou mot de passe incorrect' });

  const ok = bcrypt.compareSync(password, user.password);
  if (!ok) return res.status(401).json({ error: 'Email ou mot de passe incorrect' });

  const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, SECRET, { expiresIn: '8h' });
  res.json({ token, role: user.role, email: user.email });
});

/* ── GET /api/admin/users ── superadmin only */
router.get('/users', auth, requireRole('superadmin'), async (req, res) => {
  const users = await db.all(`SELECT id, email, role, created_at FROM admin_users ORDER BY created_at DESC`);
  res.json(users);
});

/* ── POST /api/admin/users ── superadmin only */
router.post('/users', auth, requireRole('superadmin'), async (req, res) => {
  const { email, role, password } = req.body;
  if (!email || !role) return res.status(400).json({ error: 'Email et rôle requis' });
  const pwd  = password || Math.random().toString(36).slice(-8);
  const hash = bcrypt.hashSync(pwd, 10);
  try {
    const result = await db.run(
      `INSERT INTO admin_users (email, password, role) VALUES (?, ?, ?)`,
      [email, hash, role]
    );
    const id = db.lastInsertRowId(result);
    res.status(201).json({ id, email, role, tempPassword: password ? undefined : pwd });
  } catch {
    res.status(409).json({ error: 'Cet email existe déjà' });
  }
});

/* ── DELETE /api/admin/users/:id ── superadmin only */
router.delete('/users/:id', auth, requireRole('superadmin'), async (req, res) => {
  await db.run(`DELETE FROM admin_users WHERE id = ?`, [req.params.id]);
  res.json({ ok: true });
});

/* ── PUT /api/admin/reset-password/:id ── superadmin only */
router.put('/reset-password/:id', auth, requireRole('superadmin'), async (req, res) => {
  const { password } = req.body;
  const user = await db.get(`SELECT * FROM admin_users WHERE id = ?`, [req.params.id]);
  if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });

  const newPwd = password || Math.random().toString(36).slice(-10);
  const hash   = bcrypt.hashSync(newPwd, 10);
  await db.run(`UPDATE admin_users SET password = ? WHERE id = ?`, [hash, req.params.id]);
  res.json({ ok: true, email: user.email, tempPassword: newPwd });
});

/* ── GET /api/admin/stats ── dashboard counts */
router.get('/stats', auth, async (req, res) => {
  const [
    candidates,
    companies,
    jobs,
    users,
    publications,
    partners,
    candidatesWithCV,
    countriesRows,
  ] = await Promise.all([
    db.get(`SELECT COUNT(*) as c FROM candidates`),
    db.get(`SELECT COUNT(*) as c FROM companies`),
    db.get(`SELECT COUNT(*) as c FROM jobs WHERE status='active'`),
    db.get(`SELECT COUNT(*) as c FROM admin_users`),
    db.get(`SELECT COUNT(*) as c FROM publications WHERE status='published'`),
    db.get(`SELECT COUNT(*) as c FROM partners`),
    db.get(`SELECT COUNT(*) as c FROM candidates WHERE cv_url IS NOT NULL`),
    db.all(`SELECT DISTINCT country FROM candidates WHERE country IS NOT NULL`),
  ]);

  res.json({
    candidates:       candidates?.c       || 0,
    companies:        companies?.c        || 0,
    jobs:             jobs?.c             || 0,
    users:            users?.c            || 0,
    publications:     publications?.c     || 0,
    partners:         partners?.c         || 0,
    candidatesWithCV: candidatesWithCV?.c || 0,
    countries:        countriesRows.length,
  });
});


/* ── GET /api/admin/profile ── fetch logged-in user profile */
router.get('/profile', auth, async (req, res) => {
  try {
    const user = await db.get('SELECT id, email, first_name, last_name, role, created_at FROM admin_users WHERE id = ?', [req.user.id]);
    if (!user) return res.status(404).json({ error: 'Utilisateur non trouvé' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: 'Erreur lors de la récupération du profil.' });
  }
});

/* ── PUT /api/admin/profile ── update profile and password */
router.put('/profile', auth, async (req, res) => {
  try {
    const { first_name, last_name, current_password, new_password } = req.body;
    const user = await db.get('SELECT * FROM admin_users WHERE id = ?', [req.user.id]);
    if (!user) return res.status(404).json({ error: 'Utilisateur non trouvé' });

    if (new_password) {
      if (!current_password) {
        return res.status(400).json({ error: 'Le mot de passe actuel est requis pour changer de mot de passe.' });
      }
      const ok = bcrypt.compareSync(current_password, user.password);
      if (!ok) {
        return res.status(401).json({ error: 'Le mot de passe actuel est incorrect.' });
      }
      if (new_password.length < 4) {
        return res.status(400).json({ error: 'Le nouveau mot de passe doit contenir au moins 4 caractères.' });
      }
      const hash = bcrypt.hashSync(new_password, 10);
      await db.run('UPDATE admin_users SET password = ?, first_name = ?, last_name = ? WHERE id = ?', [hash, first_name || null, last_name || null, req.user.id]);
    } else {
      await db.run('UPDATE admin_users SET first_name = ?, last_name = ? WHERE id = ?', [first_name || null, last_name || null, req.user.id]);
    }

    const updated = await db.get('SELECT id, email, first_name, last_name, role, created_at FROM admin_users WHERE id = ?', [req.user.id]);
    res.json({ message: 'Profil mis à jour avec succès', user: updated });
  } catch (err) {
    console.error('[PUT /admin/profile]', err.message);
    res.status(500).json({ error: 'Erreur lors de la mise à jour du profil.' });
  }
});

module.exports = router;