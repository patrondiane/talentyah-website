// seed_jobs.js — Seeding des 6 offres par défaut dans Supabase PostgreSQL
const db = require('./db');

const jobs = [
  {
    title: 'Responsable Administratif et Financier',
    city: 'Dakar', country: 'Sénégal',
    contract_type: 'CDI', sector: 'Finance',
    salary: '2 500 – 3 500 EUR / mois',
    description: 'Pilotage financier, structuration des process et accompagnement de la direction au sein d\'une PME en forte croissance.',
    requirements: 'Compétences recherchées : Finance, Gestion, Management.',
    tags: 'Finance, Gestion, Management',
    is_new: true,
    status: 'active'
  },
  {
    title: 'Chargé(e) des Ressources Humaines',
    city: 'Abidjan', country: 'Côte d\'Ivoire',
    contract_type: 'CDD', sector: 'RH',
    salary: '1 200 – 1 800 EUR / mois',
    description: 'Recrutement opérationnel, onboarding, suivi administratif RH et appui au développement des talents.',
    requirements: 'Compétences recherchées : RH, Recrutement.',
    tags: 'RH, Recrutement',
    is_new: false,
    status: 'active'
  },
  {
    title: 'Business Analyst – Data & Reporting',
    city: 'Nairobi', country: 'Kenya',
    contract_type: 'Freelance', sector: 'Tech',
    salary: '250 – 350 EUR / jour',
    description: 'Mission data / reporting : cadrage des besoins métier, création de dashboards et amélioration de la qualité des données.',
    requirements: 'Compétences recherchées : Data, Analyse, Reporting.',
    tags: 'Data, Analyse, Reporting',
    is_new: true,
    status: 'active'
  },
  {
    title: 'Directeur Commercial Afrique de l\'Ouest',
    city: 'Abidjan', country: 'Côte d\'Ivoire',
    contract_type: 'CDI', sector: 'Commercial',
    salary: '4 000 – 5 500 EUR / mois',
    description: 'Développement du portefeuille clients B2B, management d\'une équipe commerciale et définition de la stratégie de croissance.',
    requirements: 'Compétences recherchées : Commercial, Management, Stratégie.',
    tags: 'Commercial, Management, Stratégie',
    is_new: false,
    status: 'active'
  },
  {
    title: 'Chef de Projet Digital',
    city: 'Casablanca', country: 'Maroc',
    contract_type: 'CDI', sector: 'Tech',
    salary: '2 000 – 2 800 EUR / mois',
    description: 'Pilotage de projets de transformation digitale, coordination des équipes techniques et métier, suivi des KPIs.',
    requirements: 'Compétences recherchées : Digital, Gestion de projet.',
    tags: 'Digital, Gestion de projet',
    is_new: true,
    status: 'active'
  },
  {
    title: 'Responsable Marketing & Communication',
    city: 'Paris', country: 'France',
    contract_type: 'CDI', sector: 'Marketing',
    salary: '3 000 – 3 800 EUR / mois',
    description: 'Stratégie de marque, gestion des réseaux sociaux, production de contenus et coordination des campagnes pour un actor panafricain.',
    requirements: 'Compétences recherchées : Marketing, Communication, Branding.',
    tags: 'Marketing, Communication, Branding',
    is_new: false,
    status: 'active'
  }
];

async function seed() {
  await db.init();
  console.log('Vidage des offres existantes...');
  await db.run('DELETE FROM jobs WHERE id > 0');

  for (const job of jobs) {
    await db.run(
      `INSERT INTO jobs (title, city, country, contract_type, sector, salary, description, requirements, tags, is_new, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [job.title, job.city, job.country, job.contract_type, job.sector, job.salary, job.description, job.requirements, job.tags, job.is_new ? 1 : 0, job.status]
    );
    console.log(`Offre insérée : ${job.title}`);
  }
  console.log('Seeding terminé avec succès !');
  process.exit(0);
}

seed().catch(err => {
  console.error('Erreur lors du seeding :', err);
  process.exit(1);
});
