// mailer.js — Envoi d'emails de notification
const nodemailer = require('nodemailer');

const db         = require('./db');
const { decrypt } = require('./crypto');

const ADMIN_URL   = process.env.ADMIN_URL || 'https://talentyah.com/admin.html';

async function sendNotification(subject, html) {
  let host = process.env.SMTP_HOST || 'smtp.gmail.com';
  let port = Number(process.env.SMTP_PORT) || 587;
  let user = process.env.SMTP_USER || '';
  let pass = process.env.SMTP_PASS || '';
  let from = process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@talentyah.com';
  let notifyTo = process.env.NOTIFY_EMAIL || process.env.SMTP_USER || '';

  try {
    const rows = await db.all(`SELECT * FROM config_settings WHERE key IN ('smtp_host', 'smtp_port', 'smtp_user', 'smtp_pass', 'smtp_from', 'notify_email')`);
    rows.forEach(r => {
      if (r.key === 'smtp_host' && r.value) host = r.value;
      if (r.key === 'smtp_port' && r.value) port = Number(r.value);
      if (r.key === 'smtp_user' && r.value) user = r.value;
      if (r.key === 'smtp_pass' && r.value) pass = decrypt(r.value);
      if (r.key === 'smtp_from' && r.value) from = r.value;
      if (r.key === 'notify_email' && r.value) notifyTo = r.value;
    });
  } catch (err) {
    console.warn(`[MAIL] Impossible de charger les paramètres SMTP depuis la BDD: ${err.message}`);
  }

  // Si pas d'expéditeur configuré, fallback sur l'utilisateur SMTP
  if (!from && user) from = user;
  if (!notifyTo && user) notifyTo = user;

  if (!notifyTo || !user) {
    console.warn('[MAIL] Envoi annulé : SMTP_USER ou NOTIFY_EMAIL non configuré.');
    return;
  }

  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
      tls: {
        rejectUnauthorized: false // Empêche les erreurs de certificat autosigné fréquentes avec certains hébergeurs
      }
    });

    await transporter.sendMail({ from, to: notifyTo, subject, html });
    console.log(`[MAIL] Envoyé via ${host} : ${subject}`);
  } catch (err) {
    console.warn(`[MAIL] Échec envoi : ${err.message}`);
  }
}

async function notifyNewCandidate(candidate) {
  const subject = `🧑‍💼 Nouvelle candidature — ${candidate.first_name} ${candidate.last_name}`;
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
      <div style="background:#1a5233;padding:24px;border-radius:8px 8px 0 0;">
        <h2 style="color:#fff;margin:0;">Nouvelle candidature reçue</h2>
      </div>
      <div style="background:#f9f9f9;padding:24px;border-radius:0 0 8px 8px;border:1px solid #eee;">
        <table style="width:100%;border-collapse:collapse;">
          <tr><td style="padding:8px 0;color:#666;width:140px;">Nom</td><td style="padding:8px 0;font-weight:600;">${candidate.first_name} ${candidate.last_name}</td></tr>
          <tr><td style="padding:8px 0;color:#666;">Email</td><td style="padding:8px 0;"><a href="mailto:${candidate.email}">${candidate.email}</a></td></tr>
          <tr><td style="padding:8px 0;color:#666;">Téléphone</td><td style="padding:8px 0;">${candidate.phone || '—'}</td></tr>
          <tr><td style="padding:8px 0;color:#666;">Poste visé</td><td style="padding:8px 0;">${candidate.role_target || '—'}</td></tr>
          <tr><td style="padding:8px 0;color:#666;">Secteur</td><td style="padding:8px 0;">${candidate.sector || '—'}</td></tr>
          <tr><td style="padding:8px 0;color:#666;">Pays</td><td style="padding:8px 0;">${candidate.country || '—'}</td></tr>
          <tr><td style="padding:8px 0;color:#666;">Expérience</td><td style="padding:8px 0;">${candidate.experience_level || '—'}</td></tr>
          <tr><td style="padding:8px 0;color:#666;">CV joint</td><td style="padding:8px 0;">${candidate.cv_url ? `✅ <a href="${candidate.cv_url}">Télécharger</a>` : '❌ Non'}</td></tr>
          ${candidate.source ? `<tr><td style="padding:8px 0;color:#666;">Source</td><td style="padding:8px 0;">${candidate.source}</td></tr>` : ''}
          ${candidate.message ? `<tr><td style="padding:8px 0;color:#666;vertical-align:top;">Message</td><td style="padding:8px 0;">${candidate.message}</td></tr>` : ''}
        </table>
        <div style="margin-top:20px;">
          <a href="${ADMIN_URL}" style="background:#1a5233;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;">Voir dans l'admin →</a>
        </div>
      </div>
    </div>`;
  return sendNotification(subject, html);
}

async function notifyNewCompany(company) {
  const urgenceLabel = { haute: '🔴 Haute', moyenne: '🟡 Moyenne', basse: '🟢 Basse' };
  const subject = `🏢 Nouvelle demande entreprise — ${company.company_name}`;
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
      <div style="background:#1a5233;padding:24px;border-radius:8px 8px 0 0;">
        <h2 style="color:#fff;margin:0;">Nouvelle demande entreprise</h2>
      </div>
      <div style="background:#f9f9f9;padding:24px;border-radius:0 0 8px 8px;border:1px solid #eee;">
        <table style="width:100%;border-collapse:collapse;">
          <tr><td style="padding:8px 0;color:#666;width:140px;">Société</td><td style="padding:8px 0;font-weight:600;">${company.company_name}</td></tr>
          <tr><td style="padding:8px 0;color:#666;">Email</td><td style="padding:8px 0;"><a href="mailto:${company.email}">${company.email}</a></td></tr>
          <tr><td style="padding:8px 0;color:#666;">Téléphone</td><td style="padding:8px 0;">${company.phone || '—'}</td></tr>
          <tr><td style="padding:8px 0;color:#666;">Région</td><td style="padding:8px 0;">${company.region || '—'}</td></tr>
          <tr><td style="padding:8px 0;color:#666;">Poste recherché</td><td style="padding:8px 0;">${company.role_needed || '—'}</td></tr>
          <tr><td style="padding:8px 0;color:#666;">Urgence</td><td style="padding:8px 0;">${urgenceLabel[company.urgency] || company.urgency || '—'}</td></tr>
          ${company.message ? `<tr><td style="padding:8px 0;color:#666;vertical-align:top;">Message</td><td style="padding:8px 0;">${company.message}</td></tr>` : ''}
        </table>
        <div style="margin-top:20px;">
          <a href="${ADMIN_URL}" style="background:#1a5233;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;">Voir dans l'admin →</a>
        </div>
      </div>
    </div>`;
  return sendNotification(subject, html);
}

module.exports = { notifyNewCandidate, notifyNewCompany };