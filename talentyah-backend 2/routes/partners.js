// routes/partners.js
const router  = require('express').Router();
const multer  = require('multer');
const db      = require('../db');
const { auth } = require('../middleware/auth');
const { uploadBuffer, deleteByUrl } = require('../cloudinary');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024 } });

// GET /api/partners — public
router.get('/', async (req, res) => {
  try {
    const { data: partners, error } = await db.client
      .from('partners')
      .select('*')
      .not('image_url', 'is', null)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });
    if (error) throw error;
    res.json({ partners: partners || [], total: (partners || []).length });
  } catch (err) {
    console.error('[GET /api/partners]', err.message);
    res.status(500).json({ error: 'Erreur lors du chargement des partenaires.' });
  }
});

// GET /api/partners/all — admin
router.get('/all', auth, async (req, res) => {
  try {
    const { data: partners, error } = await db.client
      .from('partners')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });
    if (error) throw error;
    res.json({ partners: partners || [], total: (partners || []).length });
  } catch (err) {
    console.error('[GET /api/partners/all]', err.message);
    res.status(500).json({ error: 'Erreur lors du chargement des partenaires.' });
  }
});

// POST /api/partners — admin
router.post('/', auth, upload.single('image'), async (req, res) => {
  try {
    const { name, description, sort_order } = req.body;
    if (!name) return res.status(400).json({ error: 'Nom requis' });
    const image_url = req.file ? await uploadBuffer(req.file.buffer, 'talentyah/partners', { resource_type: 'image' }) : null;

    const { data: partner, error } = await db.client
      .from('partners')
      .insert([{
        name: name.trim(),
        description: description || null,
        image_url: image_url || null,
        sort_order: sort_order !== undefined ? Number(sort_order) : 0
      }])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(partner);
  } catch (err) {
    console.error('[POST /api/partners]', err.message);
    res.status(500).json({ error: 'Erreur lors de la création du partenaire.' });
  }
});

// PUT /api/partners/:id — admin
router.put('/:id', auth, upload.single('image'), async (req, res) => {
  const idNum = Number(req.params.id);
  if (isNaN(idNum)) return res.status(400).json({ error: 'ID invalide' });
  const { name, description, sort_order, existing_image_url } = req.body;

  try {
    const { data: existing, error: exErr } = await db.client
      .from('partners')
      .select('*')
      .eq('id', idNum)
      .single();
    if (exErr || !existing) return res.status(404).json({ error: 'Partenaire introuvable' });

    let image_url = existing_image_url || existing.image_url;
    if (req.file) {
      await deleteByUrl(existing.image_url);
      image_url = await uploadBuffer(req.file.buffer, 'talentyah/partners', { resource_type: 'image' });
    }

    const { data: partner, error } = await db.client
      .from('partners')
      .update({
        name: name?.trim() || existing.name,
        description: description !== undefined ? description : existing.description,
        image_url,
        sort_order: sort_order !== undefined ? Number(sort_order) : existing.sort_order
      })
      .eq('id', idNum)
      .select()
      .single();

    if (error) throw error;
    res.json(partner);
  } catch (err) {
    console.error('[PUT /api/partners/:id]', err.message);
    res.status(500).json({ error: 'Erreur lors de la mise à jour du partenaire.' });
  }
});

// POST /api/partners/bulk — admin
router.post('/bulk', auth, async (req, res) => {
  try {
    const { partners } = req.body;
    if (!Array.isArray(partners)) return res.status(400).json({ error: 'partners[] requis' });
    await db.client.from('partners').delete().neq('id', 0);

    const rows = partners.map((p, i) => ({
      name: p.name || 'Partenaire',
      description: p.description || null,
      image_url: p.image_url || null,
      sort_order: i
    }));

    const { data, error } = await db.client.from('partners').insert(rows).select();
    if (error) throw error;
    res.json({ ok: true, count: data.length });
  } catch (err) {
    console.error('[POST /api/partners/bulk]', err.message);
    res.status(500).json({ error: 'Erreur lors de l\'enregistrement groupé.' });
  }
});

// DELETE /api/partners/:id — admin
router.delete('/:id', auth, async (req, res) => {
  const idNum = Number(req.params.id);
  if (isNaN(idNum)) return res.status(400).json({ error: 'ID invalide' });
  try {
    const { data: p } = await db.client.from('partners').select('image_url').eq('id', idNum).single();
    await deleteByUrl(p?.image_url);
    const { error } = await db.client.from('partners').delete().eq('id', idNum);
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) {
    console.error('[DELETE /api/partners/:id]', err.message);
    res.status(500).json({ error: 'Erreur lors de la suppression.' });
  }
});

module.exports = router;