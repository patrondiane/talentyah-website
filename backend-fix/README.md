# Talentyah — Backend API

## Installation (5 minutes)

```bash
# 1. Aller dans le dossier backend
cd backend

# 2. Installer les dependances Node
npm install

# 3. Creer le fichier de configuration
cp .env.example .env
```

Ouvrir `.env` et changer les valeurs si besoin :
```
PORT=4000
JWT_SECRET=mettez_une_cle_longue_et_aleatoire_ici
ADMIN_EMAIL=admin@talentyah.com
ADMIN_PASSWORD=admin
```

```bash
# 4. Demarrer le serveur
npm start
```

Vous devriez voir :
```
╔══════════════════════════════════════════════════╗
║   Talentyah API — http://localhost:4000          ║
╚══════════════════════════════════════════════════╝
[DB] Admin cree : admin@talentyah.com
```

---

## Tester que tout marche

Dans un second terminal (le serveur doit tourner) :
```bash
node test.js
```

Vous devriez voir tous les ✅.

---

## Structure du projet

```
backend/
├── server.js          ← Point d'entree
├── db.js              ← Base SQLite (tables + admin par defaut)
├── .env               ← Configuration locale (a creer depuis .env.example)
├── .env.example       ← Modele de configuration
├── package.json
├── test.js            ← Script de test des routes
├── talentyah.db       ← Base de donnees SQLite (cree auto au 1er demarrage)
├── uploads/           ← CVs reçus (cree auto)
├── routes/
│   ├── auth.js        ← POST /api/admin/login
│   ├── candidates.js  ← Candidatures talents
│   ├── companies.js   ← Demandes entreprises
│   ├── jobs.js        ← Offres d'emploi
│   ├── articles.js    ← Articles / Blog
│   └── contact.js     ← Formulaire contact
└── middleware/
    └── auth.js        ← Verification JWT
```

---

## Toutes les routes

### Public (sans token)
| Methode | Route              | Description                    |
|---------|--------------------|--------------------------------|
| GET     | /api/ping          | Sante du serveur               |
| POST    | /api/admin/login   | Connexion admin → token JWT    |
| POST    | /api/candidates    | Deposer une candidature (+CV)  |
| POST    | /api/companies     | Deposer une demande recrutement|
| GET     | /api/jobs          | Lister les offres actives      |
| GET     | /api/articles      | Lister les articles publies    |
| GET     | /api/articles/:id  | Detail d'un article            |
| POST    | /api/contact       | Envoyer un message contact     |

### Admin (token Bearer requis)
| Methode | Route                    | Description                       |
|---------|--------------------------|-----------------------------------|
| GET     | /api/candidates          | Toutes les candidatures           |
| GET     | /api/candidates?country= | Filtrer par pays                  |
| GET     | /api/candidates?sector=  | Filtrer par fonction              |
| DELETE  | /api/candidates/:id      | Supprimer une candidature         |
| GET     | /api/companies           | Toutes les demandes entreprises   |
| GET     | /api/companies?country=  | Filtrer par pays/region           |
| GET     | /api/companies?urgency=  | Filtrer par urgence               |
| DELETE  | /api/companies/:id       | Supprimer une demande             |
| POST    | /api/jobs                | Publier une offre                 |
| PATCH   | /api/jobs/:id            | Activer/desactiver une offre      |
| DELETE  | /api/jobs/:id            | Supprimer une offre               |
| GET     | /api/articles/admin/all  | Tous les articles (dont brouillons)|
| POST    | /api/articles            | Creer un article                  |
| PUT     | /api/articles/:id        | Modifier un article               |
| DELETE  | /api/articles/:id        | Supprimer un article              |
| GET     | /api/contact             | Lister les messages contact       |
| DELETE  | /api/contact/:id         | Supprimer un message              |

---

## Problemes courants

**"Cannot connect" / le site ne reçoit pas les formulaires**
→ Verifier que le serveur tourne : `npm start` dans le dossier `backend/`
→ Ouvrir http://localhost:4000/api/ping dans votre navigateur — vous devez voir `{"ok":true}`

**"CORS error" dans la console du navigateur**
→ Vous ouvrez le fichier HTML directement (URL `file://...`) — c'est normal en local, le backend accepte
→ Si vous utilisez un serveur local (Live Server, etc.) sur un port different de 4000, c'est aussi accepte

**"Module not found"**
→ Vous n'avez pas lance `npm install` dans le dossier `backend/`

**Le CV n'est pas envoye**
→ Verifier que le champ file dans talents.html a bien `name="cv"` — c'est le nom attendu par multer

**Mot de passe admin oublie**
→ Supprimer le fichier `talentyah.db` et redemarrer — l'admin sera recrée avec les valeurs du `.env`

---

## Deploiement en production

**Railway (recommande, gratuit)**
1. Deposer le dossier `backend/` sur GitHub
2. Creer un projet sur railway.app → "Deploy from GitHub"
3. Ajouter les variables d'environnement (PORT, JWT_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD)
4. Dans `admin.js` et `carrieres.js` du frontend, remplacer :
   `const API = 'http://localhost:4000'`
   par votre URL Railway : `const API = 'https://talentyah-api.railway.app'`

**Note SQLite en prod** : SQLite convient pour demarrer. Si le volume grandit, migrer vers PostgreSQL (Railway en propose un nativement).
