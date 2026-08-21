// routes/companies.js
const router = require('express').Router();
const db     = require('../db');
const { auth } = require('../middleware/auth');
const { notifyNewCompany } = require('../mailer');

const rateLimiter = require('../middleware/rateLimiter');

const companyLimiter = rateLimiter({
  windowMs: 60 * 60 * 1000, // 1 heure
  maxRequests: 10,
  message: 'Trop de demandes envoyées depuis cette IP. Veuillez réessayer dans une heure.'
});

// POST /api/companies — public
router.post('/', companyLimiter, async (req, res) => {
  const { company_name, email, phone, region, role_needed, urgency, message } = req.body;
  if (!company_name || !email) return res.status(400).json({ error: 'Nom de société et email requis' });

  try {
    const { data: company, error } = await db.client
      .from('companies')
      .insert([{
        company_name: company_name.trim(),
        email: email.trim(),
        phone: phone?.trim() || null,
        region: region?.trim() || null,
        role_needed: role_needed?.trim() || null,
        urgency: urgency || 'moyenne',
        message: message || null
      }])
      .select()
      .single();

    if (error) throw error;

    notifyNewCompany({ company_name, email, phone, region, role_needed, urgency, message }).catch(() => {});

    res.status(201).json({ id: company?.id, message: 'Demande enregistrée avec succès' });
  } catch (err) {
    console.error('[POST /api/companies]', err.message);
    res.status(500).json({ error: 'Erreur lors de l\'enregistrement de la demande.' });
  }
});

// GET /api/companies — admin only
router.get('/', auth, async (req, res) => {
  try {
    const { data: companies, error } = await db.client
      .from('companies')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ companies: companies || [], total: (companies || []).length });
  } catch (err) {
    console.error('[GET /api/companies]', err.message);
    res.status(500).json({ error: 'Erreur lors de la récupération des entreprises.' });
  }
});

// DELETE /api/companies/:id — admin only
router.delete('/:id', auth, async (req, res) => {
  const idNum = Number(req.params.id);
  if (isNaN(idNum)) return res.status(400).json({ error: 'ID invalide' });
  try {
    const { error } = await db.client.from('companies').delete().eq('id', idNum);
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) {
    console.error('[DELETE /api/companies/:id]', err.message);
    res.status(500).json({ error: 'Erreur lors de la suppression.' });
  }
});

module.exports = router;