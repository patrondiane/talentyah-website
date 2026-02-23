/* =====================================================
   TALENTYAH — server.js
   Serveur principal Express + SQLite
   Usage : node server.js (ou npm run dev)
===================================================== */
require('dotenv').config();

const express = require('express');
const cors    = require('cors');
const path    = require('path');
const multer  = require('multer');

const app = express();
const PORT = process.env.PORT || 4000;
const fs = require('fs');

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);


/* ---- MIDDLEWARES ---- */
app.use(cors({
  origin: ['http://127.0.0.1:5500', 'http://localhost:5500'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
})); // En prod : restreindre a votre domaine
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});


/* ---- FICHIERS STATIQUES (CVs uploades) ---- */
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

/* ---- UPLOAD CVs (multer) ---- */
const storage = multer.diskStorage({
  destination: path.join(__dirname, 'uploads'),
  filename: (req, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, Date.now() + '_' + safe);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 Mo max
  fileFilter: (req, file, cb) => {
    const ok = ['.pdf','.doc','.docx'].includes(path.extname(file.originalname).toLowerCase());
    cb(ok ? null : new Error('Format non accepte.'), ok);
  }
});

/* ---- ROUTES ---- */
app.use('/api/admin',      require('./routes/auth'));
app.use('/api/candidates', require('./routes/candidates'));
app.use('/api/companies',  require('./routes/companies'));
app.use('/api/jobs',       require('./routes/jobs'));
app.use('/api/articles',   require('./routes/articles'));

/* ---- SANTE ---- */
app.get('/api/ping', (req, res) => res.json({ ok: true, message: 'Talentyah API operationnelle' }));

/* ---- ERREURS ---- */
app.use((err, req, res, next) => {
  console.error(err.message);
  res.status(500).json({ error: err.message || 'Erreur serveur.' });
});

app.get('/', (req, res) => {
  res.send('Talentyah API OK ✅ — essaie /api/ping');
});

app.listen(PORT, () => console.log(`\n  Talentyah API demarree sur http://localhost:${PORT}\n`));