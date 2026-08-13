require('dotenv').config();
const db = require('./db.js');

const slides = [
  {
    image_url: 'images/carousel/1.png',
    eyebrow: 'Cabinet de recrutement et accompagnement',
    title: "Des talents d'exception pour des entreprises ambitieuses.",
    subtitle: 'Nous connectons les entreprises africaines et internationales aux talents africains, issus de la diaspora ou en mobilité intra-africaine.',
    cta1_text: 'Je recrute →',
    cta1_url: 'entreprises.html',
    cta2_text: 'Je cherche une opportunité →',
    cta2_url: 'talents.html',
    pages: 'all',
    sort_order: 1
  },
  {
    image_url: 'images/carousel/2.png',
    eyebrow: 'Recrutement stratégique',
    title: 'Identifiez les leaders de demain en Afrique.',
    subtitle: 'Nos experts sourcent, évaluent et accompagnent les meilleurs profils, des cadres locaux aux talents de la diaspora, pour bâtir vos équipes durables.',
    cta1_text: 'Notre approche →',
    cta1_url: 'notre-approche.html',
    cta2_text: 'Confier un recrutement →',
    cta2_url: 'entreprises.html',
    pages: 'all',
    sort_order: 2
  },
  {
    image_url: 'images/carousel/3.png',
    eyebrow: 'Mobilité internationale',
    title: 'Votre carrière mérite les meilleures opportunités.',
    subtitle: 'Coaching, préparation aux entretiens, mobilité internationale : un accompagnement de bout en bout pour concrétiser votre prochain défi professionnel.',
    cta1_text: 'Être accompagné(e) →',
    cta1_url: 'talents.html',
    cta2_text: 'Voir les offres →',
    cta2_url: 'carrieres.html',
    pages: 'all',
    sort_order: 3
  },
  {
    image_url: 'images/carousel/17.png',
    eyebrow: '15+ pays couverts',
    title: "Un réseau tourné vers l'Afrique et vos besoins à votre service.",
    subtitle: "De Dakar à Nairobi, d'Abidjan à Paris — Talentyah intervient là où se trouvent les talents et les opportunités, sans frontières.",
    cta1_text: 'À propos de nous →',
    cta1_url: 'apropos.html',
    cta2_text: 'Nos insights →',
    cta2_url: 'ressources.html',
    pages: 'all',
    sort_order: 4
  }
];

db.init().then(async () => {
  console.log('Seeding carousel...');
  for (const s of slides) {
    await db.run(
      `INSERT INTO carousel_slides (image_url, eyebrow, title, subtitle, cta1_text, cta1_url, cta2_text, cta2_url, pages, sort_order, active)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [s.image_url, s.eyebrow, s.title, s.subtitle, s.cta1_text, s.cta1_url, s.cta2_text, s.cta2_url, s.pages, s.sort_order, 1]
    );
  }
  console.log('Done!');
}).catch(console.error);
