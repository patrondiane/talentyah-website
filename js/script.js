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
  const form = document.querySelector(".company-form");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const payload = {
      company_name: form.querySelector('input[name="company"]')?.value.trim(),
      email: form.querySelector('input[name="email"]')?.value.trim(),
      region: form.querySelector('input[name="location"]')?.value.trim(),
      role_needed: form.querySelector('input[name="position"]')?.value.trim(),
      urgency: form.querySelector("#urgence-recrutement")?.value || "",
      message: form.querySelector('textarea[name="context"]')?.value || "",
    };

    try {
      const res = await fetch("http://localhost:4000/api/company", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const out = await res.json();

      if (res.ok && out.ok) {
        alert("Demande envoyée ✅");
        form.reset();
      } else {
        alert("Erreur : " + (out.error || "Impossible d'envoyer"));
        console.log("Réponse serveur:", out);
      }
    } catch (err) {
      console.error(err);
      alert("Erreur réseau : vérifie que le backend tourne sur http://localhost:4000");
    }
  });
});

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("candidateForm");
  const msg = document.getElementById("candidateMsg");

  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    msg.textContent = "Envoi en cours…";

    try {
      const formData = new FormData(form);

      const res = await fetch("http://localhost:4000/api/candidate", {
        method: "POST",
        body: formData,
      });

      const out = await res.json();

      if (!res.ok || !out.ok) {
        msg.textContent = "Erreur lors de l’envoi du profil.";
        return;
      }

      msg.textContent = "Profil envoyé avec succès ✅";
      form.reset();
    } catch (err) {
      console.error(err);
      msg.textContent = "Erreur réseau (backend indisponible).";
    }
  });
  const selectCountries = document.getElementById("pays-afrique");
  const careersSearchFormElement = document.getElementById("careersSearchForm");
  const cards = Array.from(document.querySelectorAll(".job-card"));

  function applyFilters() {
    const selectedCountries = selectCountries
      ? Array.from(selectCountries.selectedOptions).map(o => o.value)
      : [];

    const keywords = (careersSearchFormElement?.elements?.keywords?.value || "").toLowerCase();
    const city = (careersSearchFormElement?.elements?.city?.value || "").toLowerCase();

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

  careersSearchForm?.addEventListener("submit", (e) => {
    e.preventDefault();
    applyFilters();
  });

  selectCountries?.addEventListener("change", applyFilters);
});
