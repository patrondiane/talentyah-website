const express = require('express');
const db      = require('../db');
const auth    = require('../middleware/auth');
const router  = express.Router();

router.get('/', (req, res) => {
  const { category } = req.query;
  let sql = 'SELECT id,title,category,excerpt,author,image_url,created_at FROM articles WHERE published=1';
  const p = [];
  if (category) { sql += ' AND category=?'; p.push(category); }
  sql += ' ORDER BY created_at DESC';
  res.json({ articles: db.prepare(sql).all(...p) });
});

router.get('/admin/all', auth, (req, res) => {
  res.json({ articles: db.prepare('SELECT * FROM articles ORDER BY created_at DESC').all() });
});

router.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM articles WHERE id=? AND published=1').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Introuvable.' });
  res.json({ article: row });
});

router.post('/', auth, (req, res) => {
  const { title, category, excerpt, content, author, image_url, published } = req.body;
  if (!title) return res.status(400).json({ error: 'Titre requis.' });
  const result = db.prepare(`INSERT INTO articles (title,category,excerpt,content,author,image_url,published) VALUES (?,?,?,?,?,?,?)`)
    .run(title, category||null, excerpt||null, content||null, author||'Talentyah Editorial', image_url||null, published!==false ? 1 : 0);
  res.json({ ok: true, id: result.lastInsertRowid });
});

router.put('/:id', auth, (req, res) => {
  const { title, category, excerpt, content, author, image_url, published } = req.body;
  db.prepare(`UPDATE articles SET title=?,category=?,excerpt=?,content=?,author=?,image_url=?,published=? WHERE id=?`)
    .run(title, category||null, excerpt||null, content||null, author||'Talentyah Editorial', image_url||null, published ? 1 : 0, req.params.id);
  res.json({ ok: true });
});

router.delete('/:id', auth, (req, res) => {
  db.prepare('DELETE FROM articles WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;