# Talentyah Website

Plateforme dédiée au recrutement et à l'accompagnement de carrière en Afrique et à l'international.

## 🚀 Installation locale
1. Cloner le dépôt : `git clone https://github.com/patrondiane/talentyah-website.git`
2. Installer les dépendances :
   - `cd talent-backend-2`
   - `npm install`
3. Créer un fichier `.env` dans `talent-backend-2` avec :
   - `DB_URL` (Turso)
   - `CLOUDINARY_URL`
   - `PORT=3000`
4. Démarrer le serveur : `npm start`

## 🛠 Architecture
- **Frontend** : Architecture modulaire (fichiers HTML/CSS/JS par page).
- **Backend** : Node.js/Express (gestion API et base Turso).
- **Médias** : Cloudinary (hébergement dynamique).
- **Déploiement** : Automatisé via Render (branche `main`).

## 📋 Maintenance
- **Blog** : Édition via le dashboard (`admin.html`) utilisant Quill.js pour le texte riche.
- **Ajout de fonctionnalité** : Respecter le pattern `[nom].html`, `[nom].css`, et `[nom].js`.