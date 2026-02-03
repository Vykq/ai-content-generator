import express from "express";
import sqlite3 from "sqlite3";
import cors from "cors";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const port = Number(process.env.PORT) || 2999;

// JWT secret (in production, use environment variable)
const JWT_SECRET =
  process.env.JWT_SECRET || "your-secret-key-change-in-production";

// Middleware
app.use(cors());
app.use(express.json({ limit: "50mb" }));

// Serve static files from dist directory (built React app)
const publicPath = join(__dirname, "dist");
app.use(express.static(publicPath));

// Authentication middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Access token required" });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: "Invalid or expired token" });
    }
    req.user = user;
    next();
  });
}

// Optional authentication middleware (doesn't fail if no token)
function optionalAuth(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (token) {
    jwt.verify(token, JWT_SECRET, (err, user) => {
      if (!err) {
        req.user = user;
      }
    });
  }
  next();
}

// Initialize SQLite database
const db = new sqlite3.Database(join(__dirname, "history.db"), (err) => {
  if (err) {
    console.error("Error opening database:", err);
  } else {
    console.log("Connected to SQLite database");
    initializeDatabase();
  }
});

// Create tables
function initializeDatabase() {
  // Users table
  db.run(
    `
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `,
    (err) => {
      if (err) {
        console.error("Error creating users table:", err);
      } else {
        console.log("Users table ready");
      }
    }
  );

  // User settings table
  db.run(
    `
    CREATE TABLE IF NOT EXISTS user_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      fal_api_key TEXT,
      kie_api_key TEXT,
      ai_provider TEXT DEFAULT 'fal',
      openai_api_key TEXT,
      default_json_prompt TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(user_id)
    )
  `,
    (err) => {
      if (err) {
        console.error("Error creating user_settings table:", err);
      } else {
        console.log("User settings table ready");
      }
    }
  );

  // History table (now with user_id and username)
  db.run(
    `
    CREATE TABLE IF NOT EXISTS history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      username TEXT,
      type TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      prompt TEXT NOT NULL,
      settings TEXT NOT NULL,
      result TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    )
  `,
    (err) => {
      if (err) {
        console.error("Error creating history table:", err);
      } else {
        console.log("History table ready");
        // Add user_id and username columns if they don't exist (for existing databases)
        db.run(`ALTER TABLE history ADD COLUMN user_id INTEGER`, (alterErr) => {
          if (alterErr && !alterErr.message.includes("duplicate column")) {
            console.error("Error adding user_id column:", alterErr);
          }
        });
        db.run(`ALTER TABLE history ADD COLUMN username TEXT`, (alterErr) => {
          if (alterErr && !alterErr.message.includes("duplicate column")) {
            console.error("Error adding username column:", alterErr);
          }
        });
      }
    }
  );

  // Girls table
  db.run(
    `
    CREATE TABLE IF NOT EXISTS girls (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      handle TEXT NOT NULL UNIQUE,
      image_url TEXT NOT NULL,
      default_prompt TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `,
    (err) => {
      if (err) {
        console.error("Error creating girls table:", err);
      } else {
        console.log("Girls table ready");
        // Add default_prompt column if it doesn't exist (for existing databases)
        db.run(
          `ALTER TABLE girls ADD COLUMN default_prompt TEXT`,
          (alterErr) => {
            if (alterErr && !alterErr.message.includes("duplicate column")) {
              console.error("Error adding default_prompt column:", alterErr);
            }
          }
        );
      }
    }
  );
}

// API Routes

// Authentication Routes

// Register new user
app.post("/api/auth/register", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res
      .status(400)
      .json({ error: "Username and password are required" });
  }

  if (username.length < 3) {
    return res
      .status(400)
      .json({ error: "Username must be at least 3 characters" });
  }

  if (password.length < 6) {
    return res
      .status(400)
      .json({ error: "Password must be at least 6 characters" });
  }

  try {
    // Check if username already exists
    db.get(
      "SELECT id FROM users WHERE username = ?",
      [username],
      async (err, row) => {
        if (err) {
          console.error("Error checking username:", err);
          return res.status(500).json({ error: "Failed to register user" });
        }

        if (row) {
          return res.status(400).json({ error: "Username already exists" });
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, 10);

        // Create user
        db.run(
          "INSERT INTO users (username, password_hash) VALUES (?, ?)",
          [username, passwordHash],
          function (err) {
            if (err) {
              console.error("Error creating user:", err);
              return res.status(500).json({ error: "Failed to register user" });
            }

            const userId = this.lastID;

            // Create default settings for user
            db.run(
              "INSERT INTO user_settings (user_id) VALUES (?)",
              [userId],
              (settingsErr) => {
                if (settingsErr) {
                  console.error("Error creating user settings:", settingsErr);
                }
              }
            );

            // Generate JWT token
            const token = jwt.sign({ id: userId, username }, JWT_SECRET, {
              expiresIn: "30d",
            });

            res.json({
              token,
              user: { id: userId, username },
            });
          }
        );
      }
    );
  } catch (error) {
    console.error("Error during registration:", error);
    res.status(500).json({ error: "Failed to register user" });
  }
});

