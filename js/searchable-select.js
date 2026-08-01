// js/searchable-select.js

const COUNTRIES = [
  "Afghanistan", "Afrique du Sud", "Albanie", "Algérie", "Allemagne", "Andorre", "Angola", "Antigua-et-Barbuda", 
  "Arabie Saoudite", "Argentine", "Arménie", "Australie", "Autriche", "Azerbaïdjan", "Bahamas", "Bahreïn", 
  "Bangladesh", "Barbade", "Belgique", "Belize", "Bénin", "Bhoutan", "Biélorussie", "Birmanie", "Bolivie", 
  "Bosnie-Herzégovine", "Botswana", "Brésil", "Brunei", "Bulgarie", "Burkina Faso", "Burundi", "Cambodge", 
  "Cameroun", "Canada", "Cap-Vert", "Chili", "Chine", "Chypre", "Colombie", "Comores", "Congo-Brazzaville", 
  "Congo-Kinshasa", "Corée du Nord", "Corée du Sud", "Costa Rica", "Côte d'Ivoire", "Croatie", "Cuba", 
  "Danemark", "Djibouti", "Dominique", "Égypte", "Émirats Arabes Unis", "Équateur", "Érythrée", "Espagne", 
  "Estonie", "États-Unis", "Éthiopie", "Fidji", "Finlande", "France", "Gabon", "Gambie", "Géorgie", "Ghana", 
  "Grèce", "Grenade", "Guatemala", "Guinée", "Guinée-Bissau", "Guinée Équatoriale", "Guyana", "Haïti", 
  "Honduras", "Hongrie", "Inde", "Indonésie", "Irak", "Iran", "Irlande", "Islande", "Israël", "Italie", 
  "Jamaïque", "Japon", "Jordanie", "Kazakhstan", "Kenya", "Kirghizistan", "Kiribati", "Koweït", "Laos", 
  "Lesotho", "Lettonie", "Liban", "Libéria", "Libye", "Liechtenstein", "Lituanie", "Luxembourg", 
  "Macédoine du Nord", "Madagascar", "Malaisie", "Malawi", "Maldives", "Mali", "Malte", "Maroc", "Maurice", 
  "Mauritanie", "Mexique", "Micronésie", "Moldavie", "Monaco", "Mongolie", "Monténégro", "Mozambique", 
  "Namibie", "Nauru", "Népal", "Nicaragua", "Niger", "Nigeria", "Norvège", "Nouvelle-Zélande", "Oman", 
  "Ouganda", "Ouzbékistan", "Pakistan", "Palaos", "Palestine", "Panama", "Papouasie-Nouvelle-Guinée", 
  "Paraguay", "Pays-Bas", "Pérou", "Philippines", "Pologne", "Portugal", "Qatar", "République Centrafricaine", 
  "République Dominicaine", "Roumanie", "Royaume-Uni", "Russie", "Rwanda", "Saint-Christophe-et-Niévès", 
  "Sainte-Lucie", "Saint-Marin", "Saint-Vincent-et-les-Grenadines", "Salomon", "Samoa", "Sao Tomé-et-Principe", 
  "Sénégal", "Serbie", "Seychelles", "Sierra Leone", "Singapour", "Slovaquie", "Slovénie", "Somalie", 
  "Soudan", "Soudan du Sud", "Sri Lanka", "Suède", "Suisse", "Suriname", "Eswatini", "Syrie", "Tadjikistan", 
  "Taïwan", "Tanzanie", "Tchad", "Tchéquie", "Thaïlande", "Timor oriental", "Togo", "Tonga", "Trinité-et-Tobago", 
  "Tunisie", "Turkménistan", "Turquie", "Tuvalu", "Ukraine", "Uruguay", "Vanuatu", "Vatican", "Venezuela", 
  "Viêt Nam", "Yémen", "Zambie", "Zimbabwe"
];

