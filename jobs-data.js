// jobs-data.js — Source unique des offres
const JOBS_DATA = [
  {
    id: 1,
    title: 'Responsable Administratif et Financier',
    city: 'Dakar', country: 'Sénégal',
    contract_type: 'CDI', sector: 'Finance',
    salary: '2 500 – 3 500 EUR / mois',
    description: 'Pilotage financier, structuration des process et accompagnement de la direction au sein d\'une PME en forte croissance.',
    tags: ['Finance', 'Gestion', 'Management'],
    is_new: true
  },
  {
    id: 2,
    title: 'Chargé(e) des Ressources Humaines',
    city: 'Abidjan', country: 'Côte d\'Ivoire',
    contract_type: 'CDD', sector: 'RH',
    salary: '1 200 – 1 800 EUR / mois',
    description: 'Recrutement opérationnel, onboarding, suivi administratif RH et appui au développement des talents.',
    tags: ['RH', 'Recrutement'],
    is_new: false
  },
  {
    id: 3,
    title: 'Business Analyst – Data & Reporting',
    city: 'Nairobi', country: 'Kenya',
    contract_type: 'Freelance', sector: 'Tech',
    salary: '250 – 350 EUR / jour',
    description: 'Mission data / reporting : cadrage des besoins métier, création de dashboards et amélioration de la qualité des données.',
    tags: ['Data', 'Analyse', 'Reporting'],
    is_new: true
  },
  {
    id: 4,
    title: 'Directeur Commercial Afrique de l\'Ouest',
    city: 'Abidjan', country: 'Côte d\'Ivoire',
    contract_type: 'CDI', sector: 'Commerce',
    salary: '4 000 – 5 500 EUR / mois',
    description: 'Développement du portefeuille clients B2B, management d\'une équipe commerciale et définition de la stratégie de croissance.',
    tags: ['Commercial', 'Management', 'Stratégie'],
    is_new: false
  },
  {
    id: 5,
    title: 'Chef de Projet Digital',
    city: 'Casablanca', country: 'Maroc',
    contract_type: 'CDI', sector: 'Tech',
    salary: '2 000 – 2 800 EUR / mois',
    description: 'Pilotage de projets de transformation digitale, coordination des équipes techniques et métier, suivi des KPIs.',
    tags: ['Digital', 'Gestion de projet'],
    is_new: true
  },
  {
    id: 6,
    title: 'Responsable Marketing & Communication',
    city: 'Paris', country: 'France',
    contract_type: 'CDI', sector: 'Marketing',
    salary: '3 000 – 3 800 EUR / mois',
    description: 'Stratégie de marque, gestion des réseaux sociaux, production de contenus et coordination des campagnes pour un acteur panafricain.',
    tags: ['Marketing', 'Communication', 'Branding'],
    is_new: false
  }
];

document.addEventListener('DOMContentLoaded', () => {
      const preview = document.getElementById('jobsPreview');
      if (!preview || typeof JOBS_DATA === 'undefined') return;

      preview.innerHTML = JOBS_DATA.slice(0, 3).map(job => `
        <article class="job-preview-card reveal">
          <div class="job-preview-top">
            <span class="job-preview-location">${job.city}, ${job.country}</span>
            <span class="job-preview-type">${job.contract_type}</span>
          </div>
          <h3 class="job-preview-title">${job.title}</h3>
          <p class="job-preview-desc">${job.description}</p>
          <div class="job-preview-footer">
            <span class="job-preview-salary">${job.salary}</span>
            <a href="offre.html?id=${job.id}" class="job-preview-link">Voir l'offre &#8594;</a>
          </div>
        </article>
      `).join('');
    });