// Login
app.post("/api/auth/login", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res
      .status(400)
      .json({ error: "Username and password are required" });
  }

  db.get(
    "SELECT * FROM users WHERE username = ?",
    [username],
    async (err, user) => {
      if (err) {
        console.error("Error finding user:", err);
        return res.status(500).json({ error: "Login failed" });
      }

      if (!user) {
        return res.status(401).json({ error: "Invalid username or password" });
      }

      try {
        const validPassword = await bcrypt.compare(
          password,
          user.password_hash
        );

        if (!validPassword) {
          return res
            .status(401)
            .json({ error: "Invalid username or password" });
        }

        // Generate JWT token
        const token = jwt.sign(
          { id: user.id, username: user.username },
          JWT_SECRET,
          { expiresIn: "30d" }
        );

        res.json({
          token,
          user: { id: user.id, username: user.username },
        });
      } catch (error) {
        console.error("Error during login:", error);
        res.status(500).json({ error: "Login failed" });
      }
    }
  );
});

// Get current user info
app.get("/api/auth/me", authenticateToken, (req, res) => {
  db.get(
    "SELECT id, username, created_at FROM users WHERE id = ?",
    [req.user.id],
    (err, user) => {
      if (err) {
        console.error("Error fetching user:", err);
        return res.status(500).json({ error: "Failed to fetch user info" });
      }

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      res.json(user);
    }
  );
});

// User Settings Routes

// Get user settings
app.get("/api/settings", authenticateToken, (req, res) => {
  db.get(
    "SELECT * FROM user_settings WHERE user_id = ?",
    [req.user.id],
    (err, settings) => {
      if (err) {
        console.error("Error fetching settings:", err);
        return res.status(500).json({ error: "Failed to fetch settings" });
      }

      if (!settings) {
        // Create default settings if they don't exist
        db.run(
          "INSERT INTO user_settings (user_id) VALUES (?)",
          [req.user.id],
          function (insertErr) {
            if (insertErr) {
              console.error("Error creating settings:", insertErr);
              return res
                .status(500)
                .json({ error: "Failed to create settings" });
            }

            return res.json({
              fal_api_key: null,
              kie_api_key: null,
              ai_provider: "fal",
              openai_api_key: null,
              default_json_prompt: null,
            });
          }
        );
      } else {
        res.json({
          fal_api_key: settings.fal_api_key,
          kie_api_key: settings.kie_api_key,
          ai_provider: settings.ai_provider || "fal",
          openai_api_key: settings.openai_api_key,
          default_json_prompt: settings.default_json_prompt,
        });
      }
    }
  );
});

// Update user settings
app.put("/api/settings", authenticateToken, (req, res) => {
  const {
    fal_api_key,
    kie_api_key,
    ai_provider,
    openai_api_key,
    default_json_prompt,
  } = req.body;

  db.run(
    `UPDATE user_settings
     SET fal_api_key = ?, kie_api_key = ?, ai_provider = ?, openai_api_key = ?, default_json_prompt = ?, updated_at = CURRENT_TIMESTAMP
     WHERE user_id = ?`,
    [
      fal_api_key,
      kie_api_key,
      ai_provider,
      openai_api_key,
      default_json_prompt,
      req.user.id,
    ],
    function (err) {
      if (err) {
        console.error("Error updating settings:", err);
        return res.status(500).json({ error: "Failed to update settings" });
      }

      if (this.changes === 0) {
        // Settings don't exist yet, create them
        db.run(
          "INSERT INTO user_settings (user_id, fal_api_key, kie_api_key, ai_provider, openai_api_key, default_json_prompt) VALUES (?, ?, ?, ?, ?, ?)",
          [
            req.user.id,
            fal_api_key,
            kie_api_key,
            ai_provider,
            openai_api_key,
            default_json_prompt,
          ],
          (insertErr) => {
            if (insertErr) {
              console.error("Error creating settings:", insertErr);
              return res.status(500).json({ error: "Failed to save settings" });
            }
            res.json({ message: "Settings saved successfully" });
          }
        );
      } else {
        res.json({ message: "Settings updated successfully" });
      }
    }
  );
});

// Get history items with pagination
app.get("/api/history", (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 24));
  const offset = (page - 1) * limit;

  db.get("SELECT COUNT(*) as count FROM history", [], (err, countRow) => {
    if (err) {
      console.error("Error counting history:", err);
      return res.status(500).json({ error: "Failed to fetch history" });
    }

    const total = countRow.count;

    db.all(
      "SELECT * FROM history ORDER BY created_at DESC LIMIT ? OFFSET ?",
      [limit, offset],
      (err2, rows) => {
        if (err2) {
          console.error("Error fetching history:", err2);
          return res.status(500).json({ error: "Failed to fetch history" });
        }

        const items = rows.map((row) => ({
          id: row.id,
          type: row.type,
          timestamp: row.timestamp,
          username: row.username || "Anonymous",
          settings: JSON.parse(row.settings),
          result: JSON.parse(row.result),
        }));

        res.json({ items, total, page, limit });
      }
    );
  });
});

