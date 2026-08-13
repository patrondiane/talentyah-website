require('dotenv').config();
const db = require('./db');
const { notifyNewCandidate } = require('./mailer');

async function main() {
  await db.init();
  console.log('--------------------------------------------------');
  console.log('Démarrage du test d\'envoi d\'e-mail de notification...');
  console.log('--------------------------------------------------');
  
  try {
    await notifyNewCandidate({
      first_name: 'Testeur',
      last_name: 'SMTP OVH',
      email: 'test-smtp@talentyah.com',
      phone: '0102030405',
      role_target: 'Développeur Test',
      sector: 'Informatique',
      country: 'France',
      experience_level: 'Senior',
      message: 'Félicitations ! Si vous recevez ce message, votre configuration SMTP OVH fonctionne parfaitement pour l\'envoi des alertes du site Talentyah.'
    });
    console.log('--------------------------------------------------');
    console.log('Test terminé. Veuillez vérifier la boîte mail configurée pour les alertes.');
    console.log('--------------------------------------------------');
  } catch (err) {
    console.error('Erreur d\'envoi de test:', err.message);
  }
}

main();
