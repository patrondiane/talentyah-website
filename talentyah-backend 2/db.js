// db.js — PostgreSQL via Supabase SDK (transparent & unifié)
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

let supabase;

async function init() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY;
  if (!url || !key) {
    throw new Error('SUPABASE_URL et SUPABASE_SERVICE_KEY sont requis dans le fichier .env');
  }

  supabase = createClient(url, key);
  await seedAdmins();
  console.log('[SUPABASE BDD] Connecté avec succès à Supabase PostgreSQL');
  return supabase;
}

async function all(sql, params = []) {
  const stringParams = params.map(p => p === null || p === undefined ? null : String(p));
  const { data, error } = await supabase.rpc('run_sql', {
    sql_query: sql,
    params: stringParams
  });

  if (error) {
    console.error('[SUPABASE SQL ERROR]', error.message, '| SQL:', sql);
    throw new Error(error.message);
  }

  return Array.isArray(data) ? data : [];
}

async function get(sql, params = []) {
  const rows = await all(sql, params);
  return rows[0] ?? null;
}

async function run(sql, params = []) {
  const stringParams = params.map(p => p === null || p === undefined ? null : String(p));
  const { data, error } = await supabase.rpc('run_sql', {
    sql_query: sql,
    params: stringParams
  });

  if (error) {
    console.error('[SUPABASE SQL ERROR]', error.message, '| SQL:', sql);
    throw new Error(error.message);
  }

  const lastId = (data && data.lastInsertRowid) ? Number(data.lastInsertRowid) : 0;
  return { lastInsertRowid: lastId };
}

function lastInsertRowId(result) {
  return Number(result?.lastInsertRowid || 0);
}

async function seedAdmins() {
  try {
    const existing = await get(`SELECT COUNT(*) as c FROM admin_users`);
    const count = Number(existing?.c ?? 0);
    if (count > 0) return;

    console.log('[SUPABASE BDD] Création du compte administrateur initial...');

    const hash = bcrypt.hashSync('admin', 10);
    await run(`INSERT INTO admin_users (email, password, role) VALUES (?, ?, ?)`, ['admin@talentyah.com', hash, 'superadmin']);

    console.log('[SUPABASE BDD] Compte admin@talentyah.com créé.');
  } catch (err) {
    console.error('[SUPABASE SEED ERROR]', err.message);
  }
}

function save() {}

module.exports = { 
  init, 
  all, 
  get, 
  run, 
  lastInsertRowId, 
  save,
  get client() { return supabase; }
};