function initSearchableSelects() {
  const containers = document.querySelectorAll('.searchable-select-placeholder');
  
  containers.forEach(container => {
    const inputName = container.dataset.name || 'country';
    const isRequired = container.hasAttribute('required') || container.dataset.required === 'true';
    const inputId = container.dataset.id || 'country';
    const placeholder = container.dataset.placeholder || 'Sélectionnez votre pays';
    
    // Build markup
    container.innerHTML = `
      <div class="searchable-select">
        <div class="searchable-select-trigger">
          <span class="searchable-select-value">${placeholder}</span>
          <span class="searchable-select-arrow"><i data-lucide="chevron-down" style="width:16px;height:16px;"></i></span>
        </div>
        <div class="searchable-select-dropdown">
          <div class="searchable-select-search-wrap">
            <input type="text" class="searchable-select-search" placeholder="Rechercher un pays...">
          </div>
          <ul class="searchable-select-options">
            ${COUNTRIES.map(country => `
              <li class="searchable-select-option" data-value="${country}">${country}</li>
            `).join('')}
            <li class="searchable-select-no-results">Aucun pays trouvé</li>
          </ul>
        </div>
        <input type="hidden" name="${inputName}" id="${inputId}" ${isRequired ? 'required' : ''}>
      </div>
    `;

    setTimeout(() => { if (typeof lucide !== 'undefined') lucide.createIcons(); }, 10);
    const selectEl = container.querySelector('.searchable-select');
    const trigger = container.querySelector('.searchable-select-trigger');
    const dropdown = container.querySelector('.searchable-select-dropdown');
    const searchInput = container.querySelector('.searchable-select-search');
    const options = container.querySelectorAll('.searchable-select-option');
    const noResults = container.querySelector('.searchable-select-no-results');
    const hiddenInput = container.querySelector('input[type="hidden"]');
    const displayValue = container.querySelector('.searchable-select-value');

    // Toggle dropdown
    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      
      // Close other open searchable selects first
      document.querySelectorAll('.searchable-select.is-open').forEach(openSelect => {
        if (openSelect !== selectEl) {
          openSelect.classList.remove('is-open');
        }
      });

      selectEl.classList.toggle('is-open');
      if (selectEl.classList.contains('is-open')) {
        searchInput.value = '';
        options.forEach(opt => opt.classList.remove('is-hidden'));
        noResults.style.display = 'none';
        setTimeout(() => searchInput.focus(), 50);
      }
    });

    // Search filter
    searchInput.addEventListener('input', () => {
      const query = searchInput.value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      let matches = 0;

      options.forEach(opt => {
        const text = opt.textContent.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        if (text.includes(query)) {
          opt.classList.remove('is-hidden');
          matches++;
        } else {
          opt.classList.add('is-hidden');
        }
      });

      noResults.style.display = matches === 0 ? 'block' : 'none';
    });

    // Prevent closing dropdown when clicking inside search input wrap
    container.querySelector('.searchable-select-search-wrap').addEventListener('click', (e) => {
      e.stopPropagation();
    });

    // Select option
    options.forEach(opt => {
      opt.addEventListener('click', (e) => {
        e.stopPropagation();
        
        options.forEach(o => o.classList.remove('is-selected'));
        opt.classList.add('is-selected');
        
        const value = opt.dataset.value;
        hiddenInput.value = value;
        displayValue.textContent = value;
        
        // Trigger change event on hidden input for form validations
        hiddenInput.dispatchEvent(new Event('change', { bubbles: true }));
        
        selectEl.classList.remove('is-open');
      });
    });
  });

  // Global click to close dropdowns
  document.addEventListener('click', () => {
    document.querySelectorAll('.searchable-select.is-open').forEach(openSelect => {
      openSelect.classList.remove('is-open');
    });
  });
}

// Automatically init on DOMContentLoaded
document.addEventListener('DOMContentLoaded', initSearchableSelects);
