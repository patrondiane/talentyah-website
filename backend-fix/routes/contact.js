const express = require('express');
const db      = require('../db');
const auth    = require('../middleware/auth');
const router  = express.Router();

/* POST /api/contact (public) */
router.post('/', (req, res) => {
  const { fullname, email, type, message } = req.body;
  if (!email) return res.status(400).json({ ok: false, error: 'Email requis.' });

  db.prepare('INSERT INTO contacts (fullname, email, type, message) VALUES (?, ?, ?, ?)')
    .run(fullname || null, email.trim(), type || null, message || null);

  res.json({ ok: true, message: 'Message envoye.' });
});

/* GET /api/contact (admin) */
router.get('/', auth, (req, res) => {
  const rows = db.prepare('SELECT * FROM contacts ORDER BY created_at DESC').all();
  res.json({ ok: true, total: rows.length, contacts: rows });
});

/* DELETE /api/contact/:id (admin) */
router.delete('/:id', auth, (req, res) => {
  db.prepare('DELETE FROM contacts WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
