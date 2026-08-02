// js/custom-select.js

function convertNativeSelects() {
  const selects = document.querySelectorAll('select');
  
  selects.forEach(select => {
    // Avoid double customization or Quill/system selects
    if (select.dataset.customized === 'true' || select.closest('.ql-container') || select.style.display === 'none' || select.classList.contains('ql-picker-options') || select.classList.contains('ql-header')) {
      return;
    }
    
    const hasSearch = select.dataset.search === 'true';
    const placeholder = select.getAttribute('placeholder') || (select.options[0]?.disabled ? select.options[0].text : 'Sélectionnez une option');
    
    // Hide native select
    select.style.display = 'none';
    select.dataset.customized = 'true';
    
    // Wrapper
    const wrapper = document.createElement('div');
    wrapper.className = 'searchable-select';
    
    // Find current active value
    let selectedText = placeholder;
    let selectedValue = select.value || '';
    
    // Check if the current value corresponds to a valid option
    const activeOpt = Array.from(select.options).find(o => o.value === selectedValue && !o.disabled);
    if (activeOpt) {
      selectedText = activeOpt.text;
    } else if (select.options[0] && !select.options[0].disabled) {
      selectedText = select.options[0].text;
      selectedValue = select.options[0].value;
    }
    
    const optionsMarkup = Array.from(select.options)
      .map(opt => {
        if (opt.disabled) return '';
        const isSel = opt.value === selectedValue;
        return `<li class="searchable-select-option${isSel ? ' is-selected' : ''}" data-value="${opt.value}">${opt.text}</li>`;
      })
      .join('');
      
    const allowNew = select.dataset.allowNew === 'true';
    wrapper.innerHTML = `
      <div class="searchable-select-trigger">
        <span class="searchable-select-value">${selectedText}</span>
        <span class="searchable-select-arrow"><i data-lucide="chevron-down" style="width:16px;height:16px;"></i></span>
      </div>
      <div class="searchable-select-dropdown">
        ${hasSearch ? `
        <div class="searchable-select-search-wrap">
          <input type="text" class="searchable-select-search" placeholder="Rechercher...">
        </div>` : ''}
        <ul class="searchable-select-options">
          ${optionsMarkup}
          <li class="searchable-select-no-results">Aucun résultat trouvé</li>
          ${allowNew ? `<li class="searchable-select-add-new" style="display:none; padding:10px 14px; color:var(--emerald); font-weight:600; cursor:pointer; border-top:1px dashed var(--border); font-size:13px; display:flex; align-items:center; gap:6px;"></li>` : ''}
        </ul>
      </div>
    `;
    
    select.parentNode.insertBefore(wrapper, select.nextSibling);
    
    const trigger = wrapper.querySelector('.searchable-select-trigger');
    const dropdown = wrapper.querySelector('.searchable-select-dropdown');
    const searchInput = wrapper.querySelector('.searchable-select-search');
    const options = wrapper.querySelectorAll('.searchable-select-option');
    const noResults = wrapper.querySelector('.searchable-select-no-results');
    const addNewBtn = wrapper.querySelector('.searchable-select-add-new');
    const displayValue = wrapper.querySelector('.searchable-select-value');
    
    if (addNewBtn) {
      addNewBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const val = addNewBtn.dataset.value;
        if (!val) return;
        
        // Add to native select
        const opt = document.createElement('option');
        opt.value = val;
        opt.textContent = val;
        select.appendChild(opt);
        select.value = val;
        
        // Add to custom options representation
        const li = document.createElement('li');
        li.className = 'searchable-select-option is-selected';
        li.dataset.value = val;
        li.textContent = val;
        
        // Remove selection from others
        wrapper.querySelectorAll('.searchable-select-option').forEach(o => o.classList.remove('is-selected'));
        
        const parent = wrapper.querySelector('.searchable-select-options');
        parent.insertBefore(li, noResults);
        
        displayValue.textContent = val;
        
        li.addEventListener('click', (ev) => {
          ev.stopPropagation();
          wrapper.querySelectorAll('.searchable-select-option').forEach(o => o.classList.remove('is-selected'));
          li.classList.add('is-selected');
          select.value = val;
          displayValue.textContent = val;
          select.dispatchEvent(new Event('change', { bubbles: true }));
          wrapper.classList.remove('is-open');
        });
        
        select.dispatchEvent(new Event('change', { bubbles: true }));
        wrapper.classList.remove('is-open');
        addNewBtn.style.display = 'none';
      });
    }

    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      document.querySelectorAll('.searchable-select.is-open').forEach(openSelect => {
        if (openSelect !== wrapper) {
          openSelect.classList.remove('is-open');
          openSelect.classList.remove('is-dropup');
        }
      });
      const isOpen = wrapper.classList.toggle('is-open');
      
      if (isOpen) {
        // Smart vertical positioning check
        const rect = wrapper.getBoundingClientRect();
        const dropdownHeight = 240; // Max expected height of the dropdown
        const spaceBelow = window.innerHeight - rect.bottom;
        const spaceAbove = rect.top;
        if (spaceBelow < dropdownHeight && spaceAbove > spaceBelow) {
          wrapper.classList.add('is-dropup');
        } else {
          wrapper.classList.remove('is-dropup');
        }
        
        if (hasSearch) {
          searchInput.value = '';
          options.forEach(opt => opt.classList.remove('is-hidden'));
          noResults.style.display = 'none';
          setTimeout(() => searchInput.focus(), 50);
        }
      } else {
        wrapper.classList.remove('is-dropup');
      }
    });
    
    options.forEach(opt => {
      opt.addEventListener('click', (e) => {
        e.stopPropagation();
        options.forEach(o => o.classList.remove('is-selected'));
        opt.classList.add('is-selected');
        
        const value = opt.dataset.value;
        select.value = value;
        displayValue.textContent = opt.textContent;
        
        select.dispatchEvent(new Event('change', { bubbles: true }));
        wrapper.classList.remove('is-open');
      });
    });
    
    if (hasSearch && searchInput) {
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
      
      wrapper.querySelector('.searchable-select-search-wrap').addEventListener('click', (e) => {
        e.stopPropagation();
      });
    }
  });
  
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }
}

