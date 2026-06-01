// routes/contact.js
const router = require('express').Router();
const db     = require('../db');
const { auth } = require('../middleware/auth');

// POST /api/contact — public
router.post('/', async (req, res) => {
  const { fullname, name, email, subject, type, message } = req.body;
  if (!email) return res.status(400).json({ error: 'Email requis' });
  const now = new Date().toISOString();
  await db.run(
    `INSERT INTO contacts (fullname, email, subject, type, message, created_at) VALUES (?,?,?,?,?,?)`,
    [fullname || name || null, email, subject || type || null, type || subject || null, message || null, now]
  );
  res.json({ ok: true, message: 'Message reçu' });
});

// GET /api/contact — admin
router.get('/', auth, async (req, res) => {
  const contacts = await db.all(`SELECT * FROM contacts ORDER BY created_at DESC`);
  res.json({ contacts, total: contacts.length });
});

module.exports = router;