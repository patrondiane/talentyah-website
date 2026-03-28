/* =====================================================
   TALENTYAH — offre.js
   Gestion dynamique de l'affichage et postulation
===================================================== */

document.addEventListener('DOMContentLoaded', () => {
    
    // 1. Récupération de l'ID dans l'URL (ex: offre.html?id=12)
    const params = new URLSearchParams(window.location.search);
    const jobId = parseInt(params.get('id'), 10);

    // 2. Recherche du job dans JOBS_DATA (chargé via jobs-data.js)
    const job = (typeof JOBS_DATA !== 'undefined') ? JOBS_DATA.find(j => j.id === jobId) : null;

    if (job) {
        renderJobDetails(job);
    } else {
        showError();
    }

    // 3. Gestion du label de fichier (Input CV)
    const fileInput = document.getElementById('cv_upload');
    const fileLabel = document.getElementById('fileLabel');
    if (fileInput && fileLabel) {
        fileInput.addEventListener('change', () => {
            const fileName = fileInput.files[0]?.name;
            fileLabel.textContent = fileName ? `✓ ${fileName}` : 'Cliquez pour ajouter votre CV';
            if (fileName) fileLabel.parentElement.classList.add('has-file');
        });
    }

    // 4. Envoi du formulaire
    const form = document.getElementById('offreForm');
    if (form) {
        form.addEventListener('submit', handleFormSubmit);
    }
});

/**
 * Remplit la page avec les données du job
 */
function renderJobDetails(job) {
    document.title = `${job.title} - Talentyah`;
    document.getElementById('jobTitle').textContent = job.title;
    document.getElementById('jobSector').textContent = job.sector;
    document.getElementById('jobLocation').textContent = `${job.city}, ${job.country}`;
    document.getElementById('jobContract').textContent = job.contract_type;
    document.getElementById('offreDescription').textContent = job.description;
    document.getElementById('hiddenJobId').value = job.id;

    // Ajout dynamique du profil recherché (si disponible dans tes données)
    const profilList = document.getElementById('profilList');
    if (profilList && job.requirements) {
        job.requirements.forEach(req => {
            const li = document.createElement('li');
            li.textContent = req;
            profilList.appendChild(li);
        });
    }
}

/**
 * Gère l'envoi API
 */
async function handleFormSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const btn = form.querySelector('.btn-submit');
    const successBox = document.getElementById('offreSuccess');

    btn.textContent = 'Envoi en cours...';
    btn.disabled = true;

    try {
        const formData = new FormData(form);
        
        // Appel à ton utilitaire apiFetch défini dans api.js
        await window.apiFetch('/applications', {
            method: 'POST',
            body: formData
        });

        form.style.opacity = '0.3';
        form.style.pointerEvents = 'none';
        successBox.style.display = 'block';
        btn.textContent = 'Candidature envoyée !';

    } catch (err) {
        console.error("Erreur soumission:", err);
        alert("Une erreur est survenue. Veuillez réessayer.");
        btn.disabled = false;
        btn.textContent = 'Réessayer';
    }
}

function showError() {
    const container = document.querySelector('.offre-grid');
    if (container) {
        container.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 100px 0;">
            <h2 class="section-title">Offre introuvable</h2>
            <p>Ce poste n'est plus disponible ou le lien est incorrect.</p>
            <a href="carrieres.html" class="btn-gold" style="margin-top:20px; display:inline-block;">Voir les offres</a>
        </div>`;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // 1. On récupère l'ID depuis l'URL (?id=X)
    const params = new URLSearchParams(window.location.search);
    const jobId = parseInt(params.get('id'), 10);

    // 2. On cherche l'offre correspondante dans JOBS_DATA
    // (Assure-toi que jobs-data.js est bien appelé AVANT offre.js dans ton HTML)
    const job = JOBS_DATA.find(item => item.id === jobId);

    if (job) {
        // 3. On remplit les éléments de la page
        document.getElementById('jobTitle').textContent = job.title;
        document.getElementById('jobSector').textContent = job.sector;
        document.getElementById('jobLocation').textContent = `${job.city}, ${job.country}`;
        document.getElementById('jobContract').textContent = job.contract_type;
        document.getElementById('offreDescription').textContent = job.description;
        
        // On remplit aussi le champ caché du formulaire pour savoir quel poste est postulé
        const hiddenInput = document.getElementById('hiddenJobId');
        if (hiddenInput) hiddenInput.value = job.id;
        
    } else {
        // Si l'ID n'existe pas ou est erroné
        document.body.innerHTML = "<h1>Offre introuvable</h1><a href='index.html'>Retour à l'accueil</a>";
    }
});