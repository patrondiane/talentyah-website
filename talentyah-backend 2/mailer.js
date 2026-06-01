// mailer.js — Envoi d'emails de notification
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host:   process.env.SMTP_HOST || 'smtp.gmail.com',
  port:   Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
  },
});

const FROM        = process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@talentyah.com';
const NOTIFY_TO   = process.env.NOTIFY_EMAIL || process.env.SMTP_USER || '';
const ADMIN_URL   = process.env.ADMIN_URL || 'https://talentyah.com/admin.html';  // ← plus de localhost

async function sendNotification(subject, html) {
  if (!NOTIFY_TO || !process.env.SMTP_USER) return;
  try {
    await transporter.sendMail({ from: FROM, to: NOTIFY_TO, subject, html });
    console.log(`[MAIL] Envoyé : ${subject}`);
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