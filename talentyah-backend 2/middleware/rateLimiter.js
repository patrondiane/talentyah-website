// middleware/rateLimiter.js — Rate limiter en mémoire sans dépendance externe
const ipRequestCounts = new Map();

// Nettoyage périodique toutes les 10 minutes pour éviter la fuite de mémoire
setInterval(() => {
  const now = Date.now();
  for (const [ip, data] of ipRequestCounts.entries()) {
    if (now > data.resetTime) {
      ipRequestCounts.delete(ip);
    }
  }
}, 10 * 60 * 1000);

function rateLimiter({ windowMs, maxRequests, message }) {
  return (req, res, next) => {
    // Déterminer l'IP du client (prend en compte le proxy si configuré)
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || req.ip;
    const now = Date.now();

    if (!ipRequestCounts.has(ip)) {
      ipRequestCounts.set(ip, {
        count: 1,
        resetTime: now + windowMs
      });
      return next();
    }

    const clientData = ipRequestCounts.get(ip);

    if (now > clientData.resetTime) {
      // Réinitialiser si la fenêtre de temps est passée
      clientData.count = 1;
      clientData.resetTime = now + windowMs;
      return next();
    }

    clientData.count++;
    if (clientData.count > maxRequests) {
      return res.status(429).json({
        error: message || 'Trop de requêtes depuis cette adresse IP. Veuillez réessayer plus tard.'
      });
    }

    next();
  };
}

module.exports = rateLimiter;
