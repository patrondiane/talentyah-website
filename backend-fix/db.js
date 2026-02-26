/* =====================================================
   db.js — Base SQLite + creation de toutes les tables
===================================================== */
const Database = require('better-sqlite3');
const bcrypt   = require('bcryptjs');
const path     = require('path');

const db = new Database(path.join(__dirname, 'talentyah.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`

  CREATE TABLE IF NOT EXISTS admins (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    email      TEXT UNIQUE NOT NULL,
    password   TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );

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
    job_id           INTEGER,
    job_title        TEXT,
    created_at       TEXT DEFAULT (datetime('now'))
  );

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
    is_new        INTEGER DEFAULT 0,
    active        INTEGER DEFAULT 1,
    created_at    TEXT DEFAULT (datetime('now'))
  );

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

  CREATE TABLE IF NOT EXISTS contacts (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    fullname   TEXT,
    email      TEXT,
    type       TEXT,
    message    TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

`);

/* Admin par defaut au premier demarrage */
const email    = process.env.ADMIN_EMAIL    || 'admin@talentyah.com';
const password = process.env.ADMIN_PASSWORD || 'admin';

if (!db.prepare('SELECT id FROM admins WHERE email = ?').get(email)) {
  const hash = bcrypt.hashSync(password, 10);
  db.prepare('INSERT INTO admins (email, password) VALUES (?, ?)').run(email, hash);
  console.log(`[DB] Admin cree : ${email} / ${password}`);
}

module.exports = db;