function syncCustomSelects() {
  const selects = document.querySelectorAll('select[data-customized="true"]');
  selects.forEach(select => {
    const wrapper = select.nextSibling;
    if (wrapper && wrapper.classList.contains('searchable-select')) {
      const displayValue = wrapper.querySelector('.searchable-select-value');
      const activeOpt = Array.from(select.options).find(o => o.value === select.value && !o.disabled);
      if (displayValue && activeOpt) {
        displayValue.textContent = activeOpt.text;
      } else if (displayValue && select.options[0]) {
        displayValue.textContent = select.options[0].text;
      }
      const options = wrapper.querySelectorAll('.searchable-select-option');
      options.forEach(opt => {
        if (opt.dataset.value === select.value) {
          opt.classList.add('is-selected');
        } else {
          opt.classList.remove('is-selected');
        }
      });
    }
  });
}

document.addEventListener('click', () => {
  document.querySelectorAll('.searchable-select.is-open').forEach(openSelect => {
    openSelect.classList.remove('is-open');
  });
});

document.addEventListener('DOMContentLoaded', () => {
  convertNativeSelects();
  setTimeout(convertNativeSelects, 100);
  setTimeout(convertNativeSelects, 500);
});

function rebuildCustomSelect(select) {
  if (!select) return;
  const wrapper = select.nextSibling;
  if (wrapper && wrapper.classList.contains('searchable-select')) {
    wrapper.remove();
  }
  select.style.display = '';
  select.dataset.customized = 'false';
  convertNativeSelects();
}

window.convertNativeSelects = convertNativeSelects;
window.syncCustomSelects = syncCustomSelects;
window.rebuildCustomSelect = rebuildCustomSelect;
