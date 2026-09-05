import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";

const db = new Database("finance.db");

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    amount REAL NOT NULL,
    category TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
    date TEXT NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
    UNIQUE(name, type)
  );

  INSERT OR IGNORE INTO settings (key, value) VALUES ('expense_limit', '0');

  -- Initial categories
  INSERT OR IGNORE INTO categories (name, type) VALUES 
    ('Gaji', 'income'), ('Bonus', 'income'), ('Investasi', 'income'), ('Lainnya', 'income'),
    ('Makanan', 'expense'), ('Transportasi', 'expense'), ('Belanja', 'expense'), 
    ('Hiburan', 'expense'), ('Tagihan', 'expense'), ('Kesehatan', 'expense'), ('Lainnya', 'expense');
`);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API routes
  app.get("/api/categories", (req, res) => {
    try {
      const categories = db.prepare("SELECT * FROM categories").all();
      res.json(categories);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch categories" });
    }
  });

  app.post("/api/categories", (req, res) => {
    const { name, type } = req.body;
    if (!name || !type) return res.status(400).json({ error: "Missing name or type" });
    try {
      const info = db.prepare("INSERT INTO categories (name, type) VALUES (?, ?)").run(name, type);
      const newCategory = db.prepare("SELECT * FROM categories WHERE id = ?").get(info.lastInsertRowid);
      res.status(201).json(newCategory);
    } catch (error) {
      res.status(500).json({ error: "Failed to create category" });
    }
  });

  app.delete("/api/categories/:id", (req, res) => {
    const { id } = req.params;
    try {
      db.prepare("DELETE FROM categories WHERE id = ?").run(id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete category" });
    }
  });

  app.get("/api/settings", (req, res) => {
    try {
      const settings = db.prepare("SELECT * FROM settings").all();
      const settingsMap = settings.reduce((acc: any, s: any) => {
        acc[s.key] = s.value;
        return acc;
      }, {});
      res.json(settingsMap);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch settings" });
    }
  });

  app.post("/api/settings/batch", (req, res) => {
    const settings = req.body; // Expecting { key1: value1, key2: value2 }
    try {
      const insert = db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)");
      const transaction = db.transaction((settingsObj) => {
        for (const [key, value] of Object.entries(settingsObj)) {
          insert.run(key, String(value));
        }
      });
      transaction(settings);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to update settings" });
    }
  });
  app.get("/api/transactions", (req, res) => {
    try {
      const transactions = db.prepare("SELECT * FROM transactions ORDER BY date DESC, id DESC").all();
      res.json(transactions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch transactions" });
    }
  });

  app.post("/api/transactions", (req, res) => {
    const { amount, category, description, type, date } = req.body;
    
    if (!amount || !category || !type || !date) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    try {
      const info = db.prepare(
        "INSERT INTO transactions (amount, category, description, type, date) VALUES (?, ?, ?, ?, ?)"
      ).run(amount, category, description, type, date);
      
      const newTransaction = db.prepare("SELECT * FROM transactions WHERE id = ?").get(info.lastInsertRowid);
      res.status(201).json(newTransaction);
    } catch (error) {
      res.status(500).json({ error: "Failed to create transaction" });
    }
  });

  app.delete("/api/transactions/:id", (req, res) => {
    const { id } = req.params;
    try {
      db.prepare("DELETE FROM transactions WHERE id = ?").run(id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete transaction" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
