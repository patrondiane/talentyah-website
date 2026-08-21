// routes/publications.js
const router = require('express').Router();
const multer = require('multer');
const db     = require('../db');
const { auth } = require('../middleware/auth');
const { uploadBuffer, deleteByUrl } = require('../cloudinary');
const { uploadToR2 } = require('../cloudflare-r2');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// GET /api/publications — public
router.get('/', async (req, res) => {
  const { status, category } = req.query;
  try {
    let query = db.client.from('publications').select('*');
    if (status) query = query.eq('status', status);
    else query = query.eq('status', 'published');
    if (category) query = query.eq('category', category);
    query = query.order('created_at', { ascending: false });

    const { data: publications, error } = await query;
    if (error) throw error;
    res.json({ publications: publications || [], total: (publications || []).length });
  } catch (err) {
    console.error('[GET /api/publications]', err.message);
    res.status(500).json({ error: 'Erreur lors du chargement des articles.' });
  }
});

// GET /api/publications/all — admin
router.get('/all', auth, async (req, res) => {
  try {
    const { data: publications, error } = await db.client
      .from('publications')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ publications: publications || [], total: (publications || []).length });
  } catch (err) {
    console.error('[GET /api/publications/all]', err.message);
    res.status(500).json({ error: 'Erreur lors du chargement des articles.' });
  }
});

// GET /api/publications/:id — public
router.get('/:id', async (req, res) => {
  const idNum = Number(req.params.id);
  if (isNaN(idNum)) return res.status(400).json({ error: 'ID invalide' });
  try {
    const { data: pub, error } = await db.client
      .from('publications')
      .select('*')
      .eq('id', idNum)
      .single();
    if (error || !pub) return res.status(404).json({ error: 'Article introuvable' });
    res.json(pub);
  } catch (err) {
    console.error('[GET /api/publications/:id]', err.message);
    res.status(500).json({ error: 'Erreur lors du chargement de l\'article.' });
  }
});

// POST /api/publications — admin
router.post('/', auth, upload.single('image'), async (req, res) => {
  const { title, category, status, excerpt, content } = req.body;
  if (!title) return res.status(400).json({ error: 'Titre requis' });

  let image_url = null;
  if (req.file) {
    try {
      if (process.env.R2_ACCESS_KEY_ID) {
        const uniqueKey = `blog/img_${Date.now()}_${req.file.originalname.replace(/\s+/g, '_')}`;
        image_url = await uploadToR2(req.file.buffer, uniqueKey, req.file.mimetype);
      } else {
        image_url = await uploadBuffer(req.file.buffer, 'talentyah/publications', { resource_type: 'image' });
      }
    } catch (uploadErr) {
      console.error('[PUBLICATIONS] Erreur upload image:', uploadErr.message);
    }
  }
  const published_at = status === 'published' ? new Date().toISOString().slice(0,10) : null;

  try {
    const { data: pub, error } = await db.client
      .from('publications')
      .insert([{
        title: title.trim(),
        category: category || 'Conseil carrière',
        status: status || 'draft',
        excerpt: excerpt || null,
        content: content || null,
        image_url: image_url || null,
        published_at
      }])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(pub);
  } catch (err) {
    console.error('[POST /api/publications]', err.message);
    res.status(500).json({ error: 'Erreur lors de la création de la publication.' });
  }
});

// PUT /api/publications/:id — admin
router.put('/:id', auth, upload.single('image'), async (req, res) => {
  const idNum = Number(req.params.id);
  if (isNaN(idNum)) return res.status(400).json({ error: 'ID invalide' });
  const { title, category, status, excerpt, content } = req.body;

  try {
    const { data: existing, error: exErr } = await db.client
      .from('publications')
      .select('*')
      .eq('id', idNum)
      .single();
    if (exErr || !existing) return res.status(404).json({ error: 'Article introuvable' });

    let image_url = existing.image_url;
    if (req.file) {
      await deleteByUrl(existing.image_url);
      image_url = await uploadBuffer(req.file.buffer, 'talentyah/publications', { resource_type: 'image' });
    }
    const published_at = status === 'published' ? (existing.published_at || new Date().toISOString().slice(0,10)) : null;

    const { data: pub, error } = await db.client
      .from('publications')
      .update({
        title: title?.trim() || existing.title,
        category: category || existing.category,
        status: status || existing.status,
        excerpt: excerpt !== undefined ? excerpt : existing.excerpt,
        content: content !== undefined ? content : existing.content,
        image_url,
        published_at,
        updated_at: new Date().toISOString()
      })
      .eq('id', idNum)
      .select()
      .single();

    if (error) throw error;
    res.json(pub);
  } catch (err) {
    console.error('[PUT /api/publications/:id]', err.message);
    res.status(500).json({ error: 'Erreur lors de la mise à jour de la publication.' });
  }
});

// PATCH /api/publications/:id/status
router.patch('/:id/status', auth, async (req, res) => {
  const idNum = Number(req.params.id);
  if (isNaN(idNum)) return res.status(400).json({ error: 'ID invalide' });
  try {
    const { data: pub, error: getErr } = await db.client
      .from('publications')
      .select('*')
      .eq('id', idNum)
      .single();
    if (getErr || !pub) return res.status(404).json({ error: 'Article introuvable' });
    const newStatus    = pub.status === 'published' ? 'draft' : 'published';
    const published_at = newStatus === 'published' ? (pub.published_at || new Date().toISOString().slice(0,10)) : null;

    const { error: updErr } = await db.client
      .from('publications')
      .update({
        status: newStatus,
        published_at,
        updated_at: new Date().toISOString()
      })
      .eq('id', idNum);

    if (updErr) throw updErr;
    res.json({ id: pub.id, status: newStatus });
  } catch (err) {
    console.error('[PATCH /api/publications/:id/status]', err.message);
    res.status(500).json({ error: 'Erreur lors du changement de statut.' });
  }
});

// DELETE /api/publications/:id
router.delete('/:id', auth, async (req, res) => {
  const idNum = Number(req.params.id);
  if (isNaN(idNum)) return res.status(400).json({ error: 'ID invalide' });
  try {
    const { data: pub } = await db.client.from('publications').select('image_url').eq('id', idNum).single();
    await deleteByUrl(pub?.image_url);
    const { error } = await db.client.from('publications').delete().eq('id', idNum);
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) {
    console.error('[DELETE /api/publications/:id]', err.message);
    res.status(500).json({ error: 'Erreur lors de la suppression.' });
  }
});

module.exports = router;