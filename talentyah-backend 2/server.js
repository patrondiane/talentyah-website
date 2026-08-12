// server.js — Talentyah Backend
require('dotenv').config();

// Protection anti-crash pour les rejets de promesses non interceptés
process.on('unhandledRejection', (reason, promise) => {
  console.error('[UNHANDLED REJECTION]', reason);
});
process.on('uncaughtException', (error) => {
  console.error('[UNCAUGHT EXCEPTION]', error);
});
const express = require('express');
const cors    = require('cors');
const path    = require('path');
const db      = require('./db');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app  = express();
const PORT = process.env.PORT || 4000;

const allowedOrigins = [
  'https://talentyah.com',
  'https://www.talentyah.com'
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    
    // Pour la production, on peut restreindre strictement :
    const isLocal = origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:');
    if (allowedOrigins.includes(origin) || isLocal) {
      return callback(null, true);
    }
    callback(new Error('Origine non autorisée par CORS'));
  },
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
  credentials: true,
}));



app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Répondre explicitement aux preflight OPTIONS
app.options('*', cors());

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', version: '1.0.0' }));

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 heure
  max: 5000, // Limite généreuse pour permettre le polling et l'administration fluide
  message: { error: 'Trop de requêtes, veuillez réessayer plus tard.' }
});

const candidatesLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 heure
  max: 10, // 10 candidatures max par IP par heure
  message: { error: 'Limite de candidatures atteinte. Veuillez réessayer plus tard.' }
});

app.use('/api/', apiLimiter);

// Routes
app.use('/api/carousel',     require('./routes/carousel'));
app.use('/api/admin',        require('./routes/admin'));
app.use('/api/candidates',   candidatesLimiter, require('./routes/candidates'));
app.use('/api/companies',    require('./routes/companies'));
app.use('/api/jobs',         require('./routes/jobs'));
app.use('/api/publications', require('./routes/publications'));
app.use('/api/partners',     require('./routes/partners'));
app.use('/api/contact',      require('./routes/contact'));
app.use('/api/crm',          require('./routes/crm'));
app.use('/api/settings',     require('./routes/settings'));

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
    console.log(`Base de donnees : Supabase PostgreSQL\n`);
  });
}).catch(err => {
  console.error('Erreur init DB:', err);
  process.exit(1);
});