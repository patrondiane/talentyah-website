const express = require("express");
const path = require("path");
const fs = require("fs");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../db");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

const adminEmail = process.env.ADMIN_EMAIL;
const adminPassword = process.env.ADMIN_PASSWORD;
const adminPasswordHash = bcrypt.hashSync(adminPassword, 10);

router.post("/login", (req, res) => {
  const { email, password } = req.body;

  if (email !== adminEmail) return res.status(401).json({ error: "Invalid credentials" });

  const ok = bcrypt.compareSync(password, adminPasswordHash);
  if (!ok) return res.status(401).json({ error: "Invalid credentials" });

  const token = jwt.sign({ role: "admin", email }, process.env.JWT_SECRET, { expiresIn: "2h" });
  res.json({ ok: true, token });
});

// Liste candidats + filtres basiques
router.get("/candidates", requireAuth, (req, res) => {
  const { sector, country } = req.query;

  let sql = "SELECT * FROM candidates WHERE 1=1";
  const params = [];

  if (sector) {
    sql += " AND sector = ?";
    params.push(sector);
  }
  if (country) {
    sql += " AND countries_json LIKE ?";
    params.push(`%${country}%`);
  }

  sql += " ORDER BY created_at DESC";
  const rows = db.prepare(sql).all(...params);

  res.json({
    ok: true,
    data: rows.map(r => ({
      ...r,
      countries: r.countries_json ? JSON.parse(r.countries_json) : [],
    })),
  });
});

router.get("/companies", requireAuth, (req, res) => {
  const rows = db.prepare("SELECT * FROM companies ORDER BY created_at DESC").all();
  res.json({ ok: true, data: rows });
});

// Download CV
router.get("/cv/:filename", requireAuth, (req, res) => {
  const filename = req.params.filename;
  if (filename.includes("..") || filename.includes("/") || filename.includes("\\")) {
    return res.status(400).json({ error: "Invalid filename" });
  }

  const filePath = path.join(__dirname, "..", "..", "uploads", filename);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: "File not found" });

  res.download(filePath);
});

router.get("/jobs", requireAuth, (req, res) => {
  const rows = db.prepare("SELECT * FROM jobs ORDER BY created_at DESC").all();
  res.json({ ok: true, data: rows });
});

router.post("/jobs", requireAuth, (req, res) => {
  const { title, country, city, sector, contract_type, salary, description } = req.body;

  if (!title) return res.status(400).json({ error: "title is required" });

  const stmt = db.prepare(`
    INSERT INTO jobs (title, country, city, sector, contract_type, salary, description, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'OPEN', ?)
  `);

  const info = stmt.run(
    title,
    country || null,
    city || null,
    sector || null,
    contract_type || null,
    salary || null,
    description || null,
    new Date().toISOString()
  );

  res.status(201).json({ ok: true, id: info.lastInsertRowid });
});

router.patch("/jobs/:id/close", requireAuth, (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ error: "invalid id" });

  const stmt = db.prepare(`
    UPDATE jobs
    SET status = 'CLOSED', closed_at = ?
    WHERE id = ? AND status = 'OPEN'
  `);

  const info = stmt.run(new Date().toISOString(), id);
  res.json({ ok: true, updated: info.changes });
});

module.exports = router;
