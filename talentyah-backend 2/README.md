# Talentyah Backend API

API REST pour le cabinet de recrutement Talentyah.  
Stack : **Node.js + Express + SQLite + Multer**

---

## 🚀 Lancer en local

```bash
# 1. Installer les dépendances
npm install

# 2. Copier le fichier d'environnement
cp .env.example .env

# 3. Démarrer le serveur
npm run dev        # avec rechargement auto
# ou
npm start
```

Le serveur tourne sur **http://localhost:3000**

---

## 📡 Endpoints

### Santé
| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/api/health` | Vérifier que l'API tourne |

### Candidats
| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/api/candidates` | Liste des candidats (paginée, filtrable) |
| GET | `/api/candidates/stats` | Stats du dashboard |
| GET | `/api/candidates/:id` | Fiche d'un candidat |
| POST | `/api/candidates` | Créer un candidat (+ upload CV) |
| PATCH | `/api/candidates/:id` | Modifier un candidat |
| PATCH | `/api/candidates/:id/status` | Changer le statut |
| DELETE | `/api/candidates/:id` | Supprimer un candidat |
| GET | `/api/candidates/:id/cv` | Télécharger le CV |

---

## 🔍 Paramètres de filtre (GET /api/candidates)

```
?status=nouveau        # nouveau | en_cours | validé | refusé
?search=Marie          # recherche dans nom, prénom, email, poste
?page=1&limit=20       # pagination
```

---

## 📝 Créer un candidat (POST)

Envoyer en **multipart/form-data** :

```
first_name  (obligatoire)
last_name   (obligatoire)
email       (obligatoire)
phone
position    (poste visé)
notes
cv          (fichier PDF / DOC / DOCX — max 5 Mo)
```

---

## 📊 Réponse stats (GET /api/candidates/stats)

```json
{
  "total": 42,
  "byStatus": [
    { "status": "nouveau", "count": 10 },
    { "status": "en_cours", "count": 18 },
    { "status": "validé", "count": 9 },
    { "status": "refusé", "count": 5 }
  ],
  "thisMonth": 12
}
```

---

## 🌐 Connecter depuis ton front (HTML/JS)

```javascript
const API = "http://localhost:3000"; // remplace par l'URL Render en prod

// Récupérer tous les candidats
const res = await fetch(`${API}/api/candidates`);
const { data } = await res.json();

// Ajouter un candidat avec CV
const formData = new FormData();
formData.append("first_name", "Jean");
formData.append("last_name", "Dupont");
formData.append("email", "jean@dupont.fr");
formData.append("position", "Développeur Full Stack");
formData.append("cv", fileInput.files[0]);

await fetch(`${API}/api/candidates`, { method: "POST", body: formData });

// Changer le statut
await fetch(`${API}/api/candidates/1/status`, {
  method: "PATCH",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ status: "validé" })
});

// Télécharger le CV
window.open(`${API}/api/candidates/1/cv`);
```

---

## ☁️ Déploiement sur Render

1. Push ce dossier sur GitHub
2. Sur [render.com](https://render.com) → **New Web Service** → connecte ton repo
3. Build command : `npm install`
4. Start command : `npm start`
5. Ajoute les variables d'environnement :
   - `NODE_ENV` = `production`
   - `FRONTEND_URL` = l'URL de ton front (ex: `https://talentyah.netlify.app`)
6. Active un **Disk** (Render > Disks) monté sur `/opt/render/project/src/uploads` pour persister les CV

---

## Statuts disponibles

| Statut | Description |
|--------|-------------|
| `nouveau` | Candidature reçue (défaut) |
| `en_cours` | En cours de traitement |
| `validé` | Candidat retenu |
| `refusé` | Candidature refusée |
