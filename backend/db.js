/* =====================================================
   db.js — Initialisation SQLite + toutes les tables
===================================================== */
const Database = require('better-sqlite3');
const path     = require('path');
const bcrypt   = require('bcryptjs');

const db = new Database(path.join(__dirname, 'talentyah.db'));

// Performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

/* ---- TABLES ---- */
db.exec(`

  /* Administrateurs */
  CREATE TABLE IF NOT EXISTS admins (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    email      TEXT UNIQUE NOT NULL,
    password   TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );

  /* Candidatures (formulaire Talents) */
  CREATE TABLE IF NOT EXISTS candidates (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    first_name       TEXT NOT NULL,
    last_name        TEXT NOT NULL,
    email            TEXT NOT NULL,
    country          TEXT,
    role_target      TEXT,
    experience_level TEXT,
    cv_url           TEXT,
    message          TEXT,
    created_at       TEXT DEFAULT (datetime('now'))
  );

  /* Demandes entreprises (formulaire Entreprises) */
  CREATE TABLE IF NOT EXISTS companies (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    company_name TEXT,
    email        TEXT NOT NULL,
    region       TEXT,
    role_needed  TEXT,
    urgency      TEXT,
    message      TEXT,
    created_at   TEXT DEFAULT (datetime('now'))
  );

  /* Offres d'emploi */
  CREATE TABLE IF NOT EXISTS jobs (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    title         TEXT NOT NULL,
    country       TEXT,
    city          TEXT,
    sector        TEXT,
    contract_type TEXT,
    salary        TEXT,
    description   TEXT,
    tags          TEXT,
    active        INTEGER DEFAULT 1,
    created_at    TEXT DEFAULT (datetime('now'))
  );

  /* Articles / Blog */
  CREATE TABLE IF NOT EXISTS articles (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    title      TEXT NOT NULL,
    category   TEXT,
    excerpt    TEXT,
    content    TEXT,
    author     TEXT DEFAULT 'Talentyah Editorial',
    image_url  TEXT,
    published  INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
  );

`);

/* ---- ADMIN PAR DEFAUT ---- */
const adminEmail    = process.env.ADMIN_EMAIL    || 'admin@talentyah.com';
const adminPassword = process.env.ADMIN_PASSWORD || 'admin';

const existing = db.prepare('SELECT id FROM admins WHERE email = ?').get(adminEmail);
if (!existing) {
  const hash = bcrypt.hashSync(adminPassword, 10);
  db.prepare('INSERT INTO admins (email, password) VALUES (?, ?)').run(adminEmail, hash);
  console.log(`[DB] Admin cree : ${adminEmail}`);
}

module.exports = db;