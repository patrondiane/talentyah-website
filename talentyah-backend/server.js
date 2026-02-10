require("dotenv").config();
const path = require("path");
const fs = require("fs");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const allowed = (process.env.CORS_ORIGIN || "").split(",").map(s => s.trim());

const publicRoutes = require("./src/routes/public");
const adminRoutes = require("./src/routes/admin");

const app = express();

const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

app.use(helmet());
app.use(morgan("dev"));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(cors({
  origin: function (origin, callback) {
    // autoriser requêtes sans origin (curl, postman)
    if (!origin) return callback(null, true);

    if (allowed.includes(origin)) return callback(null, true);

    return callback(new Error("Not allowed by CORS: " + origin));
  },
  credentials: true,
}));

app.get("/health", (req, res) => res.json({ ok: true }));

app.use("/api", publicRoutes);
app.use("/api/admin", adminRoutes);

app.use((req, res) => res.status(404).json({ error: "Not found" }));

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`✅ API running on http://localhost:${port}`));
