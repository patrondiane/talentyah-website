const express = require("express");
const path = require("path");
const multer = require("multer");
const db = require("../db");

const router = express.Router();

// Storage upload local
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, "..", "..", "uploads")),
  filename: (req, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
    cb(null, `${Date.now()}_${safe}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 7 * 1024 * 1024 }, // 7MB
  fileFilter: (req, file, cb) => {
    const ok =
      file.mimetype === "application/pdf" ||
      file.mimetype === "application/msword" ||
      file.mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    cb(ok ? null : new Error("Invalid file type"), ok);
  },
});

// POST /api/company
router.post("/company", (req, res) => {
  const { company_name, email, region, role_needed, urgency, message } = req.body;

  if (!company_name || !email) {
    return res.status(400).json({ error: "company_name and email are required" });
  }

  const stmt = db.prepare(`
    INSERT INTO companies (company_name, email, region, role_needed, urgency, message, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const info = stmt.run(
    company_name,
    email,
    region || null,
    role_needed || null,
    urgency || null,
    message || null,
    new Date().toISOString()
  );

  res.status(201).json({ ok: true, id: info.lastInsertRowid });
});

// POST /api/candidate  (multipart/form-data + file)
router.post("/candidate", upload.single("cv"), (req, res) => {
  const {
    first_name,
    last_name,
    email,
    phone,
    country,
    city,
    sector,
    experience_level,
    role_target,
  } = req.body;

  // countries[] peut arriver en string ou array
  let countries = req.body["countries[]"] || req.body.countries || [];
  if (typeof countries === "string") countries = [countries];

  if (!email) return res.status(400).json({ error: "email is required" });

  const file = req.file || null;

  const stmt = db.prepare(`
    INSERT INTO candidates (
      first_name, last_name, email, phone, country, city,
      sector, experience_level, role_target,
      countries_json, cv_filename, cv_mime, cv_size, created_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const info = stmt.run(
    first_name || null,
    last_name || null,
    email,
    phone || null,
    country || null,
    city || null,
    sector || null,
    experience_level || null,
    role_target || null,
    JSON.stringify(countries),
    file ? file.filename : null,
    file ? file.mimetype : null,
    file ? file.size : null,
    new Date().toISOString()
  );

  res.status(201).json({ ok: true, id: info.lastInsertRowid });
});

router.get("/jobs", (req, res) => {
  const rows = db.prepare(`
    SELECT * FROM jobs
    WHERE status = 'OPEN'
    ORDER BY created_at DESC
  `).all();

  res.json({ ok: true, data: rows });
});

module.exports = router;
