const API_BASE = "http://localhost:4000";

function setToken(token) {
  localStorage.setItem("talentyah_admin_token", token);
}

function getToken() {
  return localStorage.getItem("talentyah_admin_token");
}

function clearToken() {
  localStorage.removeItem("talentyah_admin_token");
}

function showDashboard(show) {
  const form = document.getElementById("adminLoginForm");
  const dash = document.getElementById("adminDashboard");
  if (!form || !dash) return;

  form.style.display = show ? "none" : "block";
  dash.style.display = show ? "block" : "none";
}

function escapeHtml(str = "") {
  return str.replace(/[&<>"']/g, (m) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[m]));
}

function renderCandidates(rows) {
  const tbody = document.getElementById("candidatesTbody");
  if (!tbody) return;

  if (!rows || rows.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6">Aucune candidature trouvée.</td></tr>`;
    return;
  }

  tbody.innerHTML = rows.map(r => {
    const fullName = `${r.first_name || ""} ${r.last_name || ""}`.trim() || "—";
    const date = r.created_at ? new Date(r.created_at).toLocaleString("fr-FR") : "—";
    const countries = Array.isArray(r.countries) ? r.countries.join(", ") : "—";

    const cvCell = r.cv_filename
      ? `<a class="link" href="${API_BASE}/api/admin/cv/${encodeURIComponent(r.cv_filename)}" data-cv="${encodeURIComponent(r.cv_filename)}">Télécharger</a>`
      : "—";

    return `
      <tr>
        <td>${escapeHtml(date)}</td>
        <td>${escapeHtml(fullName)}</td>
        <td>${escapeHtml(r.email || "—")}</td>
        <td>${escapeHtml(r.sector || "—")}</td>
        <td>${escapeHtml(countries || "—")}</td>
        <td>${cvCell}</td>
      </tr>
    `;
  }).join("");
}

async function fetchCandidates(filters = {}) {
  const token = getToken();
  if (!token) return;

  const params = new URLSearchParams();
  if (filters.sector) params.set("sector", filters.sector);
  if (filters.country) params.set("country", filters.country);

  const res = await fetch(`${API_BASE}/api/admin/candidates?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  const out = await res.json();
  if (!res.ok || !out.ok) throw new Error(out.error || "Erreur chargement candidats");

  renderCandidates(out.data);
}

document.addEventListener("DOMContentLoaded", async () => {
  const msg = document.getElementById("adminMsg");
  const loginForm = document.getElementById("adminLoginForm");
  const logoutBtn = document.getElementById("logoutBtn");
  const applyBtn = document.getElementById("applyFiltersBtn");
    const tabCandidates = document.getElementById("tabCandidates");
const tabCompanies = document.getElementById("tabCompanies");
const companiesPanel = document.getElementById("companiesPanel");
const candidatesTable = document.querySelector(".admin-table-wrap"); // 1er wrap = candidats

function showCandidatesTab() {
  tabCandidates?.classList.add("active");
  tabCompanies?.classList.remove("active");
  companiesPanel.style.display = "none";
  candidatesTable.style.display = "block";
}

function showCompaniesTab() {
  tabCompanies?.classList.add("active");
  tabCandidates?.classList.remove("active");
  companiesPanel.style.display = "block";
  candidatesTable.style.display = "none";
}

tabCandidates?.addEventListener("click", async () => {
  showCandidatesTab();
});

tabCompanies?.addEventListener("click", async () => {
  showCompaniesTab();
  try { await fetchCompanies(); } catch (e) { alert("Impossible de charger les demandes entreprises."); }
});

  // Si déjà connecté
  if (getToken()) {
    showDashboard(true);
    try {
      await fetchCandidates();
    } catch (e) {
      clearToken();
      showDashboard(false);
    }
  }

  // Login
  loginForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (msg) msg.textContent = "Connexion…";

    const email = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    try {
      const res = await fetch(`${API_BASE}/api/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });

      const out = await res.json();
      if (!res.ok || !out.ok) {
        if (msg) msg.textContent = "Identifiants incorrects.";
        return;
      }

      setToken(out.token);
      if (msg) msg.textContent = "";
      showDashboard(true);
      await fetchCandidates();
    } catch (err) {
      console.error(err);
      if (msg) msg.textContent = "Erreur réseau : backend indisponible.";
    }
  });

  // Logout
  logoutBtn?.addEventListener("click", () => {
    clearToken();
    showDashboard(false);
  });

  // Filtres
  applyBtn?.addEventListener("click", async () => {
    const sector = document.getElementById("filterSector").value.trim();
    const country = document.getElementById("filterCountry").value.trim();

    try {
      await fetchCandidates({ sector, country });
    } catch (e) {
      alert("Impossible de charger les candidatures.");
    }
  });

  // Download CV (on garde le header Authorization)
  document.addEventListener("click", async (e) => {
    const a = e.target.closest("a[data-cv]");
    if (!a) return;

    e.preventDefault();
    const token = getToken();
    const filename = a.getAttribute("data-cv");

    const res = await fetch(`${API_BASE}/api/admin/cv/${filename}`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok) {
      alert("Téléchargement impossible.");
      return;
    }

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = decodeURIComponent(filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  });
});

