const path = require("path");
const Database = require("better-sqlite3");

const dbPath = path.join(__dirname, "..", "db", "database.sqlite");
const db = new Database(dbPath);

db.exec(`
    CREATE TABLE IF NOT EXISTS companies(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        company_name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        region TEXT,
        role_needed TEXT,
        urgency TEXT,
        message TEXT,
        created_at TEXT NOT NULL
    );

    CREATE TABLE  IF NOT EXISTS candidates(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        first_name TEXT,
        last_name TEXT,
        email TEXT NOT NULL,
        phone TEXT,
        country TEXT,
        city TEXT,
        sector TEXT,
        experience_level TEXT,
        role_target TEXT,
        countries_json TEXT,
        cv_filename TEXT,
        cv_mime TEXT,
        cv_size INTEGER,
        created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    country TEXT,
    city TEXT,
    sector TEXT,
    contract_type TEXT,
    salary TEXT,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'OPEN',
    created_at TEXT NOT NULL,
    closed_at TEXT
  );
`);

module.exports = db;