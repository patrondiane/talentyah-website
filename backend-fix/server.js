/* =====================================================
   TALENTYAH — server.js
   Demarrage : node server.js
               npm start
               npm run dev   (avec nodemon)
===================================================== */
require('dotenv').config();

const express = require('express');
const cors    = require('cors');
const path    = require('path');
const multer  = require('multer');

const app  = express();
const PORT = process.env.PORT || 4000;

/* =========================================
   CORS — accepte localhost (tous ports)
   + fichiers ouverts en local (file://)
   + domaine de prod si FRONTEND_URL est set
========================================= */
app.use(cors({
  origin: function (origin, callback) {
    // Pas d'origin = Postman, curl, fichier local ouvert dans le navigateur
    if (!origin) return callback(null, true);

    const ok =
      /^https?:\/\/localhost(:\d+)?$/.test(origin)   ||
      /^https?:\/\/127\.0\.0\.1(:\d+)?$/.test(origin)||
      origin === process.env.FRONTEND_URL;

    callback(null, ok);
  },
  credentials: true,
}));

/* =========================================
   PARSERS
========================================= */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* =========================================
   FICHIERS STATIQUES : CVs uploades
========================================= */
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

/* =========================================
   MULTER — upload CV (champ name="cv")
========================================= */
const storage = multer.diskStorage({
  destination: path.join(__dirname, 'uploads'),
  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, Date.now() + '_' + safeName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 Mo max
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (['.pdf', '.doc', '.docx'].includes(ext)) {
      cb(null, true);
    } else {
      // On laisse passer sans bloquer le reste du formulaire
      // (le CV est optionnel cote backend)
      cb(null, false);
    }
  },
});

/* =========================================
   ROUTES
========================================= */

// Auth admin
app.use('/api/admin', require('./routes/auth'));

// Candidatures (multer applique avant la route pour decoder le multipart)
app.use('/api/candidates', upload.single('cv'), require('./routes/candidates'));

// Demandes entreprises
app.use('/api/companies', require('./routes/companies'));

// Offres d'emploi
app.use('/api/jobs', require('./routes/jobs'));

// Articles / Blog
app.use('/api/articles', require('./routes/articles'));

// Contact
app.use('/api/contact', require('./routes/contact'));

/* =========================================
   SANTE
========================================= */
app.get('/api/ping', (req, res) => {
  res.json({ ok: true, uptime: process.uptime().toFixed(1) + 's' });
});

/* =========================================
   ERREURS
========================================= */
app.use((err, req, res, next) => {
  console.error('[ERREUR]', err.message);
  res.status(err.status || 500).json({ ok: false, error: err.message || 'Erreur serveur.' });
});

/* =========================================
   DEMARRAGE
========================================= */
app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════╗
║   Talentyah API — http://localhost:${PORT}         ║
║                                                  ║
║   Endpoints :                                    ║
║   POST  /api/admin/login                         ║
║   POST  /api/candidates   (talents form)         ║
║   GET   /api/candidates   (admin)                ║
║   POST  /api/companies    (entreprises form)     ║
║   GET   /api/companies    (admin)                ║
║   GET   /api/jobs                                ║
║   POST  /api/jobs         (admin)                ║
║   POST  /api/articles     (admin)                ║
║   GET   /api/articles                            ║
║   POST  /api/contact                             ║
║   GET   /api/ping                                ║
╚══════════════════════════════════════════════════╝
  `);
});
