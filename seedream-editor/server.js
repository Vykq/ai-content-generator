import express from 'express';
import sqlite3 from 'sqlite3';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const port = 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Initialize SQLite database
const db = new sqlite3.Database(join(__dirname, 'history.db'), (err) => {
  if (err) {
    console.error('Error opening database:', err);
  } else {
    console.log('Connected to SQLite database');
    initializeDatabase();
  }
});

// Create tables
function initializeDatabase() {
  // History table
  db.run(`
    CREATE TABLE IF NOT EXISTS history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      prompt TEXT NOT NULL,
      settings TEXT NOT NULL,
      result TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) {
      console.error('Error creating history table:', err);
    } else {
      console.log('History table ready');
    }
  });

  // Girls table
  db.run(`
    CREATE TABLE IF NOT EXISTS girls (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      handle TEXT NOT NULL UNIQUE,
      image_url TEXT NOT NULL,
      default_prompt TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) {
      console.error('Error creating girls table:', err);
    } else {
      console.log('Girls table ready');
      // Add default_prompt column if it doesn't exist (for existing databases)
      db.run(`ALTER TABLE girls ADD COLUMN default_prompt TEXT`, (alterErr) => {
        if (alterErr && !alterErr.message.includes('duplicate column')) {
          console.error('Error adding default_prompt column:', alterErr);
        }
      });
    }
  });
}

// API Routes

// Get all history items
app.get('/api/history', (req, res) => {
  db.all(
    'SELECT * FROM history ORDER BY created_at DESC',
    [],
    (err, rows) => {
      if (err) {
        console.error('Error fetching history:', err);
        res.status(500).json({ error: 'Failed to fetch history' });
      } else {
        const history = rows.map(row => ({
          id: row.id,
          type: row.type,
          timestamp: row.timestamp,
          settings: JSON.parse(row.settings),
          result: JSON.parse(row.result)
        }));
        res.json(history);
      }
    }
  );
});

// Add new history item
app.post('/api/history', (req, res) => {
  const { type, timestamp, settings, result } = req.body;

  if (!type || !timestamp || !settings || !result) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  db.run(
    `INSERT INTO history (type, timestamp, prompt, settings, result)
     VALUES (?, ?, ?, ?, ?)`,
    [
      type,
      timestamp,
      settings.prompt || '',
      JSON.stringify(settings),
      JSON.stringify(result)
    ],
    function(err) {
      if (err) {
        console.error('Error adding history item:', err);
        res.status(500).json({ error: 'Failed to add history item' });
      } else {
        res.json({
          id: this.lastID,
          type,
          timestamp,
          settings,
          result
        });
      }
    }
  );
});

// Delete history item
app.delete('/api/history/:id', (req, res) => {
  const { id } = req.params;

  db.run('DELETE FROM history WHERE id = ?', [id], function(err) {
    if (err) {
      console.error('Error deleting history item:', err);
      res.status(500).json({ error: 'Failed to delete history item' });
    } else {
      res.json({ message: 'History item deleted', deletedId: id });
    }
  });
});

// Clear all history
app.delete('/api/history', (req, res) => {
  db.run('DELETE FROM history', [], function(err) {
    if (err) {
      console.error('Error clearing history:', err);
      res.status(500).json({ error: 'Failed to clear history' });
    } else {
      res.json({ message: 'All history cleared', deletedCount: this.changes });
    }
  });
});

// Girls API Routes

// Get all girls
app.get('/api/girls', (req, res) => {
  db.all(
    'SELECT * FROM girls ORDER BY created_at DESC',
    [],
    (err, rows) => {
      if (err) {
        console.error('Error fetching girls:', err);
        res.status(500).json({ error: 'Failed to fetch girls' });
      } else {
        res.json(rows);
      }
    }
  );
});

// Get single girl by id
app.get('/api/girls/:id', (req, res) => {
  const { id } = req.params;
  db.get('SELECT * FROM girls WHERE id = ?', [id], (err, row) => {
    if (err) {
      console.error('Error fetching girl:', err);
      res.status(500).json({ error: 'Failed to fetch girl' });
    } else if (!row) {
      res.status(404).json({ error: 'Girl not found' });
    } else {
      res.json(row);
    }
  });
});

// Create new girl
app.post('/api/girls', (req, res) => {
  const { name, handle, image_url, default_prompt } = req.body;

  if (!name || !handle || !image_url) {
    return res.status(400).json({ error: 'Missing required fields: name, handle, image_url' });
  }

  db.run(
    `INSERT INTO girls (name, handle, image_url, default_prompt) VALUES (?, ?, ?, ?)`,
    [name, handle, image_url, default_prompt || null],
    function(err) {
      if (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
          res.status(400).json({ error: 'Handle already exists' });
        } else {
          console.error('Error creating girl:', err);
          res.status(500).json({ error: 'Failed to create girl' });
        }
      } else {
        res.json({
          id: this.lastID,
          name,
          handle,
          image_url,
          default_prompt
        });
      }
    }
  );
});

// Update girl
app.put('/api/girls/:id', (req, res) => {
  const { id } = req.params;
  const { name, handle, image_url, default_prompt } = req.body;

  if (!name || !handle || !image_url) {
    return res.status(400).json({ error: 'Missing required fields: name, handle, image_url' });
  }

  db.run(
    `UPDATE girls SET name = ?, handle = ?, image_url = ?, default_prompt = ? WHERE id = ?`,
    [name, handle, image_url, default_prompt || null, id],
    function(err) {
      if (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
          res.status(400).json({ error: 'Handle already exists' });
        } else {
          console.error('Error updating girl:', err);
          res.status(500).json({ error: 'Failed to update girl' });
        }
      } else if (this.changes === 0) {
        res.status(404).json({ error: 'Girl not found' });
      } else {
        res.json({ id: parseInt(id), name, handle, image_url, default_prompt });
      }
    }
  );
});

// Delete girl
app.delete('/api/girls/:id', (req, res) => {
  const { id } = req.params;

  db.run('DELETE FROM girls WHERE id = ?', [id], function(err) {
    if (err) {
      console.error('Error deleting girl:', err);
      res.status(500).json({ error: 'Failed to delete girl' });
    } else if (this.changes === 0) {
      res.status(404).json({ error: 'Girl not found' });
    } else {
      res.json({ message: 'Girl deleted', deletedId: id });
    }
  });
});

// Start server
app.listen(port, () => {
  console.log(`History API server running on http://localhost:${port}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  db.close((err) => {
    if (err) {
      console.error('Error closing database:', err);
    } else {
      console.log('Database connection closed');
    }
    process.exit(0);
  });
});
