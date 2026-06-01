// server.js — Talentyah Backend
require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const path    = require('path');
const db      = require('./db');
require('dotenv').config();

const app  = express();
const PORT = process.env.PORT || 4000;

app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5500', 'http://127.0.0.1:5500', 'https://talentyah.com'],
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
  credentials: true,
}));



app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', version: '1.0.0' }));

// Routes
app.use('/api/carousel',     require('./routes/carousel'));
app.use('/api/admin',        require('./routes/admin'));
app.use('/api/candidates',   require('./routes/candidates'));
app.use('/api/companies',    require('./routes/companies'));
app.use('/api/jobs',         require('./routes/jobs'));
app.use('/api/publications', require('./routes/publications'));
app.use('/api/partners',     require('./routes/partners'));
app.use('/api/contact',      require('./routes/contact'));

// Alias routes
app.use('/api/candidate',    require('./routes/candidates'));
app.use('/api/company',      require('./routes/companies'));
app.use('/api/applications', require('./routes/candidates'));

// 404
app.use((req, res) => res.status(404).json({ error: `Route ${req.method} ${req.path} introuvable` }));

// Error handler
app.use((err, req, res, next) => {
  console.error('[ERROR]', err.message);
  res.status(500).json({ error: err.message || 'Erreur serveur' });
});

// Start
db.init().then(() => {
  app.listen(PORT, () => {
    console.log(`\n Talentyah Backend lance sur http://localhost:${PORT}`);
    console.log(`\nRoutes disponibles :`);
    console.log(`   POST   /api/admin/login`);
    console.log(`   GET    /api/admin/stats       [auth]`);
    console.log(`   GET    /api/admin/users        [superadmin]`);
    console.log(`   POST   /api/admin/users        [superadmin]`);
    console.log(`   DELETE /api/admin/users/:id    [superadmin]`);
    console.log(`   GET    /api/candidates          [auth]`);
    console.log(`   POST   /api/candidates          [public + upload CV]`);
    console.log(`   GET    /api/candidates/:id      [auth]`);
    console.log(`   DELETE /api/candidates/:id      [auth]`);
    console.log(`   GET    /api/companies            [auth]`);
    console.log(`   POST   /api/companies            [public]`);
    console.log(`   GET    /api/jobs                 [public]`);
    console.log(`   POST   /api/jobs                 [auth]`);
    console.log(`   PUT    /api/jobs/:id             [auth]`);
    console.log(`   DELETE /api/jobs/:id             [auth]`);
    console.log(`\nCV uploades dans ./uploads/`);
    console.log(`Base de donnees : ./data/talentyah.db\n`);
  });
}).catch(err => {
  console.error('Erreur init DB:', err);
  process.exit(1);
});