function renderCompanies(rows) {
  const tbody = document.getElementById("companiesTbody");
  if (!tbody) return;

  if (!rows || rows.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7">Aucune demande de recrutement.</td></tr>`;
    return;
  }

  tbody.innerHTML = rows.map(r => {
    const date = r.created_at ? new Date(r.created_at).toLocaleString("fr-FR") : "—";
    return `
      <tr>
        <td>${escapeHtml(date)}</td>
        <td>${escapeHtml(r.company_name || "—")}</td>
        <td>${escapeHtml(r.email || "—")}</td>
        <td>${escapeHtml(r.region || "—")}</td>
        <td>${escapeHtml(r.role_needed || "—")}</td>
        <td>${escapeHtml(r.urgency || "—")}</td>
        <td>${escapeHtml(r.message || "—")}</td>
      </tr>
    `;
  }).join("");
}

async function fetchCompanies() {
  const token = getToken();
  if (!token) return;

  const res = await fetch(`${API_BASE}/api/admin/companies`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  const out = await res.json();
  if (!res.ok || !out.ok) throw new Error(out.error || "Erreur chargement entreprises");
  renderCompanies(out.data);
}

function renderJobs(rows) {
  const tbody = document.getElementById("jobsTbody");
  if (!tbody) return;

  if (!rows || rows.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7">Aucune offre.</td></tr>`;
    return;
  }

  tbody.innerHTML = rows.map(j => {
    const date = j.created_at ? new Date(j.created_at).toLocaleString("fr-FR") : "—";
    const place = [j.city, j.country].filter(Boolean).join(", ") || "—";
    const status = j.status === "OPEN" ? "Ouverte" : "Retirée";

    const action = j.status === "OPEN"
      ? `<button class="btn btn-secondary" data-close-job="${j.id}" type="button">Retirer</button>`
      : "—";

    return `
      <tr>
        <td>${escapeHtml(date)}</td>
        <td>${escapeHtml(j.title || "—")}</td>
        <td>${escapeHtml(place)}</td>
        <td>${escapeHtml(j.sector || "—")}</td>
        <td>${escapeHtml(j.contract_type || "—")}</td>
        <td>${escapeHtml(status)}</td>
        <td>${action}</td>
      </tr>
    `;
  }).join("");
}

async function fetchJobs() {
  const token = getToken();
  const res = await fetch(`${API_BASE}/api/admin/jobs`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const out = await res.json();
  if (!res.ok || !out.ok) throw new Error(out.error || "Erreur jobs");
  renderJobs(out.data);
}

async function createJob(payload) {
  const token = getToken();
  const res = await fetch(`${API_BASE}/api/admin/jobs`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });

  const out = await res.json();
  if (!res.ok || !out.ok) throw new Error(out.error || "Erreur création offre");
  return out;
}

async function closeJob(id) {
  const token = getToken();
  const res = await fetch(`${API_BASE}/api/admin/jobs/${id}/close`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}` }
  });
  const out = await res.json();
  if (!res.ok || !out.ok) throw new Error(out.error || "Erreur retrait offre");
  return out;
}

const tabJobs = document.getElementById("tabJobs");
const jobsPanel = document.getElementById("jobsPanel");
const companiesPanel = document.getElementById("companiesPanel");

// ton panel candidats (tu peux cibler plus propre si besoin)
const candidatesWrap = document.querySelector(".admin-table-wrap");

function showPanel(which) {
  // candidatesWrap = tableau candidats uniquement (MVP)
  if (which === "candidates") {
    candidatesWrap.style.display = "block";
    companiesPanel.style.display = "none";
    jobsPanel.style.display = "none";
    tabCandidates.classList.add("active");
    tabCompanies.classList.remove("active");
    tabJobs.classList.remove("active");
  }
  if (which === "companies") {
    candidatesWrap.style.display = "none";
    companiesPanel.style.display = "block";
    jobsPanel.style.display = "none";
    tabCandidates.classList.remove("active");
    tabCompanies.classList.add("active");
    tabJobs.classList.remove("active");
  }
  if (which === "jobs") {
    candidatesWrap.style.display = "none";
    companiesPanel.style.display = "none";
    jobsPanel.style.display = "block";
    tabCandidates.classList.remove("active");
    tabCompanies.classList.remove("active");
    tabJobs.classList.add("active");
  }
}

tabJobs?.addEventListener("click", async () => {
  showPanel("jobs");
  try { await fetchJobs(); } catch { alert("Impossible de charger les offres."); }
});

const jobForm = document.getElementById("jobForm");
const jobMsg = document.getElementById("jobMsg");

jobForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  jobMsg.textContent = "Publication…";

  const fd = new FormData(jobForm);
  const payload = Object.fromEntries(fd.entries());

  try {
    await createJob(payload);
    jobMsg.textContent = "Offre publiée ✅";
    jobForm.reset();
    await fetchJobs();
  } catch (err) {
    console.error(err);
    jobMsg.textContent = "Erreur lors de la publication.";
  }
});

document.addEventListener("click", async (e) => {
  const btn = e.target.closest("[data-close-job]");
  if (!btn) return;

  const id = btn.getAttribute("data-close-job");
  if (!confirm("Retirer cette offre ?")) return;

  try {
    await closeJob(id);
    await fetchJobs();
  } catch {
    alert("Impossible de retirer l’offre.");
  }
});
