// cloudflare-r2.js — Module d'upload vers Cloudflare R2 (compatible S3)
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

const accountId       = process.env.R2_ACCOUNT_ID;
const accessKeyId     = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
const bucketName      = process.env.R2_BUCKET_NAME;
const publicUrl       = process.env.R2_PUBLIC_URL || '';

let r2Client = null;

if (accountId && accessKeyId && secretAccessKey) {
  const endpoint = process.env.R2_ENDPOINT || `https://${accountId}.r2.cloudflarestorage.com`;
  r2Client = new S3Client({
    endpoint: endpoint,
    credentials: {
      accessKeyId: accessKeyId,
      secretAccessKey: secretAccessKey,
    },
    region: 'auto',
  });
}

/**
 * Uploade un buffer vers Cloudflare R2
 * @param {Buffer} buffer Le contenu binaire du fichier
 * @param {string} fileName Le nom de destination sur le bucket (ex: 'cvs/cv_123.pdf')
 * @param {string} mimeType Le type mime du fichier (ex: 'application/pdf')
 * @returns {Promise<string>} L'URL publique d'accès au fichier
 */
async function uploadToR2(buffer, fileName, mimeType) {
  if (!r2Client) {
    throw new Error('[R2] Le client S3 n\'a pas pu être initialisé. Clés manquantes dans le .env.');
  }

  // Nettoyage du nom pour éviter les backslashes sous Windows
  const cleanKey = fileName.replace(/\\/g, '/');

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: cleanKey,
    Body: buffer,
    ContentType: mimeType,
  });

  await r2Client.send(command);

  // Formatage propre de l'URL publique de retour
  const formattedBaseUrl = publicUrl.endsWith('/') ? publicUrl : `${publicUrl}/`;
  return `${formattedBaseUrl}${cleanKey}`;
}

module.exports = { uploadToR2 };
