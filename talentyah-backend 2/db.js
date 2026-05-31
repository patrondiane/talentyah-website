// db.js — SQLite via sql.js avec persistence fichier
const fs   = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'data', 'talentyah.db');

let db;
let SQL;

async function init() {
  const initSqlJs = require('./node_modules/sql.js');
  SQL = await initSqlJs();

  // Créer le dossier data/ s'il n'existe pas
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  db.run(`PRAGMA journal_mode=WAL;`);
  createTables();
  runMigrations();
  seedAdmins();
  save();
  return db;
}

function save() {
  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

function runMigrations() {
  // Ajouter les colonnes manquantes sans casser la DB existante
  const migrations = [
    `ALTER TABLE candidates ADD COLUMN job_id INTEGER`,
    `ALTER TABLE carousel_slides ADD COLUMN pages TEXT DEFAULT 'all'`,
  ];
  for (const sql of migrations) {
    try { db.run(sql); } catch { /* colonne existe déjà */ }
  }
}

function createTables() {
  db.run(`
    CREATE TABLE IF NOT EXISTS admin_users (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      email     TEXT UNIQUE NOT NULL,
      password  TEXT NOT NULL,
      role      TEXT NOT NULL DEFAULT 'admin',
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS candidates (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      first_name       TEXT NOT NULL,
      last_name        TEXT NOT NULL,
      email            TEXT NOT NULL,
      phone            TEXT,
      role_target      TEXT,
      sector           TEXT,
      country          TEXT,
      experience_level TEXT,
      message          TEXT,
      cv_url           TEXT,
      cv_filename      TEXT,
      job_id           INTEGER,
      created_at       TEXT DEFAULT (datetime('now'))
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS companies (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      company_name TEXT NOT NULL,
      email        TEXT NOT NULL,
      phone        TEXT,
      region       TEXT,
      role_needed  TEXT,
      urgency      TEXT DEFAULT 'moyenne',
      message      TEXT,
      created_at   TEXT DEFAULT (datetime('now'))
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS jobs (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      title         TEXT NOT NULL,
      city          TEXT,
      country       TEXT,
      contract_type TEXT,
      sector        TEXT,
      salary        TEXT,
      tags          TEXT,
      description   TEXT,
      requirements  TEXT,
      status        TEXT DEFAULT 'active',
      created_at    TEXT DEFAULT (datetime('now'))
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS publications (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      title      TEXT NOT NULL,
      category   TEXT DEFAULT 'Conseil carrière',
      status     TEXT DEFAULT 'draft',
      excerpt    TEXT,
      content    TEXT,
      image_url  TEXT,
      published_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS partners (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      name        TEXT NOT NULL,
      description TEXT,
      image_url   TEXT,
      sort_order  INTEGER DEFAULT 0,
      created_at  TEXT DEFAULT (datetime('now'))
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS contacts (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      fullname   TEXT,
      email      TEXT NOT NULL,
      subject    TEXT,
      type       TEXT,
      message    TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS carousel_slides (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      image_url  TEXT NOT NULL,
      eyebrow    TEXT DEFAULT 'Cabinet de recrutement',
      title      TEXT DEFAULT 'Talentyah',
      subtitle   TEXT,
      cta1_text  TEXT DEFAULT 'Je recrute →',
      cta1_url   TEXT DEFAULT 'entreprises.html',
      cta2_text  TEXT,
      cta2_url   TEXT,
      pages      TEXT DEFAULT 'all',
      sort_order INTEGER DEFAULT 0,
      active     INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);
}

function seedAdmins() {
  const bcrypt = require('bcryptjs');
  const existing = db.exec(`SELECT COUNT(*) as c FROM admin_users`);
  const count = existing[0]?.values[0][0] || 0;
  if (count > 0) return;

  const admins = [
    { email: 'admin@talentyah.com',   password: 'admin',   role: 'superadmin' },
    { email: 'manager@talentyah.com', password: 'manager', role: 'admin'      },
    { email: 'editor@talentyah.com',  password: 'editor',  role: 'editor'     },
  ];

  const stmt = db.prepare(`INSERT INTO admin_users (email, password, role) VALUES (?, ?, ?)`);
  for (const a of admins) {
    const hash = bcrypt.hashSync(a.password, 10);
    stmt.run([a.email, hash, a.role]);
  }
  stmt.free();

  // Seed sample jobs
  const jobs = [
    { title: 'Responsable Administratif et Financier', city: 'Dakar',   country: 'Sénégal',       contract_type: 'CDI',      sector: 'Finance', salary: '2 500–3 500 EUR/mois' },
    { title: 'Chargé(e) des Ressources Humaines',     city: 'Abidjan', country: "Côte d'Ivoire", contract_type: 'CDD',      sector: 'RH',      salary: '1 200–1 800 EUR/mois' },
    { title: 'Business Analyst – Data & Reporting',   city: 'Nairobi', country: 'Kenya',          contract_type: 'Freelance',sector: 'Tech',    salary: '250–350 EUR/jour'     },
  ];
  const jstmt = db.prepare(`INSERT INTO jobs (title, city, country, contract_type, sector, salary) VALUES (?,?,?,?,?,?)`);
  for (const j of jobs) jstmt.run([j.title, j.city, j.country, j.contract_type, j.sector, j.salary]);
  jstmt.free();

  // Seed sample publications
  const pubs = [
    { title: 'Comment réussir sa mobilité internationale en Afrique', category: 'Conseil carrière', status: 'published', excerpt: "Les clés pour préparer et réussir un projet de relocation professionnelle en Afrique subsaharienne.", published_at: '2026-03-15' },
    { title: "Les profils les plus recherchés en Afrique de l'Ouest en 2026", category: "Marché de l'emploi", status: 'published', excerpt: 'Analyse des tendances de recrutement et des compétences en forte demande.', published_at: '2026-03-01' },
    { title: "Guide de l'entretien en visioconférence", category: 'Conseil carrière', status: 'draft', excerpt: '', published_at: null },
  ];
  const pstmt = db.prepare(`INSERT INTO publications (title, category, status, excerpt, published_at) VALUES (?,?,?,?,?)`);
  for (const p of pubs) pstmt.run([p.title, p.category, p.status, p.excerpt, p.published_at]);
  pstmt.free();

  // Partenaires ajoutés via l'admin uniquement (avec images)
}

// Query helpers
function all(sql, params = []) {
  const result = db.exec(sql, params);
  if (!result.length) return [];
  const { columns, values } = result[0];
  return values.map(row => {
    const obj = {};
    columns.forEach((col, i) => { obj[col] = row[i]; });
    return obj;
  });
}

function get(sql, params = []) {
  return all(sql, params)[0] || null;
}

function run(sql, params = []) {
  db.run(sql, params);
  save();
  return db;
}

function lastInsertRowId() {
  const r = db.exec(`SELECT last_insert_rowid() as id`);
  return r[0]?.values[0][0];
}

module.exports = { init, all, get, run, lastInsertRowId, save };
// Note: tables publications & partenaires ajoutées via patch// db.js — SQLite via sql.js avec persistence fichier
