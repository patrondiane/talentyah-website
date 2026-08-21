// routes/jobs.js
const router = require('express').Router();
const db     = require('../db');
const { auth } = require('../middleware/auth');

// GET /api/jobs — public
router.get('/', async (req, res) => {
  const { sector, country, contract_type } = req.query;
  try {
    let query = db.client.from('jobs').select('*').eq('status', 'active');
    if (sector)        query = query.eq('sector', sector);
    if (country)       query = query.eq('country', country);
    if (contract_type) query = query.eq('contract_type', contract_type);
    query = query.order('created_at', { ascending: false });

    const { data: jobs, error } = await query;
    if (error) throw error;
    res.json({ jobs: jobs || [], total: (jobs || []).length });
  } catch (err) {
    console.error('[GET /api/jobs]', err.message);
    res.status(500).json({ error: 'Erreur lors du chargement des offres.' });
  }
});

// GET /api/jobs/all — admin only
router.get('/all', auth, async (req, res) => {
  try {
    const { data: jobs, error } = await db.client
      .from('jobs')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ jobs: jobs || [], total: (jobs || []).length });
  } catch (err) {
    console.error('[GET /api/jobs/all]', err.message);
    res.status(500).json({ error: 'Erreur lors du chargement des offres.' });
  }
});

// GET /api/jobs/:id — public
router.get('/:id', async (req, res) => {
  const idNum = Number(req.params.id);
  if (isNaN(idNum)) return res.status(400).json({ error: 'ID invalide' });
  try {
    const { data: job, error } = await db.client
      .from('jobs')
      .select('*')
      .eq('id', idNum)
      .single();
    if (error || !job) return res.status(404).json({ error: 'Offre introuvable' });
    res.json(job);
  } catch (err) {
    console.error('[GET /api/jobs/:id]', err.message);
    res.status(500).json({ error: 'Erreur lors du chargement de l\'offre.' });
  }
});

// POST /api/jobs — admin only
router.post('/', auth, async (req, res) => {
  const { title, city, country, contract_type, sector, salary, description, requirements, tags, is_new } = req.body;
  if (!title) return res.status(400).json({ error: 'Titre requis' });

  try {
    const { data: job, error } = await db.client
      .from('jobs')
      .insert([{
        title: title.trim(),
        city: city?.trim() || null,
        country: country?.trim() || null,
        contract_type: contract_type || null,
        sector: sector?.trim() || null,
        salary: salary?.trim() || null,
        tags: Array.isArray(tags) ? tags.join(',') : (tags || null),
        description: description || null,
        requirements: requirements || null,
        status: 'active',
        is_new: is_new !== undefined ? (is_new ? 1 : 0) : 1
      }])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(job);
  } catch (err) {
    console.error('[POST /api/jobs]', err.message);
    res.status(500).json({ error: 'Erreur lors de la création de l\'offre.' });
  }
});

// PUT /api/jobs/:id — admin only
router.put('/:id', auth, async (req, res) => {
  const idNum = Number(req.params.id);
  if (isNaN(idNum)) return res.status(400).json({ error: 'ID invalide' });
  const { title, city, country, contract_type, sector, salary, description, requirements, status, tags, is_new } = req.body;

  try {
    const updateData = {};
    if (title !== undefined) updateData.title = title.trim();
    if (city !== undefined) updateData.city = city?.trim() || null;
    if (country !== undefined) updateData.country = country?.trim() || null;
    if (contract_type !== undefined) updateData.contract_type = contract_type || null;
    if (sector !== undefined) updateData.sector = sector?.trim() || null;
    if (salary !== undefined) updateData.salary = salary?.trim() || null;
    if (tags !== undefined) updateData.tags = Array.isArray(tags) ? tags.join(',') : (tags || null);
    if (description !== undefined) updateData.description = description || null;
    if (requirements !== undefined) updateData.requirements = requirements || null;
    if (status !== undefined) updateData.status = status;
    if (is_new !== undefined) updateData.is_new = is_new ? 1 : 0;

    const { data: job, error } = await db.client
      .from('jobs')
      .update(updateData)
      .eq('id', idNum)
      .select()
      .single();

    if (error) throw error;
    res.json(job);
  } catch (err) {
    console.error('[PUT /api/jobs/:id]', err.message);
    res.status(500).json({ error: 'Erreur lors de la mise à jour de l\'offre.' });
  }
});

// DELETE /api/jobs/:id — admin only
router.delete('/:id', auth, async (req, res) => {
  const idNum = Number(req.params.id);
  if (isNaN(idNum)) return res.status(400).json({ error: 'ID invalide' });
  try {
    const { error } = await db.client
      .from('jobs')
      .delete()
      .eq('id', idNum);
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) {
    console.error('[DELETE /api/jobs/:id]', err.message);
    res.status(500).json({ error: 'Erreur lors de la suppression de l\'offre.' });
  }
});

module.exports = router;