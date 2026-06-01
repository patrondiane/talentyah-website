// cloudinary.js — configuration centrale Cloudinary
const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Upload un fichier buffer vers Cloudinary
 * @param {Buffer} buffer    — contenu du fichier
 * @param {string} folder    — dossier dans Cloudinary (ex: 'cv', 'slides', 'partners')
 * @param {object} options   — options supplémentaires (resource_type, etc.)
 * @returns {Promise<string>} — URL sécurisée du fichier
 */
function uploadBuffer(buffer, folder, options = {}) {
  // Si Cloudinary n'est pas configuré, retourner null sans crasher
  if (!process.env.CLOUDINARY_API_KEY) {
    console.warn('[CLOUDINARY] Variables non configurées — upload ignoré');
    return Promise.resolve(null);
  }
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, ...options },
      (error, result) => {
        if (error) return reject(error);
        resolve(result.secure_url);
      }
    );
    stream.end(buffer);
  });
}

/**
 * Supprime un fichier Cloudinary à partir de son URL
 * @param {string} url — URL Cloudinary du fichier
 */
async function deleteByUrl(url) {
  if (!url || !url.includes('cloudinary.com')) return;
  if (!process.env.CLOUDINARY_API_KEY) return; // pas configuré
  try {
    const matches = url.match(/\/upload\/(?:v\d+\/)?(.+)\.[a-z]+$/i);
    if (matches?.[1]) await cloudinary.uploader.destroy(matches[1]);
  } catch (err) {
    console.warn('[CLOUDINARY] Suppression échouée:', err.message);
  }
}

/**
 * Génère une URL signée temporaire (1 heure) pour accéder à un fichier privé Cloudinary
 * @param {string} url — URL publique Cloudinary
 * @returns {string} — URL signée valable 1h
 */
function getSignedUrl(url) {
  if (!url || !url.includes('cloudinary.com')) return url;
  if (!process.env.CLOUDINARY_API_KEY) return url;
  try {
    // Extraire le public_id
    const matches = url.match(/\/upload\/(?:v\d+\/)?(.+)$/i);
    if (!matches?.[1]) return url;
    const publicId = matches[1].replace(/\.[^.]+$/, ''); // retirer l'extension
    return cloudinary.url(publicId, {
      resource_type: 'raw',
      type: 'upload',
      sign_url: true,
      expires_at: Math.floor(Date.now() / 1000) + 3600, // 1 heure
    });
  } catch {
    return url;
  }
}

module.exports = { uploadBuffer, deleteByUrl, getSignedUrl };