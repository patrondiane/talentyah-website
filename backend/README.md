# Talentyah — Backend API

Backend Node.js + SQLite pour le site Talentyah.

## Stack technique
- **Runtime** : Node.js 18+
- **Framework** : Express.js
- **Base de donnees** : SQLite (fichier local `talentyah.db`)
- **Auth** : JWT (JSON Web Token)
- **Upload** : Multer (CVs candidats)

---

## Installation

```bash
# 1. Aller dans le dossier backend
cd backend

# 2. Installer les dependances
npm install

# 3. Copier et configurer les variables d'environnement
cp .env.example .env
# Editer .env et changer les valeurs

# 4. Demarrer le serveur
npm start
# ou en mode dev avec rechargement auto :
npm run dev
```

Le serveur demarre sur **http://localhost:4000**

---

## Variables d'environnement (.env)

| Variable        | Description                          | Defaut              |
|-----------------|--------------------------------------|---------------------|
| `PORT`          | Port du serveur                      | `4000`              |
| `JWT_SECRET`    | Cle secrete JWT (a changer !)        | `dev_secret`        |
| `ADMIN_EMAIL`   | Email admin initial                  | `admin@talentyah.com` |
| `ADMIN_PASSWORD`| Mot de passe admin initial           | `admin`             |

**IMPORTANT** : Changer `JWT_SECRET` et `ADMIN_PASSWORD` en production.

---

## Routes API

### Auth
| Methode | Route              | Acces  | Description         |
|---------|--------------------|--------|---------------------|
| POST    | /api/admin/login   | Public | Connexion admin     |

### Candidatures
| Methode | Route                  | Acces  | Description                        |
|---------|------------------------|--------|------------------------------------|
| POST    | /api/candidates        | Public | Deposer une candidature (avec CV)  |
| GET     | /api/candidates        | Admin  | Lister toutes les candidatures     |
| GET     | /api/candidates?country=Senegal | Admin | Filtrer par pays |
| GET     | /api/candidates?sector=Finance  | Admin | Filtrer par fonction |
| DELETE  | /api/candidates/:id    | Admin  | Supprimer une candidature          |

### Entreprises
| Methode | Route                   | Acces  | Description                    |
|---------|-------------------------|--------|--------------------------------|
| POST    | /api/companies          | Public | Deposer une demande recrutement|
| GET     | /api/companies          | Admin  | Lister toutes les demandes     |
| GET     | /api/companies?country=Dakar   | Admin | Filtrer par pays/region |
| GET     | /api/companies?urgency=elevee  | Admin | Filtrer par urgence |
| DELETE  | /api/companies/:id      | Admin  | Supprimer une demande          |

### Offres d'emploi
| Methode | Route           | Acces  | Description              |
|---------|-----------------|--------|--------------------------|
| GET     | /api/jobs       | Public | Lister les offres actives|
| POST    | /api/jobs       | Admin  | Creer une offre          |
| PATCH   | /api/jobs/:id   | Admin  | Activer / Desactiver     |
| DELETE  | /api/jobs/:id   | Admin  | Supprimer une offre      |

### Articles / Blog
| Methode | Route                    | Acces  | Description                  |
|---------|--------------------------|--------|------------------------------|
| GET     | /api/articles            | Public | Lister les articles publies  |
| GET     | /api/articles/:id        | Public | Detail d'un article          |
| GET     | /api/articles/admin/all  | Admin  | Tous les articles (admin)    |
| POST    | /api/articles            | Admin  | Creer un article             |
| PUT     | /api/articles/:id        | Admin  | Modifier un article          |
| DELETE  | /api/articles/:id        | Admin  | Supprimer un article         |

---

## Requetes admin (JWT)

Toutes les routes admin necessitent le header :
```
Authorization: Bearer <token>
```

Le token est retourne au login et dure 8h.

---

## Deploiement en production

### Option 1 : VPS (Hetzner, OVH, DigitalOcean...)
```bash
# Installer Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Cloner / copier le projet
cd /var/www/talentyah/backend
npm install --production

# Lancer avec PM2 (gestionnaire de processus)
npm install -g pm2
pm2 start server.js --name talentyah-api
pm2 save
pm2 startup
```

### Option 2 : Railway / Render (gratuit)
1. Pousser le dossier `backend` sur GitHub
2. Creer un nouveau service sur railway.app ou render.com
3. Ajouter les variables d'environnement dans l'interface
4. Mettre a jour `const API = 'https://votre-url.railway.app'` dans admin.js et carrieres.js

### Option 3 : Heroku
```bash
cd backend
heroku create talentyah-api
heroku config:set JWT_SECRET=votre_secret_fort
heroku config:set ADMIN_EMAIL=admin@talentyah.com
heroku config:set ADMIN_PASSWORD=motdepasse_fort
git push heroku main
```

---

## Structure des fichiers

```
backend/
├── server.js          ← Point d'entree
├── db.js              ← SQLite + creation des tables
├── .env               ← Variables d'environnement (a creer)
├── .env.example       ← Modele
├── package.json
├── talentyah.db       ← Base de donnees (cree automatiquement)
├── uploads/           ← CVs deposes (cree automatiquement)
├── routes/
│   ├── auth.js        ← Login admin
│   ├── candidates.js  ← Candidatures talents
│   ├── companies.js   ← Demandes entreprises
│   ├── jobs.js        ← Offres d'emploi
│   └── articles.js    ← Articles blog
└── middleware/
    └── auth.js        ← Verification JWT
```
