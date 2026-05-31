// routes/companies.js
const router = require('express').Router();
const db     = require('../db');
const { auth } = require('../middleware/auth');
const { notifyNewCompany } = require('../mailer');

// POST /api/companies — public (formulaire entreprise)
router.post('/', (req, res) => {
  const { company_name, email, phone, region, role_needed, urgency, message } = req.body;
  if (!company_name || !email) return res.status(400).json({ error: 'Nom de société et email requis' });

  db.run(
    `INSERT INTO companies (company_name, email, phone, region, role_needed, urgency, message)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [company_name, email, phone||null, region||null, role_needed||null, urgency||'moyenne', message||null]
  );
  const id = db.lastInsertRowId();

  // Notification email
  notifyNewCompany({ company_name, email, phone, region, role_needed, urgency, message }).catch(() => {});

  res.status(201).json({ id, message: 'Demande enregistrée avec succès' });
});

// GET /api/companies — admin only
router.get('/', auth, (req, res) => {
  const companies = db.all(`SELECT * FROM companies ORDER BY created_at DESC`);
  res.json({ companies, total: companies.length });
});

// DELETE /api/companies/:id — admin only
router.delete('/:id', auth, (req, res) => {
  db.run(`DELETE FROM companies WHERE id = ?`, [req.params.id]);
  res.json({ ok: true });
});

module.exports = router;