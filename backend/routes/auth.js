const express = require('express');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const db      = require('../db');
const router  = express.Router();

router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Champs requis.' });
  const admin = db.prepare('SELECT * FROM admins WHERE email = ?').get(email);
  if (!admin || !bcrypt.compareSync(password, admin.password))
    return res.status(401).json({ error: 'Identifiants incorrects.' });
  const token = jwt.sign({ id: admin.id, email: admin.email }, process.env.JWT_SECRET || 'dev_secret', { expiresIn: '8h' });
  res.json({ ok: true, token });
});

module.exports = router;
