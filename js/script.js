const slides = document.querySelectorAll(".carousel-slide");
let current = 0;

function showSlide(index) {
  slides.forEach(slide => slide.classList.remove("active"));
  slides[index].classList.add("active");
}

setInterval(() => {
  current = (current + 1) % slides.length;
  showSlide(current);
}, 600); // lent = corporate


document.querySelectorAll('.pw-header').forEach(header => {
  header.addEventListener('click', () => {
    const content = header.nextElementSibling;
    const icon = header.querySelector('.pw-icon');

    const isOpen = content.style.display === 'block';

    document.querySelectorAll('.pw-content').forEach(c => c.style.display = 'none');
    document.querySelectorAll('.pw-icon').forEach(i => i.textContent = '+');

    if (!isOpen) {
      content.style.display = 'block';
      icon.textContent = '–';
    }
  });
});

document.querySelectorAll(".pw-header").forEach(header => {
  header.addEventListener("click", () => {
    const item = header.closest(".pw-item");
    const alreadyActive = item.classList.contains("active");

    document.querySelectorAll(".pw-item").forEach(i => i.classList.remove("active"));
    if (!alreadyActive) item.classList.add("active");
  });
});

document.addEventListener("DOMContentLoaded", () => {
  const selectCountries = document.getElementById("pays-afrique");
  const form = document.getElementById("careersSearchForm");
  const cards = Array.from(document.querySelectorAll(".job-card"));

  function applyFilters() {
    const selectedCountries = selectCountries
      ? Array.from(selectCountries.selectedOptions).map(o => o.value)
      : [];

    const keywords = (form?.elements?.keywords?.value || "").toLowerCase();
    const city = (form?.elements?.city?.value || "").toLowerCase();

    cards.forEach(card => {
      const country = (card.dataset.country || "").toLowerCase();
      const cardCity = (card.dataset.city || "").toLowerCase();
      const title = card.querySelector(".job-title")?.textContent.toLowerCase() || "";
      const desc = card.querySelector(".job-desc")?.textContent.toLowerCase() || "";

      const matchCountry =
        selectedCountries.length === 0 || selectedCountries.some(c => c.toLowerCase() === country);

      const matchKeywords =
        !keywords || title.includes(keywords) || desc.includes(keywords);

      const matchCity =
        !city || cardCity.includes(city);

      card.style.display = (matchCountry && matchKeywords && matchCity) ? "" : "none";
    });
  }

  form?.addEventListener("submit", (e) => {
    e.preventDefault();
    applyFilters();
  });

  selectCountries?.addEventListener("change", applyFilters);
});
