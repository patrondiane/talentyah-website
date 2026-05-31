// routes/admin.js
const router  = require('express').Router();
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const db      = require('../db');
const { auth, requireRole } = require('../middleware/auth');

const SECRET = process.env.JWT_SECRET || 'talentyah_secret_2026';

/* ── POST /api/admin/login ── */
router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Champs manquants' });

  const user = db.get('SELECT * FROM admin_users WHERE email = ?', [email]);
  if (!user) return res.status(401).json({ error: 'Email ou mot de passe incorrect' });

  const ok = bcrypt.compareSync(password, user.password);
  if (!ok) return res.status(401).json({ error: 'Email ou mot de passe incorrect' });

  const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, SECRET, { expiresIn: '8h' });
  res.json({ token, role: user.role, email: user.email });
});

/* ── GET /api/admin/users ── superadmin only */
router.get('/users', auth, requireRole('superadmin'), (req, res) => {
  const users = db.all(`SELECT id, email, role, created_at FROM admin_users ORDER BY created_at DESC`);
  res.json(users);
});

/* ── POST /api/admin/users ── superadmin only */
router.post('/users', auth, requireRole('superadmin'), (req, res) => {
  const { email, role, password } = req.body;
  if (!email || !role) return res.status(400).json({ error: 'Email et rôle requis' });
  const pwd = password || Math.random().toString(36).slice(-8);
  const hash = bcrypt.hashSync(pwd, 10);
  try {
    db.run(`INSERT INTO admin_users (email, password, role) VALUES (?, ?, ?)`, [email, hash, role]);
    const id = db.lastInsertRowId();
    res.status(201).json({ id, email, role, tempPassword: password ? undefined : pwd });
  } catch {
    res.status(409).json({ error: 'Cet email existe déjà' });
  }
});

/* ── DELETE /api/admin/users/:id ── superadmin only */
router.delete('/users/:id', auth, requireRole('superadmin'), (req, res) => {
  db.run(`DELETE FROM admin_users WHERE id = ?`, [req.params.id]);
  res.json({ ok: true });
});

/* ── PUT /api/admin/reset-password/:id ── superadmin only */
router.put('/reset-password/:id', auth, requireRole('superadmin'), (req, res) => {
  const { password } = req.body;
  const user = db.get(`SELECT * FROM admin_users WHERE id = ?`, [req.params.id]);
  if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });

  const newPwd = password || Math.random().toString(36).slice(-10);
  const hash   = bcrypt.hashSync(newPwd, 10);
  db.run(`UPDATE admin_users SET password = ? WHERE id = ?`, [hash, req.params.id]);
  res.json({ ok: true, email: user.email, tempPassword: newPwd });
});

/* ── GET /api/admin/stats ── dashboard counts */
router.get('/stats', auth, (req, res) => {
  const candidates   = db.get(`SELECT COUNT(*) as c FROM candidates`)?.c || 0;
  const companies    = db.get(`SELECT COUNT(*) as c FROM companies`)?.c || 0;
  const jobs         = db.get(`SELECT COUNT(*) as c FROM jobs WHERE status='active'`)?.c || 0;
  const users        = db.get(`SELECT COUNT(*) as c FROM admin_users`)?.c || 0;
  const publications = db.get(`SELECT COUNT(*) as c FROM publications WHERE status='published'`)?.c || 0;
  const partners     = db.get(`SELECT COUNT(*) as c FROM partners`)?.c || 0;
  const candidatesWithCV = db.get(`SELECT COUNT(*) as c FROM candidates WHERE cv_url IS NOT NULL`)?.c || 0;
  const countries    = db.all(`SELECT DISTINCT country FROM candidates WHERE country IS NOT NULL`).length;
  res.json({ candidates, companies, jobs, users, publications, partners, candidatesWithCV, countries });
});

module.exports = router;