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

  try {
    const { error } = await db.client
      .from('contacts')
      .insert([{
        fullname: fullname || name || null,
        email,
        subject: subject || type || null,
        type: type || subject || null,
        message: message || null
      }]);

    if (error) throw error;
    
    // Notification email asynchrone (n'attend pas le SMTP pour répondre au visiteur)
    notifyNewContactMessage({ fullname: fullname || name, email, subject, type, message }).catch(err => {
      console.error('[CONTACT MAIL ERROR]', err.message);
    });

    res.json({ ok: true, message: 'Message reçu' });
  } catch (err) {
    console.error('[POST /api/contact]', err.message);
    res.status(500).json({ error: 'Erreur lors de l\'envoi du message.' });
  }
});

// GET /api/contact — admin
router.get('/', auth, async (req, res) => {
  try {
    const { data: contacts, error } = await db.client
      .from('contacts')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ contacts: contacts || [], total: (contacts || []).length });
  } catch (err) {
    console.error('[GET /api/contact]', err.message);
    res.status(500).json({ error: 'Erreur lors de la récupération des messages.' });
  }
});

module.exports = router;