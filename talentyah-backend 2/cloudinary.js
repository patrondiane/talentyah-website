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
  try {
    // Extraire le public_id depuis l'URL (ex: talentyah/slides/slide_123)
    const matches = url.match(/\/upload\/(?:v\d+\/)?(.+)\.[a-z]+$/i);
    if (matches?.[1]) await cloudinary.uploader.destroy(matches[1]);
  } catch (err) {
    console.warn('[CLOUDINARY] Suppression échouée:', err.message);
  }
}

module.exports = { uploadBuffer, deleteByUrl };