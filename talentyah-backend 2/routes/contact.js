// routes/contact.js
const router = require('express').Router();
const db     = require('../db');
const { auth } = require('../middleware/auth');
const { notifyNewContactMessage } = require('../mailer');

const rateLimiter = require('../middleware/rateLimiter');

const contactLimiter = rateLimiter({
  windowMs: 60 * 60 * 1000, // 1 heure
  maxRequests: 10,
  message: 'Trop de messages envoyés depuis cette IP. Veuillez réessayer dans une heure.'
});

// POST /api/contact — public
router.post('/', contactLimiter, async (req, res) => {
  const { fullname, name, email, subject, type, message } = req.body;
  if (!email) return res.status(400).json({ error: 'Email requis' });
  const now = new Date().toISOString();
  await db.run(
    `INSERT INTO contacts (fullname, email, subject, type, message, created_at) VALUES (?,?,?,?,?,?)`,
    [fullname || name || null, email, subject || type || null, type || subject || null, message || null, now]
  );
  
  // Notification email asynchrone (n'attend pas le SMTP pour répondre au visiteur)
  notifyNewContactMessage({ fullname: fullname || name, email, subject, type, message }).catch(err => {
    console.error('[CONTACT MAIL ERROR]', err.message);
  });

  res.json({ ok: true, message: 'Message reçu' });
});

// GET /api/contact — admin
router.get('/', auth, async (req, res) => {
  const contacts = await db.all(`SELECT * FROM contacts ORDER BY created_at DESC`);
  res.json({ contacts, total: contacts.length });
});

module.exports = router;