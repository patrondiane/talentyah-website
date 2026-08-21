const router = require('express').Router();
const nodemailer = require('nodemailer');
const db     = require('../db');
const { auth } = require('../middleware/auth');
const { encrypt, decrypt } = require('../crypto');

// GET /api/settings/smtp
router.get('/smtp', auth, async (req, res) => {
  try {
    const rows = await db.all(`SELECT * FROM config_settings WHERE key IN ('smtp_host', 'smtp_port', 'smtp_user', 'smtp_pass', 'smtp_from', 'notify_email')`);
    
    const settings = {
      smtp_host: '',
      smtp_port: '587',
      smtp_user: '',
      smtp_pass_configured: false,
      smtp_from: '',
      notify_email: ''
    };

    rows.forEach(r => {
      if (r.key === 'smtp_pass') {
        settings.smtp_pass_configured = !!r.value;
      } else {
        settings[r.key] = r.value || '';
      }
    });

    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: 'Impossible de charger la configuration SMTP' });
  }
});

// PUT /api/settings/smtp
router.put('/smtp', auth, async (req, res) => {
  const { smtp_host, smtp_port, smtp_user, smtp_pass, smtp_from, notify_email } = req.body;

  try {
    // 1. Enregistrer immédiatement les paramètres en BDD
    const queries = [];
    
    if (smtp_host !== undefined) queries.push(db.run(`INSERT INTO config_settings (key, value) VALUES ('smtp_host', ?) ON CONFLICT (key) DO UPDATE SET value=?, updated_at=CURRENT_TIMESTAMP`, [smtp_host, smtp_host]));
    if (smtp_port !== undefined) queries.push(db.run(`INSERT INTO config_settings (key, value) VALUES ('smtp_port', ?) ON CONFLICT (key) DO UPDATE SET value=?, updated_at=CURRENT_TIMESTAMP`, [String(smtp_port), String(smtp_port)]));
    if (smtp_user !== undefined) queries.push(db.run(`INSERT INTO config_settings (key, value) VALUES ('smtp_user', ?) ON CONFLICT (key) DO UPDATE SET value=?, updated_at=CURRENT_TIMESTAMP`, [smtp_user, smtp_user]));
    if (smtp_from !== undefined) queries.push(db.run(`INSERT INTO config_settings (key, value) VALUES ('smtp_from', ?) ON CONFLICT (key) DO UPDATE SET value=?, updated_at=CURRENT_TIMESTAMP`, [smtp_from, smtp_from]));
    if (notify_email !== undefined) queries.push(db.run(`INSERT INTO config_settings (key, value) VALUES ('notify_email', ?) ON CONFLICT (key) DO UPDATE SET value=?, updated_at=CURRENT_TIMESTAMP`, [notify_email, notify_email]));
    
    // Only encrypt and save password if it is not the placeholder '********'
    if (smtp_pass !== undefined && smtp_pass !== '********' && smtp_pass !== '') {
      const encryptedPass = encrypt(smtp_pass);
      queries.push(db.run(`INSERT INTO config_settings (key, value) VALUES ('smtp_pass', ?) ON CONFLICT (key) DO UPDATE SET value=?, updated_at=CURRENT_TIMESTAMP`, [encryptedPass, encryptedPass]));
    }

    await Promise.all(queries);

    // 2. Tester la connexion avec timeout court (4s)
    let host = smtp_host;
    let port = smtp_port ? Number(smtp_port) : 587;
    let user = smtp_user;
    let pass = smtp_pass;

    if (pass === '********' || !pass) {
      const dbRow = await db.get(`SELECT value FROM config_settings WHERE key = 'smtp_pass'`);
      pass = dbRow?.value ? decrypt(dbRow.value) : (process.env.SMTP_PASS || '');
    }

    let warning = null;
    if (host && user && pass) {
      try {
        const transporter = nodemailer.createTransport({
          host,
          port,
          secure: port === 465,
          auth: { user, pass },
          connectionTimeout: 4000,
          greetingTimeout: 4000,
          socketTimeout: 4000,
          tls: { rejectUnauthorized: false }
        });

        await Promise.race([
          transporter.verify(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Délai d\'attente dépassé (timeout 4s)')), 4000))
        ]);
        console.log('[SMTP CHECK] Connexion validée avec succès !');
      } catch (verifyErr) {
        console.warn('[SMTP CHECK WARNING]', verifyErr.message);
        warning = verifyErr.message;
      }
    }

    if (warning) {
      return res.json({ 
        success: true, 
        warning: true, 
        message: `Paramètres enregistrés en base de données. Note : Le test de connexion SMTP a échoué (${warning}). Vérifiez vos identifiants ou le port.` 
      });
    }

    res.json({ success: true, message: 'Configuration SMTP enregistrée et vérifiée avec succès !' });
  } catch (err) {
    console.error('[SMTP PUT ERROR]', err.message);
    res.status(500).json({ error: 'Impossible de mettre à jour la configuration SMTP : ' + err.message });
  }
});

module.exports = router;
