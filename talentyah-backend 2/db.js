// db.js — SQLite via Turso (libsql) avec persistence cloud
const { createClient } = require('@libsql/client');
const bcrypt = require('bcryptjs');

let db;

async function init() {
  db = createClient({
    url:       process.env.TURSO_DATABASE_URL,   // ex: libsql://talentyah-xxx.turso.io
    authToken: process.env.TURSO_AUTH_TOKEN,     // ex: eyJhbGci...
  });

  await createTables();
  await runMigrations();
  await seedAdmins();
  return db;
}

// ─── Migrations ───────────────────────────────────────────────────────────────

async function runMigrations() {
  const migrations = [
    `ALTER TABLE candidates ADD COLUMN job_id INTEGER`,
    `ALTER TABLE carousel_slides ADD COLUMN pages TEXT DEFAULT 'all'`,
    `ALTER TABLE jobs ADD COLUMN description TEXT`,
    `ALTER TABLE jobs ADD COLUMN requirements TEXT`,
    `ALTER TABLE jobs ADD COLUMN tags TEXT`,
    `ALTER TABLE jobs ADD COLUMN salary TEXT`,
    `ALTER TABLE jobs ADD COLUMN is_new INTEGER DEFAULT 0`,
  ];
  for (const sql of migrations) {
    try { await db.execute(sql); } catch { /* colonne existe déjà */ }
  }
}

// ─── Tables ───────────────────────────────────────────────────────────────────

async function createTables() {
  await db.executeMultiple(`
    CREATE TABLE IF NOT EXISTS admin_users (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      email      TEXT UNIQUE NOT NULL,
      password   TEXT NOT NULL,
      role       TEXT NOT NULL DEFAULT 'admin',
      created_at TEXT DEFAULT (datetime('now'))
    );

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

    CREATE TABLE IF NOT EXISTS publications (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      title        TEXT NOT NULL,
      category     TEXT DEFAULT 'Conseil carrière',
      status       TEXT DEFAULT 'draft',
      excerpt      TEXT,
      content      TEXT,
      image_url    TEXT,
      published_at TEXT,
      created_at   TEXT DEFAULT (datetime('now')),
      updated_at   TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS partners (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      name        TEXT NOT NULL,
      description TEXT,
      image_url   TEXT,
      sort_order  INTEGER DEFAULT 0,
      created_at  TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS contacts (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      fullname   TEXT,
      email      TEXT NOT NULL,
      subject    TEXT,
      type       TEXT,
      message    TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

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

// ─── Seed ─────────────────────────────────────────────────────────────────────

async function seedAdmins() {
  const existing = await db.execute(`SELECT COUNT(*) as c FROM admin_users`);
  const count = existing.rows[0]?.c ?? 0;
  if (count > 0) return;

  const admins = [
    { email: 'admin@talentyah.com',   password: 'admin',   role: 'superadmin' },
    { email: 'manager@talentyah.com', password: 'manager', role: 'admin'      },
    { email: 'editor@talentyah.com',  password: 'editor',  role: 'editor'     },
  ];

  for (const a of admins) {
    const hash = bcrypt.hashSync(a.password, 10);
    await db.execute({
      sql:  `INSERT INTO admin_users (email, password, role) VALUES (?, ?, ?)`,
      args: [a.email, hash, a.role],
    });
  }

  // Seed sample jobs
  const jobs = [
    { title: 'Responsable Administratif et Financier', city: 'Dakar',   country: 'Sénégal',       contract_type: 'CDI',       sector: 'Finance', salary: '2 500–3 500 EUR/mois' },
    { title: 'Chargé(e) des Ressources Humaines',     city: 'Abidjan', country: "Côte d'Ivoire", contract_type: 'CDD',       sector: 'RH',      salary: '1 200–1 800 EUR/mois' },
    { title: 'Business Analyst – Data & Reporting',   city: 'Nairobi', country: 'Kenya',          contract_type: 'Freelance', sector: 'Tech',    salary: '250–350 EUR/jour'     },
  ];
  for (const j of jobs) {
    await db.execute({
      sql:  `INSERT INTO jobs (title, city, country, contract_type, sector, salary) VALUES (?,?,?,?,?,?)`,
      args: [j.title, j.city, j.country, j.contract_type, j.sector, j.salary],
    });
  }

  // Seed sample publications
  const pubs = [
    { title: 'Comment réussir sa mobilité internationale en Afrique', category: 'Conseil carrière',     status: 'published', excerpt: "Les clés pour préparer et réussir un projet de relocation professionnelle en Afrique subsaharienne.", published_at: '2026-03-15' },
    { title: "Les profils les plus recherchés en Afrique de l'Ouest en 2026", category: "Marché de l'emploi", status: 'published', excerpt: 'Analyse des tendances de recrutement et des compétences en forte demande.',                     published_at: '2026-03-01' },
    { title: "Guide de l'entretien en visioconférence",               category: 'Conseil carrière',     status: 'draft',     excerpt: '',                                                                                                   published_at: null         },
  ];
  for (const p of pubs) {
    await db.execute({
      sql:  `INSERT INTO publications (title, category, status, excerpt, published_at) VALUES (?,?,?,?,?)`,
      args: [p.title, p.category, p.status, p.excerpt, p.published_at],
    });
  }
}

// ─── Query helpers ────────────────────────────────────────────────────────────

/**
 * Retourne tous les résultats d'une requête SELECT.
 * @param {string} sql
 * @param {Array}  params
 * @returns {Promise<Array>}
 */
async function all(sql, params = []) {
  const result = await db.execute({ sql, args: params });
  return result.rows;
}

/**
 * Retourne la première ligne ou null.
 */
async function get(sql, params = []) {
  const rows = await all(sql, params);
  return rows[0] ?? null;
}

/**
 * Exécute une requête INSERT / UPDATE / DELETE.
 * Retourne l'objet ResultSet (avec lastInsertRowid).
 */
async function run(sql, params = []) {
  const result = await db.execute({ sql, args: params });
  return result;
}

/**
 * Retourne le lastInsertRowid de la dernière opération run().
 * À appeler juste après run() en passant le résultat.
 *
 * Exemple :
 *   const result = await run(`INSERT INTO jobs ...`, [...]);
 *   const id = lastInsertRowId(result);
 */
function lastInsertRowId(result) {
  return Number(result.lastInsertRowid);
}

// save() n'est plus nécessaire — Turso persiste automatiquement
function save() { /* no-op — Turso gère la persistence */ }

module.exports = { init, all, get, run, lastInsertRowId, save };