// Add new history item (with optional authentication)
app.post("/api/history", optionalAuth, (req, res) => {
  const { type, timestamp, settings, result } = req.body;

  if (!type || !timestamp || !settings || !result) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const userId = req.user?.id || null;
  const username = req.user?.username || null;

  db.run(
    `INSERT INTO history (user_id, username, type, timestamp, prompt, settings, result)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      userId,
      username,
      type,
      timestamp,
      settings.prompt || "",
      JSON.stringify(settings),
      JSON.stringify(result),
    ],
    function (err) {
      if (err) {
        console.error("Error adding history item:", err);
        res.status(500).json({ error: "Failed to add history item" });
      } else {
        res.json({
          id: this.lastID,
          type,
          timestamp,
          username,
          settings,
          result,
        });
      }
    }
  );
});

// Delete history item
app.delete("/api/history/:id", (req, res) => {
  const { id } = req.params;

  db.run("DELETE FROM history WHERE id = ?", [id], function (err) {
    if (err) {
      console.error("Error deleting history item:", err);
      res.status(500).json({ error: "Failed to delete history item" });
    } else {
      res.json({ message: "History item deleted", deletedId: id });
    }
  });
});

// Clear all history
app.delete("/api/history", (req, res) => {
  db.run("DELETE FROM history", [], function (err) {
    if (err) {
      console.error("Error clearing history:", err);
      res.status(500).json({ error: "Failed to clear history" });
    } else {
      res.json({ message: "All history cleared", deletedCount: this.changes });
    }
  });
});

// Girls API Routes

// Get all girls
app.get("/api/girls", (req, res) => {
  db.all("SELECT * FROM girls ORDER BY created_at DESC", [], (err, rows) => {
    if (err) {
      console.error("Error fetching girls:", err);
      res.status(500).json({ error: "Failed to fetch girls" });
    } else {
      res.json(rows);
    }
  });
});

// Get single girl by id
app.get("/api/girls/:id", (req, res) => {
  const { id } = req.params;
  db.get("SELECT * FROM girls WHERE id = ?", [id], (err, row) => {
    if (err) {
      console.error("Error fetching girl:", err);
      res.status(500).json({ error: "Failed to fetch girl" });
    } else if (!row) {
      res.status(404).json({ error: "Girl not found" });
    } else {
      res.json(row);
    }
  });
});

// Create new girl
app.post("/api/girls", (req, res) => {
  const { name, handle, image_url, default_prompt } = req.body;

  if (!name || !handle || !image_url) {
    return res
      .status(400)
      .json({ error: "Missing required fields: name, handle, image_url" });
  }

  db.run(
    `INSERT INTO girls (name, handle, image_url, default_prompt) VALUES (?, ?, ?, ?)`,
    [name, handle, image_url, default_prompt || null],
    function (err) {
      if (err) {
        if (err.message.includes("UNIQUE constraint failed")) {
          res.status(400).json({ error: "Handle already exists" });
        } else {
          console.error("Error creating girl:", err);
          res.status(500).json({ error: "Failed to create girl" });
        }
      } else {
        res.json({
          id: this.lastID,
          name,
          handle,
          image_url,
          default_prompt,
        });
      }
    }
  );
});

// Update girl
app.put("/api/girls/:id", (req, res) => {
  const { id } = req.params;
  const { name, handle, image_url, default_prompt } = req.body;

  if (!name || !handle || !image_url) {
    return res
      .status(400)
      .json({ error: "Missing required fields: name, handle, image_url" });
  }

  db.run(
    `UPDATE girls SET name = ?, handle = ?, image_url = ?, default_prompt = ? WHERE id = ?`,
    [name, handle, image_url, default_prompt || null, id],
    function (err) {
      if (err) {
        if (err.message.includes("UNIQUE constraint failed")) {
          res.status(400).json({ error: "Handle already exists" });
        } else {
          console.error("Error updating girl:", err);
          res.status(500).json({ error: "Failed to update girl" });
        }
      } else if (this.changes === 0) {
        res.status(404).json({ error: "Girl not found" });
      } else {
        res.json({ id: parseInt(id), name, handle, image_url, default_prompt });
      }
    }
  );
});

// Delete girl
app.delete("/api/girls/:id", (req, res) => {
  const { id } = req.params;

  db.run("DELETE FROM girls WHERE id = ?", [id], function (err) {
    if (err) {
      console.error("Error deleting girl:", err);
      res.status(500).json({ error: "Failed to delete girl" });
    } else if (this.changes === 0) {
      res.status(404).json({ error: "Girl not found" });
    } else {
      res.json({ message: "Girl deleted", deletedId: id });
    }
  });
});

// Serve index.html for all non-API routes (SPA client-side routing)
// Express 5.x requires "{*path}" instead of "*"
app.get("/{*path}", (req, res) => {
  res.sendFile(join(__dirname, "dist", "index.html"));
});

// Start server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});

// Graceful shutdown
process.on("SIGINT", () => {
  db.close((err) => {
    if (err) {
      console.error("Error closing database:", err);
    } else {
      console.log("Database connection closed");
    }
    process.exit(0);
  });
});
