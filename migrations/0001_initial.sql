-- Migration 0001_initial.sql

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_salt TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  is_default INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(user_id, type, slug)
);

CREATE TABLE IF NOT EXISTS cycles (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('active', 'closed')),
  started_at TEXT NOT NULL,
  closed_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS movements (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  cycle_id TEXT REFERENCES cycles(id) ON DELETE RESTRICT,
  type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
  amount REAL NOT NULL,
  category_id TEXT NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  description TEXT NOT NULL,
  movement_date TEXT NOT NULL,
  source_key TEXT NOT NULL,
  receipt_stored_name TEXT,
  receipt_original_name TEXT,
  receipt_mime_type TEXT,
  receipt_size INTEGER,
  receipt_uploaded_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(user_id, source_key)
);

CREATE TABLE IF NOT EXISTS goals (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  accent TEXT,
  target_amount REAL NOT NULL,
  saved_amount REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(user_id, slug)
);

CREATE TABLE IF NOT EXISTS commitments (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  cycle_id TEXT NOT NULL REFERENCES cycles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK(type IN ('payable', 'receivable')),
  description TEXT NOT NULL,
  amount REAL NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('pending', 'done')),
  due_date TEXT,
  completed_at TEXT,
  converted_movement_id TEXT REFERENCES movements(id) ON DELETE SET NULL,
  converted_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_cycles_one_active_per_user ON cycles(user_id) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_goals_user_lookup ON goals(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_commitments_cycle_lookup ON commitments(user_id, cycle_id, status, due_date, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_movements_cycle_lookup ON movements(user_id, cycle_id, movement_date DESC);
