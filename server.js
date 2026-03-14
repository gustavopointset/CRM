const express = require("express");
const Database = require("better-sqlite3");
const compression = require("compression");
const basicAuth = require("express-basic-auth");
const path = require("path");
const crypto = require("crypto");

// ── Config ──
const PORT = process.env.PORT || 3000;
const DB_PATH = process.env.DB_PATH || path.join(__dirname, "db", "crm.sqlite");

// Auth: set via env vars, defaults for local dev
const AUTH_USER = process.env.CRM_USER || "pointset";
const AUTH_PASS = process.env.CRM_PASS || "changeme123";

// ── Database ──
const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS contacts (
    id TEXT PRIMARY KEY,
    data TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS interactions (
    id TEXT PRIMARY KEY,
    contact_id TEXT NOT NULL,
    data TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE
  );
`);

// ── App ──
const app = express();
app.use(compression());
app.use(express.json({ limit: "5mb" }));

// Basic auth
app.use(basicAuth({
  users: { [AUTH_USER]: AUTH_PASS },
  challenge: true,
  realm: "PointSet CRM",
}));

// Serve frontend
app.use(express.static(path.join(__dirname, "public")));

// ── API Routes ──

// GET /api/contacts — all contacts
app.get("/api/contacts", (req, res) => {
  const rows = db.prepare("SELECT id, data FROM contacts ORDER BY created_at").all();
  const contacts = rows.map(r => ({ id: r.id, ...JSON.parse(r.data) }));
  res.json(contacts);
});

// POST /api/contacts — create
app.post("/api/contacts", (req, res) => {
  const id = req.body.id || crypto.randomUUID();
  const data = { ...req.body };
  delete data.id;
  db.prepare("INSERT INTO contacts (id, data) VALUES (?, ?)").run(id, JSON.stringify(data));
  res.json({ id, ...data });
});

// PUT /api/contacts/:id — update
app.put("/api/contacts/:id", (req, res) => {
  const { id } = req.params;
  const data = { ...req.body };
  delete data.id;
  db.prepare("UPDATE contacts SET data = ?, updated_at = datetime('now') WHERE id = ?").run(JSON.stringify(data), id);
  res.json({ id, ...data });
});

// DELETE /api/contacts/:id — delete (cascades interactions)
app.delete("/api/contacts/:id", (req, res) => {
  db.prepare("DELETE FROM contacts WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

// GET /api/interactions — all (optionally filter by contact_id)
app.get("/api/interactions", (req, res) => {
  const { contact_id } = req.query;
  let rows;
  if (contact_id) {
    rows = db.prepare("SELECT id, contact_id, data FROM interactions WHERE contact_id = ? ORDER BY created_at").all(contact_id);
  } else {
    rows = db.prepare("SELECT id, contact_id, data FROM interactions ORDER BY created_at").all();
  }
  const interactions = rows.map(r => ({ id: r.id, contactId: r.contact_id, ...JSON.parse(r.data) }));
  res.json(interactions);
});

// POST /api/interactions — create
app.post("/api/interactions", (req, res) => {
  const id = req.body.id || crypto.randomUUID();
  const contactId = req.body.contactId;
  const data = { ...req.body };
  delete data.id;
  delete data.contactId;
  db.prepare("INSERT INTO interactions (id, contact_id, data) VALUES (?, ?, ?)").run(id, contactId, JSON.stringify(data));
  res.json({ id, contactId, ...data });
});

// POST /api/seed — bulk seed data (contacts + interactions)
app.post("/api/seed", (req, res) => {
  const { contacts, interactions } = req.body;
  const existing = db.prepare("SELECT COUNT(*) as count FROM contacts").get();
  if (existing.count > 0) {
    return res.json({ seeded: false, message: "Database already has data. Use /api/reset first." });
  }
  const insertContact = db.prepare("INSERT INTO contacts (id, data) VALUES (?, ?)");
  const insertInteraction = db.prepare("INSERT INTO interactions (id, contact_id, data) VALUES (?, ?, ?)");
  const seedTx = db.transaction(() => {
    for (const c of contacts) {
      const { id, ...rest } = c;
      insertContact.run(id, JSON.stringify(rest));
    }
    for (const i of interactions) {
      const { id, contactId, ...rest } = i;
      insertInteraction.run(id, contactId, JSON.stringify(rest));
    }
  });
  seedTx();
  res.json({ seeded: true, contacts: contacts.length, interactions: interactions.length });
});

// POST /api/reset — wipe and re-seed
app.post("/api/reset", (req, res) => {
  db.exec("DELETE FROM interactions; DELETE FROM contacts;");
  res.json({ ok: true });
});

// Fallback to index.html
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`\n  ◆ PointSet CRM running on http://localhost:${PORT}`);
  console.log(`  Auth: ${AUTH_USER} / ${AUTH_PASS}\n`);
});
