-- users
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

-- tracks
CREATE TABLE IF NOT EXISTS tracks (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  origin TEXT NOT NULL,
  destination TEXT NOT NULL,
  max_price INTEGER NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- price_snapshots
CREATE TABLE IF NOT EXISTS price_snapshots (
  id TEXT PRIMARY KEY,
  track_id TEXT NOT NULL,
  price INTEGER NOT NULL,
  captured_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (track_id) REFERENCES tracks(id)
);

-- search_logs
CREATE TABLE IF NOT EXISTS search_logs (
  id TEXT PRIMARY KEY,
  origin TEXT NOT NULL,
  destination TEXT,
  budget INTEGER,
  created_at TEXT DEFAULT (datetime('now'))
);

-- sg_holidays
CREATE TABLE IF NOT EXISTS sg_holidays (
  date TEXT PRIMARY KEY,
  name TEXT NOT NULL
); 