/* =====================================================
   test.js — Verifie que toutes les routes marchent
   Usage : node test.js
   (lancer apres npm start dans un autre terminal)
===================================================== */

const BASE = 'http://localhost:4000';
let TOKEN  = null;
let errors = 0;

/* expectStatus : code HTTP attendu (defaut: 200-299)
   Si on attend un 401, un 401 retourne ✅          */
async function req(method, path, body, auth, expectStatus) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth && TOKEN) headers['Authorization'] = 'Bearer ' + TOKEN;
  const res = await fetch(BASE + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));

  let ok;
  if (expectStatus) {
    ok = res.status === expectStatus;
  } else {
    ok = res.ok && json.ok !== false;
  }

  const icon = ok ? '✅' : '❌';
  console.log(`${icon} ${method.padEnd(6)} ${path.padEnd(35)} ${res.status}  ${ok ? '' : JSON.stringify(json)}`);
  if (!ok) errors++;
  return json;
}

(async () => {
  console.log('\n🔍 Tests Talentyah API\n');

  // Ping
  await req('GET', '/api/ping');

  // Login admin
  const login = await req('POST', '/api/admin/login', {
    email: process.env.ADMIN_EMAIL || 'admin@talentyah.com',
    password: process.env.ADMIN_PASSWORD || 'admin',
  });
  TOKEN = login.token;
  if (!TOKEN) { console.log('\n❌ Login echoue — arret des tests admin.\n'); process.exit(1); }

  // Mauvais login (401 attendu = normal, c'est un test de securite)
  await req('POST', '/api/admin/login', { email: 'x@x.com', password: 'faux' }, false, 401);

  // Candidatures
  await req('GET', '/api/candidates', null, true);
  await req('GET', '/api/candidates?country=Senegal', null, true);
  await req('GET', '/api/candidates?sector=Finance', null, true);

  // Entreprises
  await req('GET', '/api/companies', null, true);
  await req('GET', '/api/companies?country=Dakar', null, true);
  await req('GET', '/api/companies?urgency=elevee', null, true);

  // Offres
  await req('GET', '/api/jobs');
  const job = await req('POST', '/api/jobs', {
    title: 'Test — RAF Dakar', country: 'Senegal', city: 'Dakar',
    sector: 'Finance', contract_type: 'CDI', salary: '3000 EUR',
    description: 'Poste de test', tags: ['Finance', 'Gestion'],
  }, true);
  if (job.id) {
    await req('PATCH', `/api/jobs/${job.id}`, { active: false }, true);
    await req('DELETE', `/api/jobs/${job.id}`, null, true);
  }

  // Articles
  await req('GET', '/api/articles');
  await req('GET', '/api/articles/admin/all', null, true);
  const art = await req('POST', '/api/articles', {
    title: 'Test article', category: 'Recrutement',
    excerpt: 'Un extrait de test.', content: 'Contenu complet.',
    published: true,
  }, true);
  if (art.id) {
    await req('GET', `/api/articles/${art.id}`);
    await req('PUT', `/api/articles/${art.id}`, {
      title: 'Test article (modifie)', category: 'Recrutement',
      excerpt: 'Extrait modifie.', content: 'Contenu modifie.',
      published: true,
    }, true);
    await req('DELETE', `/api/articles/${art.id}`, null, true);
  }

  // Contact
  await req('GET', '/api/contact', null, true);

  // Acces sans token (401 attendu = normal, securite ok)
  await req('GET', '/api/candidates', null, false, 401);

  console.log(`\n${ errors === 0 ? '🎉 Tous les tests sont passes !' : `⚠️  ${errors} test(s) echoue(s).` }\n`);
  process.exit(errors > 0 ? 1 : 0);
})();