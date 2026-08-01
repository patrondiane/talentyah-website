// middleware/turnstile.js — Validation de sécurité Cloudflare Turnstile (sans dépendance externe)
async function verifyTurnstile(req, res, next) {
  const secretKey = process.env.TURNSTILE_SECRET_KEY;

  // Si la clé n'est pas configurée (ex: en local), on laisse passer pour ne pas bloquer le dev
  if (!secretKey) {
    return next();
  }

  // Le token peut être soumis dans le body ou dans les headers
  const token = req.body['cf-turnstile-response'] || req.body['token'] || req.headers['x-turnstile-token'];
  if (!token) {
    return res.status(400).json({ error: 'Vérification de sécurité (Captcha) requise.' });
  }

  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

  try {
    // Utilisation du fetch natif disponible dans Node.js v18+
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        secret: secretKey,
        response: token,
        remoteip: ip
      })
    });

    const data = await response.json();
    if (!data.success) {
      return res.status(400).json({ error: 'Échec de la validation de sécurité (Captcha).' });
    }

    next();
  } catch (err) {
    console.error('[TURNSTILE] Erreur validation:', err.message);
    return res.status(500).json({ error: 'Erreur technique lors de la vérification de sécurité.' });
  }
}

module.exports = verifyTurnstile;
