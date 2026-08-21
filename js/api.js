// js/api.js
(() => {
  if (!window.API_BASE) {
    const isLocalHost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    window.API_BASE = isLocalHost ? "http://localhost:4001" : "https://talentyah-website.onrender.com";
  }

  if (!window.apiFetch) {
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
  }
})();