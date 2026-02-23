// js/api.js
window.API_BASE = "http://localhost:4000/api";

window.apiFetch = async function (path, options = {}) {
  const res = await fetch(`${window.API_BASE}${path}`, options);

  const contentType = res.headers.get("content-type") || "";
  const data = contentType.includes("application/json") ? await res.json() : await res.text();

  if (!res.ok) {
    const msg = (data && data.error) ? data.error : `Erreur HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data;
};