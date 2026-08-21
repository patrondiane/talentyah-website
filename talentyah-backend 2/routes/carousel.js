// routes/carousel.js
const router = require('express').Router();
const multer = require('multer');
const db     = require('../db');
const { auth } = require('../middleware/auth');
const { uploadBuffer, deleteByUrl } = require('../cloudinary');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// GET /api/carousel?page=talents — public
router.get('/', async (req, res) => {
  res.set('Cache-Control', 'no-store');
  const page = req.query.page || 'all';
  try {
    const { data: slides, error } = await db.client
      .from('carousel_slides')
      .select('*')
      .eq('active', 1)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) throw error;
    const filtered = (slides || []).filter(s => {
      if (!s.pages || s.pages === 'all') return true;
      const list = s.pages.split(',').map(p => p.trim());
      return list.includes('all') || list.includes(page);
    });
    res.json({ slides: filtered, total: filtered.length });
  } catch (err) {
    console.error('[GET /api/carousel]', err.message);
    res.status(500).json({ error: 'Erreur lors du chargement du carrousel.' });
  }
});

// GET /api/carousel/all — admin
router.get('/all', auth, async (req, res) => {
  try {
    const { data: slides, error } = await db.client
      .from('carousel_slides')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) throw error;
    res.json({ slides: slides || [], total: (slides || []).length });
  } catch (err) {
    console.error('[GET /api/carousel/all]', err.message);
    res.status(500).json({ error: 'Erreur lors du chargement des slides.' });
  }
});

// POST /api/carousel — admin
router.post('/', auth, upload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Image requise' });
  const { eyebrow, title, subtitle, cta1_text, cta1_url, cta2_text, cta2_url, sort_order, pages } = req.body;
  const pagesValue = Array.isArray(pages) ? pages.join(',') : (pages || 'all');

  try {
    const image_url = await uploadBuffer(req.file.buffer, 'talentyah/slides', { resource_type: 'image' });

    const { data: slide, error } = await db.client
      .from('carousel_slides')
      .insert([{
        image_url,
        eyebrow: eyebrow || 'Cabinet de recrutement',
        title: title || 'Talentyah',
        subtitle: subtitle || null,
        cta1_text: cta1_text || 'En savoir plus →',
        cta1_url: cta1_url || 'entreprises.html',
        cta2_text: cta2_text || null,
        cta2_url: cta2_url || null,
        pages: pagesValue,
        sort_order: sort_order !== undefined ? Number(sort_order) : 0,
        active: 1
      }])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(slide);
  } catch (err) {
    console.error('[POST /api/carousel]', err.message);
    res.status(500).json({ error: 'Erreur lors de la création du slide.' });
  }
});

// PUT /api/carousel/:id — admin
router.put('/:id', auth, upload.single('image'), async (req, res) => {
  const idNum = Number(req.params.id);
  if (isNaN(idNum)) return res.status(400).json({ error: 'ID invalide' });
  const { eyebrow, title, subtitle, cta1_text, cta1_url, cta2_text, cta2_url, sort_order, active, pages } = req.body;

  try {
    const { data: ex, error: exErr } = await db.client
      .from('carousel_slides')
      .select('*')
      .eq('id', idNum)
      .single();
    if (exErr || !ex) return res.status(404).json({ error: 'Slide introuvable' });

    const pagesValue = Array.isArray(pages) ? pages.join(',') : (pages || ex.pages || 'all');
    let image_url = ex.image_url;
    if (req.file) {
      await deleteByUrl(ex.image_url);
      image_url = await uploadBuffer(req.file.buffer, 'talentyah/slides', { resource_type: 'image' });
    }

    const { data: slide, error } = await db.client
      .from('carousel_slides')
      .update({
        image_url,
        eyebrow: eyebrow !== undefined ? eyebrow : ex.eyebrow,
        title: title !== undefined ? title : ex.title,
        subtitle: subtitle !== undefined ? subtitle : ex.subtitle,
        cta1_text: cta1_text !== undefined ? cta1_text : ex.cta1_text,
        cta1_url: cta1_url !== undefined ? cta1_url : ex.cta1_url,
        cta2_text: cta2_text !== undefined ? cta2_text : ex.cta2_text,
        cta2_url: cta2_url !== undefined ? cta2_url : ex.cta2_url,
        pages: pagesValue,
        sort_order: sort_order !== undefined ? Number(sort_order) : ex.sort_order,
        active: active !== undefined ? Number(active) : ex.active
      })
      .eq('id', idNum)
      .select()
      .single();

    if (error) throw error;
    res.json(slide);
  } catch (err) {
    console.error('[PUT /api/carousel/:id]', err.message);
    res.status(500).json({ error: 'Erreur lors de la mise à jour du slide.' });
  }
});

// DELETE /api/carousel/:id — admin
router.delete('/:id', auth, async (req, res) => {
  const idNum = Number(req.params.id);
  if (isNaN(idNum)) return res.status(400).json({ error: 'ID invalide' });
  try {
    const { data: slide } = await db.client.from('carousel_slides').select('image_url').eq('id', idNum).single();
    await deleteByUrl(slide?.image_url);
    const { error } = await db.client.from('carousel_slides').delete().eq('id', idNum);
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) {
    console.error('[DELETE /api/carousel/:id]', err.message);
    res.status(500).json({ error: 'Erreur lors de la suppression.' });
  }
});

module.exports = router;