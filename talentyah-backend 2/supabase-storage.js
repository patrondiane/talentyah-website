// supabase-storage.js — Stockage des CVs via Supabase Storage (gratuit, public)
const { createClient } = require('@supabase/supabase-js');

const BUCKET = 'cvs'; // nom du bucket à créer sur Supabase

let supabase;

function getClient() {
  if (!supabase) {
    supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY // service_role key (pas la anon key)
    );
  }
  return supabase;
}

/**
 * Upload un CV vers Supabase Storage
 * @param {Buffer} buffer — contenu du fichier
 * @param {string} filename — nom du fichier
 * @param {string} mimetype — type MIME
 * @returns {Promise<string>} — URL publique permanente
 */
async function uploadCV(buffer, filename, mimetype) {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    console.warn('[SUPABASE] Variables non configurées — CV non uploadé');
    return null;
  }

  const client   = getClient();
  const safeName = `cv_${Date.now()}_${filename.replace(/[^a-zA-Z0-9._-]/g, '_')}`;

  const { data, error } = await client.storage
    .from(BUCKET)
    .upload(safeName, buffer, {
      contentType: mimetype || 'application/pdf',
      upsert: false,
    });

  if (error) throw new Error('[SUPABASE] Upload échoué: ' + error.message);

  // URL publique permanente
  const { data: urlData } = client.storage.from(BUCKET).getPublicUrl(safeName);
  return urlData.publicUrl;
}

/**
 * Supprime un CV depuis son URL publique
 * @param {string} url — URL publique Supabase
 */
async function deleteCV(url) {
  if (!url || !process.env.SUPABASE_URL) return;
  try {
    const client = getClient();
    // Extraire le nom du fichier depuis l'URL
    const filename = url.split('/').pop();
    await client.storage.from(BUCKET).remove([filename]);
  } catch (err) {
    console.warn('[SUPABASE] Suppression échouée:', err.message);
  }
}

module.exports = { uploadCV, deleteCV };