const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { DatabaseSync } = require("node:sqlite");

const root = __dirname;
const host = "127.0.0.1";
const port = Number(process.env.PORT || process.env.PULSO_PORT || 4173);
const appBasePath = normalizeAppBasePath(process.env.PULSO_BASE_PATH || "/pulso");
const dataDir = path.join(root, "data");
const uploadsDir = path.join(dataDir, "uploads");
const dbPath = process.env.PULSO_DB_PATH || path.join(dataDir, "pulso.sqlite");
const sessionDays = Number(process.env.PULSO_SESSION_DAYS || 30);
const SESSION_COOKIE_NAME = "pulso_session";
const SESSION_TTL_MS = Math.min(Math.max(Number.isFinite(sessionDays) ? sessionDays : 30, 1), 90) * 24 * 60 * 60 * 1000;
const AUTH_BODY_LIMIT_BYTES = 16 * 1024;
const AUTH_EMAIL_MAX_LENGTH = 254;
const AUTH_PASSWORD_MIN_LENGTH = 8;
const AUTH_PASSWORD_MAX_LENGTH = 128;
const DOMAIN_TEXT_LIMITS = {
  categoryName: 60,
  movementDescription: 120,
  goalName: 60,
  commitmentDescription: 120,
  cycleLabel: 80,
};
const DOMAIN_AMOUNT_MAX = 999999999.99;
const DOMAIN_DATE_MIN_YEAR = 1900;
const DOMAIN_DATE_MAX_YEAR = 2100;
const HSTS_MAX_AGE = Math.max(0, Number(process.env.PULSO_HSTS_MAX_AGE || 15552000));
const HSTS_INCLUDE_SUBDOMAINS = ["1", "true", "yes"].includes(String(process.env.PULSO_HSTS_INCLUDE_SUBDOMAINS || "").trim().toLowerCase());
const RATE_LIMIT_POLICIES = {
  loginIp: { max: 20, windowMs: 15 * 60 * 1000, blockMs: 15 * 60 * 1000 },
  loginEmail: { max: 8, windowMs: 15 * 60 * 1000, blockMs: 15 * 60 * 1000 },
  registerIp: { max: 8, windowMs: 60 * 60 * 1000, blockMs: 60 * 60 * 1000 },
};
const authRateLimits = new Map();
let lastSessionCleanupAt = 0;

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
};

const defaultCategoriesByType = {
  income: ["salário", "freelance", "venda", "outros"],
  expense: ["alimentação", "transporte", "moradia", "contas", "lazer", "saúde", "compras", "trabalho", "outros"],
};

function normalizeAppBasePath(value) {
  const raw = String(value || "").trim();
  if (!raw || raw === "/") return raw === "/" ? "/" : "";
  return `/${raw.replace(/^\/+|\/+$/g, "")}`;
}

function withAppBasePath(pathname) {
  if (!appBasePath || appBasePath === "/") return pathname;
  if (pathname.startsWith(appBasePath)) return pathname;
  return `${appBasePath}${pathname}`;
}

function buildSecurityHeaders(request) {
  const headers = {
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(self), microphone=(), geolocation=(), payment=(), usb=(), fullscreen=(self), autoplay=(), display-capture=(), clipboard-read=(), clipboard-write=(), xr-spatial-tracking=(), screen-wake-lock=()",
    "X-Frame-Options": "DENY",
    "Content-Security-Policy": [
      "default-src 'self'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
      "frame-ancestors 'none'",
      "script-src 'self'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' blob: data:",
      "font-src 'self' data:",
      "connect-src 'self'",
      "manifest-src 'self'",
      "worker-src 'self'",
      "media-src 'self' blob:",
    ].join("; "),
  };

  if (HSTS_MAX_AGE > 0) {
    const parts = [`max-age=${Math.floor(HSTS_MAX_AGE)}`];
    if (HSTS_INCLUDE_SUBDOMAINS) parts.push("includeSubDomains");
    headers["Strict-Transport-Security"] = parts.join("; ");
  }

  return headers;
}

function staticCacheControlFor(filePath) {
  return path.extname(filePath) === ".html" ? "no-store" : "no-cache";
}

fs.mkdirSync(dataDir, { recursive: true });
fs.mkdirSync(uploadsDir, { recursive: true });

const db = new DatabaseSync(dbPath);
db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;

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
`);

ensureMovementCycleColumn();
ensureMovementReceiptColumns();
ensureGoalAccentColumn();
migrateGoalsSchemaIfNeeded();

const statements = {
  insertUser: db.prepare(`
    INSERT INTO users (id, email, password_salt, password_hash, created_at, updated_at)
    VALUES (@id, @email, @salt, @hash, @createdAt, @updatedAt)
  `),
  findUserByEmail: db.prepare(`SELECT * FROM users WHERE email = ?`),
  findUserById: db.prepare(`SELECT id, email, created_at AS createdAt, updated_at AS updatedAt FROM users WHERE id = ?`),
  insertSession: db.prepare(`
    INSERT INTO sessions (id, user_id, token_hash, created_at, last_seen_at, expires_at)
    VALUES (@id, @userId, @tokenHash, @createdAt, @lastSeenAt, @expiresAt)
  `),
  findSessionByToken: db.prepare(`
    SELECT sessions.id, sessions.user_id AS userId, sessions.expires_at AS expiresAt, users.email
    FROM sessions
    JOIN users ON users.id = sessions.user_id
    WHERE sessions.token_hash = ?
  `),
  updateSessionSeen: db.prepare(`UPDATE sessions SET last_seen_at = ? WHERE id = ?`),
  deleteSessionById: db.prepare(`DELETE FROM sessions WHERE id = ?`),
  deleteSessionByTokenHash: db.prepare(`DELETE FROM sessions WHERE token_hash = ?`),
  deleteExpiredSessions: db.prepare(`DELETE FROM sessions WHERE expires_at <= ?`),
  insertCycle: db.prepare(`
    INSERT INTO cycles (id, user_id, label, status, started_at, closed_at, created_at, updated_at)
    VALUES (@id, @userId, @label, @status, @startedAt, @closedAt, @createdAt, @updatedAt)
  `),
  updateCycleClose: db.prepare(`
    UPDATE cycles
    SET label = ?, status = 'closed', closed_at = ?, updated_at = ?
    WHERE id = ? AND user_id = ? AND status = 'active'
  `),
  findCycleById: db.prepare(`
    SELECT id, user_id AS userId, label, status, started_at AS startedAt, closed_at AS closedAt, created_at AS createdAt, updated_at AS updatedAt
    FROM cycles
    WHERE id = ? AND user_id = ?
  `),
  findActiveCycleByUser: db.prepare(`
    SELECT id, user_id AS userId, label, status, started_at AS startedAt, closed_at AS closedAt, created_at AS createdAt, updated_at AS updatedAt
    FROM cycles
    WHERE user_id = ? AND status = 'active'
    LIMIT 1
  `),
  listCyclesByUser: db.prepare(`
    SELECT
      cycles.id,
      cycles.user_id AS userId,
      cycles.label,
      cycles.status,
      cycles.started_at AS startedAt,
      cycles.closed_at AS closedAt,
      cycles.created_at AS createdAt,
      cycles.updated_at AS updatedAt,
      COALESCE(SUM(CASE WHEN movements.type = 'income' THEN movements.amount ELSE 0 END), 0) AS incomeTotal,
      COALESCE(SUM(CASE WHEN movements.type = 'expense' THEN movements.amount ELSE 0 END), 0) AS expenseTotal,
      COUNT(movements.id) AS movementCount
    FROM cycles
    LEFT JOIN movements
      ON movements.cycle_id = cycles.id
      AND movements.user_id = cycles.user_id
    WHERE cycles.user_id = ?
    GROUP BY cycles.id
    ORDER BY CASE cycles.status WHEN 'active' THEN 0 ELSE 1 END, COALESCE(cycles.closed_at, cycles.started_at) DESC
  `),
  listClosedCyclesByUser: db.prepare(`
    SELECT
      cycles.id,
      cycles.user_id AS userId,
      cycles.label,
      cycles.status,
      cycles.started_at AS startedAt,
      cycles.closed_at AS closedAt,
      cycles.created_at AS createdAt,
      cycles.updated_at AS updatedAt,
      COALESCE(SUM(CASE WHEN movements.type = 'income' THEN movements.amount ELSE 0 END), 0) AS incomeTotal,
      COALESCE(SUM(CASE WHEN movements.type = 'expense' THEN movements.amount ELSE 0 END), 0) AS expenseTotal,
      COUNT(movements.id) AS movementCount
    FROM cycles
    LEFT JOIN movements
      ON movements.cycle_id = cycles.id
      AND movements.user_id = cycles.user_id
    WHERE cycles.user_id = ? AND cycles.status = 'closed'
    GROUP BY cycles.id
    ORDER BY COALESCE(cycles.closed_at, cycles.started_at) DESC
  `),
  listCycleSummaryById: db.prepare(`
    SELECT
      cycles.id,
      cycles.user_id AS userId,
      cycles.label,
      cycles.status,
      cycles.started_at AS startedAt,
      cycles.closed_at AS closedAt,
      cycles.created_at AS createdAt,
      cycles.updated_at AS updatedAt,
      COALESCE(SUM(CASE WHEN movements.type = 'income' THEN movements.amount ELSE 0 END), 0) AS incomeTotal,
      COALESCE(SUM(CASE WHEN movements.type = 'expense' THEN movements.amount ELSE 0 END), 0) AS expenseTotal,
      COUNT(movements.id) AS movementCount
    FROM cycles
    LEFT JOIN movements
      ON movements.cycle_id = cycles.id
      AND movements.user_id = cycles.user_id
    WHERE cycles.user_id = ? AND cycles.id = ?
    GROUP BY cycles.id
    LIMIT 1
  `),
  listGoalsByUser: db.prepare(`
    SELECT
      goals.id,
      goals.user_id AS userId,
      goals.name,
      goals.slug,
      goals.accent,
      goals.target_amount AS targetAmount,
      goals.saved_amount AS savedAmount,
      goals.created_at AS createdAt,
      goals.updated_at AS updatedAt
    FROM goals
    WHERE goals.user_id = ?
    ORDER BY goals.created_at DESC
  `),
  listCommitmentsByCycle: db.prepare(`
    SELECT
      commitments.id,
      commitments.user_id AS userId,
      commitments.cycle_id AS cycleId,
      commitments.type,
      commitments.description,
      commitments.amount,
      commitments.status,
      commitments.due_date AS dueDate,
      commitments.completed_at AS completedAt,
      commitments.converted_movement_id AS convertedMovementId,
      commitments.converted_at AS convertedAt,
      commitments.created_at AS createdAt,
      commitments.updated_at AS updatedAt
    FROM commitments
    WHERE commitments.user_id = ? AND commitments.cycle_id = ?
    ORDER BY CASE commitments.status WHEN 'pending' THEN 0 ELSE 1 END, COALESCE(commitments.due_date, commitments.created_at) ASC, commitments.created_at ASC
  `),
  findCommitmentById: db.prepare(`
    SELECT
      commitments.id,
      commitments.user_id AS userId,
      commitments.cycle_id AS cycleId,
      commitments.type,
      commitments.description,
      commitments.amount,
      commitments.status,
      commitments.due_date AS dueDate,
      commitments.completed_at AS completedAt,
      commitments.converted_movement_id AS convertedMovementId,
      commitments.converted_at AS convertedAt,
      commitments.created_at AS createdAt,
      commitments.updated_at AS updatedAt
    FROM commitments
    WHERE commitments.id = ? AND commitments.user_id = ? AND commitments.cycle_id = ?
    LIMIT 1
  `),
  insertCommitment: db.prepare(`
    INSERT INTO commitments (
      id, user_id, cycle_id, type, description, amount, status, due_date, completed_at, converted_movement_id, converted_at, created_at, updated_at
    )
    VALUES (
      @id, @userId, @cycleId, @type, @description, @amount, @status, @dueDate, @completedAt, @convertedMovementId, @convertedAt, @createdAt, @updatedAt
    )
  `),
  updateCommitment: db.prepare(`
    UPDATE commitments
    SET type = ?, description = ?, amount = ?, due_date = ?, updated_at = ?
    WHERE id = ? AND user_id = ? AND cycle_id = ?
  `),
  updateCommitmentStatus: db.prepare(`
    UPDATE commitments
    SET status = ?, completed_at = ?, updated_at = ?
    WHERE id = ? AND user_id = ? AND cycle_id = ?
  `),
  updateCommitmentConversion: db.prepare(`
    UPDATE commitments
    SET converted_movement_id = ?, converted_at = ?, updated_at = ?
    WHERE id = ? AND user_id = ? AND cycle_id = ?
  `),
  deleteCommitment: db.prepare(`DELETE FROM commitments WHERE id = ? AND user_id = ? AND cycle_id = ?`),
  findGoalById: db.prepare(`
    SELECT
      goals.id,
      goals.user_id AS userId,
      goals.name,
      goals.slug,
      goals.accent,
      goals.target_amount AS targetAmount,
      goals.saved_amount AS savedAmount,
      goals.created_at AS createdAt,
      goals.updated_at AS updatedAt
    FROM goals
    WHERE goals.id = ? AND goals.user_id = ?
    LIMIT 1
  `),
  findGoalBySlug: db.prepare(`
    SELECT
      goals.id,
      goals.user_id AS userId,
      goals.name,
      goals.slug,
      goals.accent,
      goals.target_amount AS targetAmount,
      goals.saved_amount AS savedAmount,
      goals.created_at AS createdAt,
      goals.updated_at AS updatedAt
    FROM goals
    WHERE goals.user_id = ? AND goals.slug = ?
    LIMIT 1
  `),
  sumGoalsSavedByUser: db.prepare(`
    SELECT COALESCE(SUM(saved_amount), 0) AS total
    FROM goals
    WHERE user_id = ?
  `),
  insertGoal: db.prepare(`
    INSERT INTO goals (
      id, user_id, name, slug, accent, target_amount, saved_amount, created_at, updated_at
    )
    VALUES (
      @id, @userId, @name, @slug, @accent, @targetAmount, @savedAmount, @createdAt, @updatedAt
    )
  `),
  updateGoal: db.prepare(`
    UPDATE goals
    SET name = ?, slug = ?, accent = ?, target_amount = ?, updated_at = ?
    WHERE id = ? AND user_id = ?
  `),
  updateGoalSavedAmount: db.prepare(`
    UPDATE goals
    SET saved_amount = ?, updated_at = ?
    WHERE id = ? AND user_id = ?
  `),
  deleteGoal: db.prepare(`DELETE FROM goals WHERE id = ? AND user_id = ?`),
  assignLegacyMovementsToCycle: db.prepare(`
    UPDATE movements
    SET cycle_id = ?
    WHERE user_id = ? AND cycle_id IS NULL
  `),
  listCategories: db.prepare(`
    SELECT id, type, name, slug, is_default AS isDefault, created_at AS createdAt, updated_at AS updatedAt
    FROM categories
    WHERE user_id = ?
    ORDER BY CASE type WHEN 'income' THEN 0 ELSE 1 END, is_default DESC, name ASC
  `),
  listCategoriesByType: db.prepare(`
    SELECT id, type, name, slug, is_default AS isDefault, created_at AS createdAt, updated_at AS updatedAt
    FROM categories
    WHERE user_id = ? AND type = ?
    ORDER BY is_default DESC, name ASC
  `),
  findCategoryById: db.prepare(`SELECT * FROM categories WHERE id = ? AND user_id = ?`),
  findCategoryBySlug: db.prepare(`SELECT * FROM categories WHERE user_id = ? AND type = ? AND slug = ?`),
  countMovementsForCategory: db.prepare(`SELECT COUNT(*) AS count FROM movements WHERE user_id = ? AND category_id = ?`),
  insertCategory: db.prepare(`
    INSERT INTO categories (id, user_id, type, name, slug, is_default, created_at, updated_at)
    VALUES (@id, @userId, @type, @name, @slug, @isDefault, @createdAt, @updatedAt)
  `),
  updateCategory: db.prepare(`
    UPDATE categories
    SET name = ?, slug = ?, updated_at = ?
    WHERE id = ? AND user_id = ?
  `),
  deleteCategory: db.prepare(`DELETE FROM categories WHERE id = ? AND user_id = ?`),
  listMovementsByCycle: db.prepare(`
    SELECT
      movements.id,
      movements.type,
      movements.amount,
      movements.description,
      movements.movement_date AS date,
      movements.category_id AS categoryId,
      movements.cycle_id AS cycleId,
      movements.source_key AS sourceKey,
      movements.receipt_stored_name AS receiptStoredName,
      movements.receipt_original_name AS receiptOriginalName,
      movements.receipt_mime_type AS receiptMimeType,
      movements.receipt_size AS receiptSize,
      movements.receipt_uploaded_at AS receiptUploadedAt,
      movements.created_at AS createdAt,
      movements.updated_at AS updatedAt,
      categories.name AS categoryName,
      categories.type AS categoryType
    FROM movements
    JOIN categories ON categories.id = movements.category_id
    WHERE movements.user_id = ? AND movements.cycle_id = ?
    ORDER BY movement_date DESC, movements.created_at DESC
  `),
  listMovementsByCycleNoJoin: db.prepare(`
    SELECT
      movements.id,
      movements.type,
      movements.amount,
      movements.description,
      movements.movement_date AS date,
      movements.category_id AS categoryId,
      movements.cycle_id AS cycleId,
      movements.source_key AS sourceKey,
      movements.receipt_stored_name AS receiptStoredName,
      movements.receipt_original_name AS receiptOriginalName,
      movements.receipt_mime_type AS receiptMimeType,
      movements.receipt_size AS receiptSize,
      movements.receipt_uploaded_at AS receiptUploadedAt,
      movements.created_at AS createdAt,
      movements.updated_at AS updatedAt
    FROM movements
    WHERE movements.user_id = ? AND movements.cycle_id = ?
    ORDER BY movement_date DESC, movements.created_at DESC
  `),
  findMovementById: db.prepare(`SELECT * FROM movements WHERE id = ? AND user_id = ?`),
  findActiveMovementById: db.prepare(`
    SELECT movements.*
    FROM movements
    JOIN cycles ON cycles.id = movements.cycle_id
    WHERE movements.id = ? AND movements.user_id = ? AND cycles.status = 'active'
  `),
  findMovementBySource: db.prepare(`SELECT id FROM movements WHERE user_id = ? AND source_key = ?`),
  findActiveMovementBySource: db.prepare(`
    SELECT movements.id
    FROM movements
    JOIN cycles ON cycles.id = movements.cycle_id
    WHERE movements.user_id = ? AND movements.source_key = ? AND cycles.status = 'active'
  `),
  insertMovement: db.prepare(`
    INSERT INTO movements (
      id, user_id, cycle_id, type, amount, category_id, description, movement_date,
      source_key, receipt_stored_name, receipt_original_name, receipt_mime_type,
      receipt_size, receipt_uploaded_at, created_at, updated_at
    )
    VALUES (
      @id, @userId, @cycleId, @type, @amount, @categoryId, @description, @movementDate,
      @sourceKey, @receiptStoredName, @receiptOriginalName, @receiptMimeType,
      @receiptSize, @receiptUploadedAt, @createdAt, @updatedAt
    )
  `),
  updateMovement: db.prepare(`
    UPDATE movements
    SET type = ?, amount = ?, category_id = ?, description = ?, movement_date = ?, updated_at = ?
    WHERE id = ? AND user_id = ?
  `),
  updateMovementReceipt: db.prepare(`
    UPDATE movements
    SET receipt_stored_name = ?, receipt_original_name = ?, receipt_mime_type = ?, receipt_size = ?, receipt_uploaded_at = ?, updated_at = ?
    WHERE id = ? AND user_id = ?
  `),
  clearMovementReceipt: db.prepare(`
    UPDATE movements
    SET receipt_stored_name = NULL, receipt_original_name = NULL, receipt_mime_type = NULL, receipt_size = NULL, receipt_uploaded_at = NULL, updated_at = ?
    WHERE id = ? AND user_id = ?
  `),
  deleteMovement: db.prepare(`DELETE FROM movements WHERE id = ? AND user_id = ?`),
};

function ensureMovementCycleColumn() {
  const columns = db.prepare(`PRAGMA table_info(movements)`).all();
  if (!columns.some((column) => column.name === "cycle_id")) {
    db.exec(`ALTER TABLE movements ADD COLUMN cycle_id TEXT REFERENCES cycles(id) ON DELETE RESTRICT`);
  }
  db.exec(`CREATE INDEX IF NOT EXISTS idx_movements_cycle_lookup ON movements(user_id, cycle_id, movement_date DESC)`);
}

function ensureMovementReceiptColumns() {
  const columns = db.prepare(`PRAGMA table_info(movements)`).all().map((column) => column.name);
  const missing = [
    ["receipt_stored_name", "TEXT"],
    ["receipt_original_name", "TEXT"],
    ["receipt_mime_type", "TEXT"],
    ["receipt_size", "INTEGER"],
    ["receipt_uploaded_at", "TEXT"],
  ];

  for (const [name, type] of missing) {
    if (!columns.includes(name)) {
      db.exec(`ALTER TABLE movements ADD COLUMN ${name} ${type}`);
    }
  }
}

function ensureGoalAccentColumn() {
  const columns = db.prepare(`PRAGMA table_info(goals)`).all().map((column) => column.name);
  if (!columns.includes("accent")) {
    db.exec(`ALTER TABLE goals ADD COLUMN accent TEXT`);
  }
}

function migrateGoalsSchemaIfNeeded() {
  const columns = db.prepare(`PRAGMA table_info(goals)`).all().map((column) => column.name);
  if (!columns.includes("cycle_id")) return;

  let previousForeignKeys;
  try {
    previousForeignKeys = db.prepare(`PRAGMA foreign_keys`).get()?.foreign_keys ?? 0;
  } catch {
    previousForeignKeys = 0;
  }
  db.exec("PRAGMA foreign_keys = OFF");
  db.exec("BEGIN");
  try {
    const duplicateGroups = db.prepare(`
      SELECT user_id, slug, COUNT(*) AS total
      FROM goals
      GROUP BY user_id, slug
      HAVING COUNT(*) > 1
    `).all();

    for (const group of duplicateGroups) {
      const rows = db.prepare(`
        SELECT * FROM goals WHERE user_id = ? AND slug = ? ORDER BY created_at ASC
      `).all(group.user_id, group.slug);
      if (rows.length < 2) continue;

      const keep = rows[rows.length - 1];
      const savedAmount = rows.reduce((sum, row) => sum + Number(row.saved_amount || 0), 0);
      const targetAmount = Math.max(...rows.map((row) => Number(row.target_amount || 0)));
      db.prepare(`
        UPDATE goals
        SET saved_amount = ?, target_amount = ?, updated_at = ?
        WHERE id = ? AND user_id = ?
      `).run(savedAmount, targetAmount, nowIso(), keep.id, group.user_id);

      for (const row of rows) {
        if (row.id === keep.id) continue;
        db.prepare(`DELETE FROM goals WHERE id = ? AND user_id = ?`).run(row.id, group.user_id);
      }
    }

    db.exec(`
      CREATE TABLE goals_v2 (
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
      INSERT INTO goals_v2 (id, user_id, name, slug, accent, target_amount, saved_amount, created_at, updated_at)
        SELECT id, user_id, name, slug, accent, target_amount, saved_amount, created_at, updated_at FROM goals;
      DROP TABLE goals;
      ALTER TABLE goals_v2 RENAME TO goals;
      CREATE INDEX IF NOT EXISTS idx_goals_user_lookup ON goals(user_id, created_at DESC);
    `);
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  } finally {
    db.exec(`PRAGMA foreign_keys = ${previousForeignKeys ? "ON" : "OFF"}`);
  }
}

const RECEIPT_LIMITS = {
  image: 5 * 1024 * 1024,
  pdf: 10 * 1024 * 1024,
};

const RECEIPT_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);

function isReceiptSupported(mimeType, filename) {
  const normalizedMime = String(mimeType || "").toLowerCase();
  if (RECEIPT_MIME_TYPES.has(normalizedMime)) return normalizedMime;

  const extension = path.extname(String(filename || "")).toLowerCase();
  if ([".jpg", ".jpeg"].includes(extension)) return "image/jpeg";
  if (extension === ".png") return "image/png";
  if (extension === ".webp") return "image/webp";
  if (extension === ".pdf") return "application/pdf";
  return "";
}

function receiptKindForMime(mimeType) {
  return mimeType === "application/pdf" ? "pdf" : "image";
}

function receiptExtensionForMime(mimeType) {
  if (mimeType === "application/pdf") return ".pdf";
  if (mimeType === "image/png") return ".png";
  if (mimeType === "image/webp") return ".webp";
  return ".jpg";
}

function sanitizeFileName(name) {
  return String(name || "comprovante")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || "comprovante";
}

function buildReceiptStoredName(movementId, mimeType) {
  return `${movementId}-${crypto.randomUUID()}${receiptExtensionForMime(mimeType)}`;
}

function getReceiptFilePath(storedName) {
  return path.join(uploadsDir, storedName);
}

function deleteFileIfExists(filePath) {
  try {
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch {
    // Arquivo órfão não impede o fluxo.
  }
}

function streamFile(response, filePath, mimeType, fileName) {
  const stream = fs.createReadStream(filePath);
  const safeName = sanitizeFileName(fileName);
  response.writeHead(200, {
    ...buildSecurityHeaders(),
    "Content-Type": mimeType,
    "Content-Disposition": `inline; filename="${safeName}"`,
    "Cache-Control": "no-store",
  });
  stream.on("error", () => {
    if (!response.headersSent) {
      sendText(response, 404, "Not found");
    } else {
      response.destroy();
    }
  });
  stream.pipe(response);
}

function migrateCyclesForExistingUsers() {
  const users = db.prepare(`SELECT id FROM users`).all();
  for (const { id: userId } of users) {
    ensureCurrentCycle(userId);
  }
}

function nowIso() {
  return new Date().toISOString();
}

function uuid() {
  return crypto.randomUUID();
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function isValidAuthEmail(email) {
  if (!email || email.length > AUTH_EMAIL_MAX_LENGTH) return false;
  if (/\s/.test(email)) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function normalizeAuthPassword(password) {
  return typeof password === "string" ? password : "";
}

function isValidAuthPassword(password) {
  return password.length >= AUTH_PASSWORD_MIN_LENGTH
    && password.length <= AUTH_PASSWORD_MAX_LENGTH
    && !/^\s+$/.test(password);
}

function validateAuthPayload(body, { requireStrongPassword = false } = {}) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  const email = normalizeEmail(body.email);
  const password = normalizeAuthPassword(body.password);
  if (!isValidAuthEmail(email)) return null;
  if (!password || password.length > AUTH_PASSWORD_MAX_LENGTH) return null;
  if (requireStrongPassword && !isValidAuthPassword(password)) return null;
  return { email, password };
}

function normalizeName(name) {
  return validateTextValue(name, { code: "invalid_category", lowerCase: true, maxLength: DOMAIN_TEXT_LIMITS.categoryName });
}

function normalizeGoalName(name) {
  return validateTextValue(name, { code: "invalid_goal", maxLength: DOMAIN_TEXT_LIMITS.goalName });
}

function normalizeMovementDescription(description) {
  return validateTextValue(description, { code: "invalid_movement", maxLength: DOMAIN_TEXT_LIMITS.movementDescription });
}

function normalizeCommitmentDescription(description) {
  return validateTextValue(description, { code: "invalid_commitment", maxLength: DOMAIN_TEXT_LIMITS.commitmentDescription });
}

function normalizeDomainLabel(value, maxLength, { lowerCase = false } = {}) {
  return normalizeTextValue(value, { maxLength, lowerCase });
}

function normalizeTextValue(value, { lowerCase = false, maxLength = DOMAIN_TEXT_LIMITS.movementDescription } = {}) {
  const text = String(value || "")
    .replace(/[\u0000-\u001f\u007f\u200b-\u200d\ufeff]/g, "")
    .trim()
    .replace(/\s+/g, " ");
  if (!text) return "";
  return lowerCase ? text.toLowerCase() : text;
}

function validateTextValue(value, { code, lowerCase = false, minLength = 1, maxLength = DOMAIN_TEXT_LIMITS.movementDescription } = {}) {
  const normalized = normalizeTextValue(value, { lowerCase, maxLength });
  if (!normalized || normalized.length < minLength || normalized.length > maxLength) {
    const error = new Error(code);
    error.statusCode = 400;
    throw error;
  }
  return normalized;
}

function parsePositiveAmount(value, { code, min = 0.01, max = DOMAIN_AMOUNT_MAX } = {}) {
  const raw = typeof value === "number" ? String(value) : String(value || "").trim();
  if (!raw) {
    const error = new Error(code);
    error.statusCode = 400;
    throw error;
  }

  if (/[eE]/.test(raw)) {
    const error = new Error(code);
    error.statusCode = 400;
    throw error;
  }

  const monetaryText = raw.replace(/^R\$\s*/i, "");
  if (!/^-?\d[\d.,\s]*$/.test(monetaryText)) {
    const error = new Error(code);
    error.statusCode = 400;
    throw error;
  }

  const commaCount = (raw.match(/,/g) || []).length;
  if (commaCount > 1) {
    const error = new Error(code);
    error.statusCode = 400;
    throw error;
  }

  const normalized = monetaryText.includes(",")
    ? monetaryText.replace(/\./g, "").replace(",", ".").replace(/[^\d.-]/g, "")
    : monetaryText.replace(/[^\d.-]/g, "");
  if (!normalized || /-/.test(normalized.slice(1)) || (normalized.match(/\./g) || []).length > 1) {
    const error = new Error(code);
    error.statusCode = 400;
    throw error;
  }

  const amount = Number(normalized);
  if (!Number.isFinite(amount) || amount < min || amount > max) {
    const error = new Error(code);
    error.statusCode = 400;
    throw error;
  }

  return amount;
}

function validateIsoDate(value, code, { allowEmpty = false } = {}) {
  const text = String(value || "").trim();
  if (!text) {
    if (allowEmpty) return null;
    const error = new Error(code);
    error.statusCode = 400;
    throw error;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    const error = new Error(code);
    error.statusCode = 400;
    throw error;
  }

  const [yearText] = text.split("-");
  const year = Number(yearText);
  if (!Number.isInteger(year) || year < DOMAIN_DATE_MIN_YEAR || year > DOMAIN_DATE_MAX_YEAR) {
    const error = new Error(code);
    error.statusCode = 400;
    throw error;
  }

  const parsed = new Date(`${text}T12:00:00`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== text) {
    const error = new Error(code);
    error.statusCode = 400;
    throw error;
  }

  return text;
}

const GOAL_ACCENTS = new Set(["cyan", "green", "purple", "pink", "amber", "blue", "coral", "neutral"]);
const GOAL_ACCENT_ORDER = ["cyan", "green", "purple", "pink", "amber", "blue", "coral", "neutral"];

function normalizeGoalAccent(value, fallback = "cyan") {
  const normalized = String(value || "").trim().toLowerCase();
  if (GOAL_ACCENTS.has(normalized)) return normalized;
  return GOAL_ACCENTS.has(fallback) ? fallback : "cyan";
}

function pickGoalAccentSeed(value) {
  const normalized = String(value || "").trim().toLowerCase();
  let hash = 0;
  for (let index = 0; index < normalized.length; index += 1) {
    hash = (hash * 31 + normalized.charCodeAt(index)) >>> 0;
  }
  return GOAL_ACCENT_ORDER[hash % GOAL_ACCENT_ORDER.length] || "cyan";
}

function slugify(name) {
  return normalizeName(name)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  const hash = crypto.scryptSync(String(password), salt, 64).toString("hex");
  return { salt, hash };
}

function verifyPassword(password, salt, expectedHash) {
  const { hash } = hashPassword(password, salt);
  return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(expectedHash, "hex"));
}

function parseCookies(header = "") {
  return header.split(";").reduce((cookies, item) => {
    const index = item.indexOf("=");
    if (index < 0) return cookies;
    const key = item.slice(0, index).trim();
    const value = item.slice(index + 1).trim();
    if (key) cookies[key] = decodeURIComponent(value);
    return cookies;
  }, {});
}

function forwardedHeaderValue(value) {
  const raw = Array.isArray(value) ? value[0] : value;
  return String(raw || "").split(",")[0].trim();
}

function getClientIp(request) {
  return forwardedHeaderValue(request.headers["x-forwarded-for"])
    || forwardedHeaderValue(request.headers["x-real-ip"])
    || request.socket?.remoteAddress
    || "unknown";
}

function isSecureRequest(request) {
  const override = String(process.env.PULSO_SECURE_COOKIES || "").trim().toLowerCase();
  if (["1", "true", "yes"].includes(override)) return true;
  if (["0", "false", "no"].includes(override)) return false;

  const forwardedProto = forwardedHeaderValue(request.headers["x-forwarded-proto"]).toLowerCase();
  const forwardedSsl = forwardedHeaderValue(request.headers["x-forwarded-ssl"]).toLowerCase();
  return forwardedProto === "https" || forwardedSsl === "on" || Boolean(request.socket?.encrypted);
}

function setCookie(response, name, value, options = {}) {
  const sameSite = options.sameSite || "Lax";
  const pathValue = options.path || "/";
  const parts = [`${name}=${encodeURIComponent(value)}`, `Path=${pathValue}`, "HttpOnly", `SameSite=${sameSite}`];
  if (options.maxAge !== undefined) parts.push(`Max-Age=${Math.floor(options.maxAge)}`);
  if (options.expires) parts.push(`Expires=${options.expires.toUTCString()}`);
  if (options.secure) parts.push("Secure");
  response.setHeader("Set-Cookie", parts.join("; "));
}

function clearCookie(response, name, options = {}) {
  setCookie(response, name, "", {
    ...options,
    maxAge: 0,
    expires: new Date(0),
  });
}

function sendJson(response, statusCode, payload) {
  const body = JSON.stringify(payload);
  response.writeHead(statusCode, {
    ...buildSecurityHeaders(),
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  response.end(body);
}

function sendText(response, statusCode, text, contentType = "text/plain; charset=utf-8") {
  response.writeHead(statusCode, {
    ...buildSecurityHeaders(),
    "Content-Type": contentType,
    "Cache-Control": "no-cache",
  });
  response.end(text);
}

function sendRedirect(response, location, statusCode = 308) {
  response.writeHead(statusCode, {
    ...buildSecurityHeaders(),
    "Location": location,
    "Cache-Control": "no-store",
  });
  response.end();
}

function cleanupExpiredSessions(force = false) {
  const timestamp = Date.now();
  if (!force && timestamp - lastSessionCleanupAt < 5 * 60 * 1000) return;
  lastSessionCleanupAt = timestamp;
  statements.deleteExpiredSessions.run(nowIso());
}

function rateLimitKey(scope, value) {
  return `${scope}:${sha256(String(value || "unknown")).slice(0, 32)}`;
}

function pruneAuthRateLimits(timestamp = Date.now()) {
  for (const [key, entry] of authRateLimits.entries()) {
    if (entry.resetAt <= timestamp && (!entry.blockedUntil || entry.blockedUntil <= timestamp)) {
      authRateLimits.delete(key);
    }
  }
}

function getRateLimitEntry(key, policy, timestamp = Date.now()) {
  pruneAuthRateLimits(timestamp);
  const existing = authRateLimits.get(key);
  if (!existing || existing.resetAt <= timestamp) {
    const fresh = { count: 0, resetAt: timestamp + policy.windowMs, blockedUntil: 0 };
    authRateLimits.set(key, fresh);
    return fresh;
  }
  return existing;
}

function checkRateLimit(key, policy) {
  const timestamp = Date.now();
  const entry = getRateLimitEntry(key, policy, timestamp);
  if (entry.blockedUntil > timestamp) {
    return {
      limited: true,
      retryAfter: Math.max(Math.ceil((entry.blockedUntil - timestamp) / 1000), 1),
    };
  }
  return { limited: false, retryAfter: 0 };
}

function recordRateLimitAttempt(key, policy) {
  const timestamp = Date.now();
  const entry = getRateLimitEntry(key, policy, timestamp);
  entry.count += 1;
  if (entry.count > policy.max) {
    entry.blockedUntil = timestamp + policy.blockMs;
  }
}

function clearRateLimit(key) {
  authRateLimits.delete(key);
}

function enforceAuthRateLimit(response, checks) {
  for (const check of checks) {
    const result = checkRateLimit(check.key, check.policy);
    if (result.limited) {
      response.setHeader("Retry-After", String(result.retryAfter));
      sendJson(response, 429, {
        error: "too_many_requests",
        message: "Muitas tentativas. Aguarde um pouco e tente novamente.",
      });
      return true;
    }
  }
  return false;
}

function loginRateChecks(request, email = "") {
  const checks = [
    { key: rateLimitKey("login:ip", getClientIp(request)), policy: RATE_LIMIT_POLICIES.loginIp },
  ];
  if (email) {
    checks.push({ key: rateLimitKey("login:email", email), policy: RATE_LIMIT_POLICIES.loginEmail });
  }
  return checks;
}

function registerRateChecks(request) {
  return [
    { key: rateLimitKey("register:ip", getClientIp(request)), policy: RATE_LIMIT_POLICIES.registerIp },
  ];
}

function recordRateLimitAttempts(checks) {
  checks.forEach((check) => recordRateLimitAttempt(check.key, check.policy));
}

function readBufferBody(request, limitBytes = 1024 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    request.on("data", (chunk) => {
      size += chunk.length;
      if (size > limitBytes) {
        const error = new Error("Payload too large");
        error.statusCode = 413;
        error.code = "payload_too_large";
        reject(error);
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });
    request.on("end", () => {
      resolve(Buffer.concat(chunks));
    });
    request.on("error", reject);
  });
}

async function readJsonBody(request, limitBytes = 1024 * 1024) {
  const buffer = await readBufferBody(request, limitBytes);
  if (!buffer.length) return {};
  try {
    return JSON.parse(buffer.toString("utf8"));
  } catch {
    const error = new Error("Invalid JSON");
    error.statusCode = 400;
    error.code = "invalid_json";
    throw error;
  }
}

function parseMultipartFormData(buffer, contentType) {
  const boundaryMatch = /boundary=(?:"([^"]+)"|([^;]+))/i.exec(contentType || "");
  if (!boundaryMatch) {
    const error = new Error("invalid_multipart");
    error.statusCode = 400;
    throw error;
  }

  const boundary = boundaryMatch[1] || boundaryMatch[2];
  const body = buffer.toString("binary");
  const segments = body.split(`--${boundary}`);
  const fields = {};
  const files = [];

  for (const segment of segments.slice(1, -1)) {
    let part = segment;
    if (part.startsWith("\r\n")) part = part.slice(2);
    if (part.endsWith("\r\n")) part = part.slice(0, -2);
    const headerEnd = part.indexOf("\r\n\r\n");
    if (headerEnd < 0) continue;

    const headerText = part.slice(0, headerEnd);
    let dataText = part.slice(headerEnd + 4);
    if (dataText.endsWith("\r\n")) dataText = dataText.slice(0, -2);
    const headers = headerText.split("\r\n").reduce((acc, line) => {
      const index = line.indexOf(":");
      if (index > 0) {
        const key = line.slice(0, index).trim().toLowerCase();
        acc[key] = line.slice(index + 1).trim();
      }
      return acc;
    }, {});

    const disposition = parseContentDisposition(headers["content-disposition"]);
    if (!disposition.name) continue;

    if (disposition.filename) {
      files.push({
        name: disposition.name,
        filename: disposition.filename,
        contentType: headers["content-type"] || "application/octet-stream",
        buffer: Buffer.from(dataText, "binary"),
      });
    } else {
      fields[disposition.name] = Buffer.from(dataText, "binary").toString("utf8");
    }
  }

  return { fields, files };
}

function parseContentDisposition(value = "") {
  const result = {};
  value
    .split(";")
    .map((item) => item.trim())
    .forEach((item, index) => {
      if (index === 0) return;
      const [key, raw] = item.split("=");
      if (!key) return;
      const normalized = raw ? raw.trim().replace(/^"|"$/g, "") : "";
      result[key.trim().toLowerCase()] = normalized;
    });
  return result;
}

function normalizeRequestPath(pathname) {
  if (!appBasePath) return pathname;
  if (pathname === appBasePath) return "/";
  if (pathname.startsWith(`${appBasePath}/`)) {
    const stripped = pathname.slice(appBasePath.length);
    return stripped || "/";
  }
  return pathname;
}

function getSessionToken(request) {
  return parseCookies(request.headers.cookie || "")[SESSION_COOKIE_NAME] || "";
}

function getAuthContext(request) {
  cleanupExpiredSessions();
  const token = getSessionToken(request);
  if (!token) return null;

  const tokenHash = sha256(token);
  const session = statements.findSessionByToken.get(tokenHash);
  if (!session) return null;

  const expiresAt = new Date(session.expiresAt);
  if (Number.isNaN(expiresAt.getTime()) || expiresAt <= new Date()) {
    statements.deleteSessionById.run(session.id);
    return null;
  }

  statements.updateSessionSeen.run(nowIso(), session.id);
  const user = statements.findUserById.get(session.userId);
  if (!user) {
    statements.deleteSessionById.run(session.id);
    return null;
  }

  return { sessionId: session.id, user };
}

function requireAuth(request, response) {
  const context = getAuthContext(request);
  if (!context) {
    sendJson(response, 401, { error: "unauthorized" });
    return null;
  }
  return context;
}

function seedDefaultCategories(userId) {
  const createdAt = nowIso();
  const insert = statements.insertCategory;
  const defaults = [
    ...defaultCategoriesByType.income.map((name) => ({ type: "income", name })),
    ...defaultCategoriesByType.expense.map((name) => ({ type: "expense", name })),
  ];

  defaults.forEach((entry) => {
    const normalizedName = normalizeName(entry.name);
    const slug = slugify(normalizedName);
    if (!slug) return;
    const exists = statements.findCategoryBySlug.get(userId, entry.type, slug);
    if (exists) return;
    insert.run({
      id: uuid(),
      userId,
      type: entry.type,
      name: normalizedName,
      slug,
      isDefault: 1,
      createdAt,
      updatedAt: createdAt,
    });
  });
}

function serializeUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function serializeCategory(row) {
  return {
    id: row.id,
    type: row.type,
    name: row.name,
    slug: row.slug,
    isDefault: Boolean(row.isDefault),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function serializeMovement(row) {
  const receiptStoredName = row.receiptStoredName || row.receipt_stored_name || null;
  const receiptOriginalName = row.receiptOriginalName || row.receipt_original_name || null;
  const receiptMimeType = row.receiptMimeType || row.receipt_mime_type || null;
  const receiptSize = row.receiptSize || row.receipt_size || null;
  const receiptUploadedAt = row.receiptUploadedAt || row.receipt_uploaded_at || null;
  const receipt = receiptStoredName
    ? {
        storedName: receiptStoredName,
        originalName: receiptOriginalName,
        mimeType: receiptMimeType,
        size: Number(receiptSize || 0),
        uploadedAt: receiptUploadedAt,
        url: withAppBasePath(`/api/movements/${row.id}/receipt`),
        kind: receiptKindForMime(receiptMimeType),
      }
    : null;

  return {
    id: row.id,
    type: row.type,
    amount: Number(row.amount),
    categoryId: row.categoryId,
    categoryName: row.categoryName,
    categoryType: row.categoryType,
    description: row.description,
    date: row.date || row.movementDate || row.movement_date || "",
    sourceKey: row.sourceKey,
    receipt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function listCategoriesByUser(userId) {
  const rows = statements.listCategories.all(userId).map(serializeCategory);
  return {
    income: rows.filter((row) => row.type === "income"),
    expense: rows.filter((row) => row.type === "expense"),
  };
}

function serializeCycle(row) {
  if (!row) return null;
  const incomeTotal = Number(row.incomeTotal || 0);
  const expenseTotal = Number(row.expenseTotal || 0);
  return {
    id: row.id,
    userId: row.userId,
    label: row.label,
    status: row.status,
    startedAt: row.startedAt,
    closedAt: row.closedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    incomeTotal,
    expenseTotal,
    balance: incomeTotal - expenseTotal,
    movementCount: Number(row.movementCount || 0),
  };
}

function serializeGoal(row) {
  if (!row) return null;
  const targetAmount = Number(row.targetAmount || 0);
  const savedAmount = Number(row.savedAmount || 0);
  const accent = normalizeGoalAccent(row.accent, "") || pickGoalAccentSeed(row.slug || row.name || row.id || "goal");
  return {
    id: row.id,
    userId: row.userId,
    name: row.name,
    slug: row.slug,
    accent,
    targetAmount,
    savedAmount,
    remainingAmount: Math.max(targetAmount - savedAmount, 0),
    progress: targetAmount > 0 ? Math.max(Math.round((savedAmount / targetAmount) * 100), 0) : 0,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function serializeCommitment(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.userId,
    cycleId: row.cycleId,
    type: row.type,
    description: row.description,
    amount: Number(row.amount || 0),
    status: row.status,
    dueDate: row.dueDate || null,
    completedAt: row.completedAt || null,
    convertedMovementId: row.convertedMovementId || null,
    convertedAt: row.convertedAt || null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function listMovementsByCycle(userId, cycleId) {
  return statements.listMovementsByCycle.all(userId, cycleId).map(serializeMovement);
}

function listMovementsByCycleNoJoin(userId, cycleId) {
  return statements.listMovementsByCycleNoJoin.all(userId, cycleId).map(serializeMovement);
}

function listCyclesByUser(userId) {
  return statements.listCyclesByUser.all(userId).map(serializeCycle);
}

function listClosedCyclesByUser(userId) {
  return statements.listClosedCyclesByUser.all(userId).map(serializeCycle);
}

function listGoalsByUser(userId) {
  return statements.listGoalsByUser.all(userId).map(serializeGoal);
}

function listCommitmentsByCycle(userId, cycleId) {
  return statements.listCommitmentsByCycle.all(userId, cycleId).map(serializeCommitment);
}

function getCycleSummary(userId, cycleId) {
  return serializeCycle(statements.listCycleSummaryById.get(userId, cycleId));
}

function getCurrentCycle(userId) {
  return serializeCycle(statements.findActiveCycleByUser.get(userId));
}

function ensureCurrentCycle(userId) {
  let cycle = statements.findActiveCycleByUser.get(userId);
  const createdAt = nowIso();
  if (!cycle) {
    const earliest = db
      .prepare(`SELECT MIN(movement_date) AS firstDate FROM movements WHERE user_id = ?`)
      .get(userId)?.firstDate;
    const startedAt = earliest ? new Date(`${earliest}T00:00:00`).toISOString() : createdAt;
    const id = uuid();
    statements.insertCycle.run({
      id,
      userId,
      label: "Ciclo atual",
      status: "active",
      startedAt,
      closedAt: null,
      createdAt,
      updatedAt: createdAt,
    });
    cycle = statements.findActiveCycleByUser.get(userId);
  }

  const missingMovements = db
    .prepare(`SELECT COUNT(*) AS count FROM movements WHERE user_id = ? AND cycle_id IS NULL`)
    .get(userId).count;
  if (missingMovements > 0) {
    statements.assignLegacyMovementsToCycle.run(cycle.id, userId);
  }

  return getCycleSummary(userId, cycle.id) || serializeCycle(cycle);
}

function getGoalSummary(userId) {
  return Number(statements.sumGoalsSavedByUser.get(userId)?.total || 0);
}

function formatCycleLabel(startedAt, closedAt) {
  const formatter = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" });
  const start = formatter.format(new Date(startedAt));
  const end = formatter.format(new Date(closedAt));
  return `${start} - ${end}`;
}

function closeCurrentCycle(userId) {
  const activeCycle = statements.findActiveCycleByUser.get(userId);
  if (!activeCycle) {
    const error = new Error("active_cycle_not_found");
    error.statusCode = 404;
    throw error;
  }

  const cycleSummaryRow = statements.listCycleSummaryById.get(userId, activeCycle.id);
  const cycleSummary = serializeCycle(cycleSummaryRow);
  const closingBalance = cycleSummary ? Number(cycleSummary.balance || 0) : 0;

  const closedAt = nowIso();
  const label = formatCycleLabel(activeCycle.startedAt, closedAt);
  const newCycleId = uuid();
  const newStartedAt = closedAt;
  const timestamp = nowIso();

  db.exec("BEGIN");
  try {
    statements.updateCycleClose.run(label, closedAt, timestamp, activeCycle.id, userId);
    statements.insertCycle.run({
      id: newCycleId,
      userId,
      label: "Ciclo atual",
      status: "active",
      startedAt: newStartedAt,
      closedAt: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    if (closingBalance !== 0) {
      const type = closingBalance > 0 ? "income" : "expense";
      const amount = Math.abs(closingBalance);
      const catSlug = "outros";
      
      const cat = db.prepare("SELECT id FROM categories WHERE user_id = ? AND type = ? AND slug = ? LIMIT 1").get(userId, type, catSlug);
      
      if (cat) {
        statements.insertMovement.run({
          id: uuid(),
          userId,
          cycleId: newCycleId,
          type,
          amount,
          categoryId: cat.id,
          description: closingBalance > 0 ? "Restante do ciclo anterior" : "Dívida do ciclo anterior",
          movementDate: timestamp.split("T")[0],
          sourceKey: uuid(),
          receiptStoredName: null,
          receiptOriginalName: null,
          receiptMimeType: null,
          receiptSize: null,
          receiptUploadedAt: null,
          createdAt: timestamp,
          updatedAt: timestamp
        });
      }
    }

    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }

  return {
    closedCycle: serializeCycle(statements.findCycleById.get(activeCycle.id, userId)),
    currentCycle: serializeCycle(statements.findActiveCycleByUser.get(userId)),
    cycles: listCyclesByUser(userId),
  };
}

function ensureGoalCapacity(userId, name, targetAmount, accentValue) {
  const normalizedName = normalizeGoalName(name);
  const slug = slugify(normalizedName);
  const amount = parsePositiveAmount(targetAmount, { code: "invalid_goal" });
  const accent = normalizeGoalAccent(accentValue, "cyan");

  if (!normalizedName || !slug) {
    const error = new Error("invalid_goal");
    error.statusCode = 400;
    throw error;
  }

  const existing = statements.findGoalBySlug.get(userId, slug);
  if (existing) {
    const error = new Error("goal_exists");
    error.statusCode = 409;
    throw error;
  }

  const timestamp = nowIso();
  const id = uuid();
  statements.insertGoal.run({
    id,
    userId,
    name: normalizedName,
    slug,
    accent,
    targetAmount: amount,
    savedAmount: 0,
    createdAt: timestamp,
    updatedAt: timestamp,
  });

  return statements.findGoalById.get(id, userId);
}

function updateGoalCapacity(userId, goalId, name, targetAmount, accentValue) {
  const current = statements.findGoalById.get(goalId, userId);
  if (!current) {
    const error = new Error("goal_not_found");
    error.statusCode = 404;
    throw error;
  }

  const normalizedName = normalizeGoalName(name);
  const slug = slugify(normalizedName);
  const amount = parsePositiveAmount(targetAmount, { code: "invalid_goal" });
  const accent = accentValue && String(accentValue).trim()
    ? normalizeGoalAccent(accentValue, current.accent || "cyan")
    : current.accent || null;

  if (!normalizedName || !slug) {
    const error = new Error("invalid_goal");
    error.statusCode = 400;
    throw error;
  }

  const existing = statements.findGoalBySlug.get(userId, slug);
  if (existing && existing.id !== current.id) {
    const error = new Error("goal_exists");
    error.statusCode = 409;
    throw error;
  }

  if (amount < Number(current.savedAmount || 0)) {
    const error = new Error("goal_target_too_low");
    error.statusCode = 409;
    throw error;
  }

  const timestamp = nowIso();
  statements.updateGoal.run(normalizedName, slug, accent, amount, timestamp, goalId, userId);
  return statements.findGoalById.get(goalId, userId);
}

function saveGoalAmount(userId, goalId, amountToSave) {
  const goal = statements.findGoalById.get(goalId, userId);
  if (!goal) {
    const error = new Error("goal_not_found");
    error.statusCode = 404;
    throw error;
  }

  const amount = parsePositiveAmount(amountToSave, { code: "invalid_goal_amount" });

  const currentCycle = getCurrentCycle(userId);
  const cycleSummaryRow = statements.listCycleSummaryById.get(userId, currentCycle.id);
  const cycleSummary = serializeCycle(cycleSummaryRow);
  const availableBalance = Number(cycleSummary?.balance || 0);
  if (amount > availableBalance) {
    const error = new Error("insufficient_goal_balance");
    error.statusCode = 409;
    throw error;
  }

  const nextSaved = Number(goal.savedAmount || 0) + amount;
  statements.updateGoalSavedAmount.run(nextSaved, nowIso(), goalId, userId);

  const category = ensureCategoryCapacity(userId, "expense", "outros");
  upsertMovement(userId, {
    type: "expense",
    amount,
    categoryId: category.id,
    description: `Depósito na meta: ${goal.name}`,
    date: new Date().toISOString().split("T")[0]
  });

  return statements.findGoalById.get(goalId, userId);
}

function removeGoalAmount(userId, goalId, amountToRemove) {
  const goal = statements.findGoalById.get(goalId, userId);
  if (!goal) {
    const error = new Error("goal_not_found");
    error.statusCode = 404;
    throw error;
  }

  const amount = parsePositiveAmount(amountToRemove, { code: "invalid_goal_amount" });

  const currentSaved = Number(goal.savedAmount || 0);
  if (amount > currentSaved) {
    const error = new Error("goal_insufficient_saved");
    error.statusCode = 409;
    throw error;
  }

  const nextSaved = currentSaved - amount;
  statements.updateGoalSavedAmount.run(nextSaved, nowIso(), goalId, userId);

  const category = ensureCategoryCapacity(userId, "income", "outros");
  upsertMovement(userId, {
    type: "income",
    amount,
    categoryId: category.id,
    description: `Resgate da meta: ${goal.name}`,
    date: new Date().toISOString().split("T")[0]
  });

  return statements.findGoalById.get(goalId, userId);
}

function deleteGoalById(userId, goalId) {
  const goal = statements.findGoalById.get(goalId, userId);
  if (!goal) {
    const error = new Error("goal_not_found");
    error.statusCode = 404;
    throw error;
  }

  statements.deleteGoal.run(goalId, userId);
  return goal;
}

function normalizeCommitmentType(value) {
  return value === "receivable" ? "receivable" : "payable";
}

function ensureCommitmentCapacity(userId, cycleId, body) {
  const type = normalizeCommitmentType(body.type);
  const description = normalizeCommitmentDescription(body.description);
  const amount = parsePositiveAmount(body.amount, { code: "invalid_commitment" });
  const normalizedDueDate = validateIsoDate(body.dueDate || body.due_date, "invalid_commitment_due_date", { allowEmpty: true });

  if (!description) {
    const error = new Error("invalid_commitment");
    error.statusCode = 400;
    throw error;
  }

  const timestamp = nowIso();
  const id = String(body.id || uuid()).trim();
  const existing = statements.findCommitmentById.get(id, userId, cycleId);
  if (existing) {
    const error = new Error("commitment_exists");
    error.statusCode = 409;
    throw error;
  }

  statements.insertCommitment.run({
    id,
    userId,
    cycleId,
    type,
    description,
    amount,
    status: "pending",
    dueDate: normalizedDueDate,
    completedAt: null,
    convertedMovementId: null,
    convertedAt: null,
    createdAt: timestamp,
    updatedAt: timestamp,
  });

  return statements.findCommitmentById.get(id, userId, cycleId);
}

function updateCommitmentById(userId, cycleId, commitmentId, body) {
  const current = statements.findCommitmentById.get(commitmentId, userId, cycleId);
  if (!current) {
    const error = new Error("commitment_not_found");
    error.statusCode = 404;
    throw error;
  }

  const type = normalizeCommitmentType(body.type || current.type);
  const description = normalizeCommitmentDescription(body.description);
  const amount = parsePositiveAmount(body.amount, { code: "invalid_commitment" });
  const normalizedDueDate = validateIsoDate(body.dueDate || body.due_date, "invalid_commitment_due_date", { allowEmpty: true });

  if (!description) {
    const error = new Error("invalid_commitment");
    error.statusCode = 400;
    throw error;
  }

  const timestamp = nowIso();
  statements.updateCommitment.run(type, description, amount, normalizedDueDate, timestamp, commitmentId, userId, cycleId);
  return statements.findCommitmentById.get(commitmentId, userId, cycleId);
}

function setCommitmentStatus(userId, cycleId, commitmentId, status) {
  const current = statements.findCommitmentById.get(commitmentId, userId, cycleId);
  if (!current) {
    const error = new Error("commitment_not_found");
    error.statusCode = 404;
    throw error;
  }

  const nextStatus = status === "done" ? "done" : "pending";
  const completedAt = nextStatus === "done" ? (current.completedAt || nowIso()) : null;
  statements.updateCommitmentStatus.run(nextStatus, completedAt, nowIso(), commitmentId, userId, cycleId);
  return statements.findCommitmentById.get(commitmentId, userId, cycleId);
}

function convertCommitmentToMovement(userId, cycleId, commitmentId, cycleSummaryOverride = null) {
  const current = statements.findCommitmentById.get(commitmentId, userId, cycleId);
  if (!current) {
    const error = new Error("commitment_not_found");
    error.statusCode = 404;
    throw error;
  }

  const sourceKey = `commitment:${current.id}:launch`;
  const existingMovement = statements.findMovementBySource.get(userId, sourceKey);
  const completedAt = current.completedAt || nowIso();
  const movementDate = completedAt.slice(0, 10);
  if (existingMovement?.id) {
    const timestamp = nowIso();
    if (current.status !== "done" || !current.completedAt) {
      statements.updateCommitmentStatus.run("done", completedAt, timestamp, commitmentId, userId, cycleId);
    }
    const existingMovementData = statements.findMovementById.get(existingMovement.id, userId);
    if (existingMovementData && existingMovementData.date !== movementDate) {
      statements.updateMovement.run(
        existingMovementData.type,
        existingMovementData.amount,
        existingMovementData.categoryId,
        existingMovementData.description,
        movementDate,
        timestamp,
        existingMovementData.id,
        userId,
      );
    }
    if (!current.convertedMovementId || current.convertedMovementId !== existingMovement.id) {
      statements.updateCommitmentConversion.run(existingMovement.id, current.convertedAt || timestamp, timestamp, commitmentId, userId, cycleId);
    }
    return {
      commitment: statements.findCommitmentById.get(commitmentId, userId, cycleId),
      movement: statements.findMovementById.get(existingMovement.id, userId),
      created: false,
    };
  }

  if (current.type === "payable") {
    const cycleSummary = cycleSummaryOverride || statements.listCycleSummaryById.get(userId, cycleId);
    const reservedTotal = getGoalSummary(userId);
    const availableBalance = Number(cycleSummary?.balance || 0) - Number(reservedTotal || 0);
    if (availableBalance < Number(current.amount || 0)) {
      const error = new Error("insufficient_balance");
      error.statusCode = 409;
      error.availableBalance = availableBalance;
      error.requiredBalance = Number(current.amount || 0);
      throw error;
    }
  }

  const timestamp = nowIso();
  const movementId = uuid();
  const categoryType = current.type === "receivable" ? "income" : "expense";
  const category = ensureCategoryCapacity(userId, categoryType, "outros");
  const finalStatus = "done";

  db.exec("BEGIN");
  try {
    const refreshed = statements.findCommitmentById.get(commitmentId, userId, cycleId);
    const refreshedSourceKey = `commitment:${refreshed.id}:launch`;
    const recheckMovement = statements.findMovementBySource.get(userId, refreshedSourceKey);
    if (recheckMovement?.id) {
      if (refreshed.status !== "done" || !refreshed.completedAt) {
        statements.updateCommitmentStatus.run("done", completedAt, timestamp, commitmentId, userId, cycleId);
      }
      const recheckMovementData = statements.findMovementById.get(recheckMovement.id, userId);
      if (recheckMovementData && recheckMovementData.date !== movementDate) {
        statements.updateMovement.run(
          recheckMovementData.type,
          recheckMovementData.amount,
          recheckMovementData.categoryId,
          recheckMovementData.description,
          movementDate,
          timestamp,
          recheckMovementData.id,
          userId,
        );
      }
      if (!refreshed.convertedMovementId || refreshed.convertedMovementId !== recheckMovement.id) {
        statements.updateCommitmentConversion.run(recheckMovement.id, refreshed.convertedAt || timestamp, timestamp, commitmentId, userId, cycleId);
      }
      db.exec("COMMIT");
      return {
        commitment: statements.findCommitmentById.get(commitmentId, userId, cycleId),
        movement: statements.findMovementById.get(recheckMovement.id, userId),
        created: false,
      };
    }

    statements.insertMovement.run({
      id: movementId,
      userId,
      cycleId,
      type: categoryType,
      amount: current.amount,
      categoryId: category.id,
      description: current.description,
      movementDate,
      sourceKey: refreshedSourceKey,
      receiptStoredName: null,
      receiptOriginalName: null,
      receiptMimeType: null,
      receiptSize: null,
      receiptUploadedAt: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
    statements.updateCommitmentStatus.run(finalStatus, completedAt, timestamp, commitmentId, userId, cycleId);
    statements.updateCommitmentConversion.run(movementId, timestamp, timestamp, commitmentId, userId, cycleId);
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }

  return {
    commitment: statements.findCommitmentById.get(commitmentId, userId, cycleId),
    movement: statements.findMovementById.get(movementId, userId),
    created: true,
  };
}

function reopenCommitmentAndRevertMovement(userId, cycleId, commitmentId) {
  const current = statements.findCommitmentById.get(commitmentId, userId, cycleId);
  if (!current) {
    const error = new Error("commitment_not_found");
    error.statusCode = 404;
    throw error;
  }

  const timestamp = nowIso();
  const linkedMovementId = current.convertedMovementId || null;
  const linkedMovement = linkedMovementId ? statements.findMovementById.get(linkedMovementId, userId) : null;
  const linkedBySource = linkedMovement ? linkedMovement : statements.findMovementBySource.get(userId, `commitment:${current.id}:launch`);
  let receiptPathToDelete = "";

  db.exec("BEGIN");
  try {
    if (linkedBySource?.id) {
      const linkedFull = statements.findMovementById.get(linkedBySource.id, userId);
      if (linkedFull?.receipt_stored_name) {
        receiptPathToDelete = getReceiptFilePath(linkedFull.receipt_stored_name);
      }
      statements.deleteMovement.run(linkedBySource.id, userId);
    }
    statements.updateCommitmentStatus.run("pending", null, timestamp, commitmentId, userId, cycleId);
    statements.updateCommitmentConversion.run(null, null, timestamp, commitmentId, userId, cycleId);
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }

  if (receiptPathToDelete) {
    deleteFileIfExists(receiptPathToDelete);
  }

  return statements.findCommitmentById.get(commitmentId, userId, cycleId);
}

function listAllowedReceiptInfo(file) {
  if (!file) return null;
  const mimeType = isReceiptSupported(file.contentType, file.filename);
  if (!mimeType) {
    const error = new Error("invalid_receipt_type");
    error.statusCode = 400;
    throw error;
  }

  const maxSize = receiptKindForMime(mimeType) === "pdf" ? RECEIPT_LIMITS.pdf : RECEIPT_LIMITS.image;
  if (!Number.isFinite(file.buffer?.length) || file.buffer.length <= 0 || file.buffer.length > maxSize) {
    const error = new Error(file.buffer?.length > maxSize ? "receipt_too_large" : "invalid_receipt");
    error.statusCode = file.buffer?.length > maxSize ? 413 : 400;
    throw error;
  }

  return {
    mimeType,
    originalName: String(file.filename || "comprovante").trim() || "comprovante",
    size: file.buffer.length,
    kind: receiptKindForMime(mimeType),
  };
}

function replaceMovementReceipt(userId, movementId, file) {
  const current = statements.findActiveMovementById.get(movementId, userId);
  if (!current) {
    const exists = statements.findMovementById.get(movementId, userId);
    if (exists) {
      const error = new Error("cycle_closed");
      error.statusCode = 409;
      throw error;
    }
    const error = new Error("movement_not_found");
    error.statusCode = 404;
    throw error;
  }

  if (current.type !== "expense") {
    const error = new Error("receipt_not_allowed");
    error.statusCode = 409;
    throw error;
  }

  const info = listAllowedReceiptInfo(file);
  const storedName = buildReceiptStoredName(movementId, info.mimeType);
  const targetPath = getReceiptFilePath(storedName);
  const previous = statements.findMovementById.get(movementId, userId);
  const previousPath = previous?.receipt_stored_name ? getReceiptFilePath(previous.receipt_stored_name) : "";
  const timestamp = nowIso();

  fs.writeFileSync(targetPath, file.buffer);
  try {
    statements.updateMovementReceipt.run(
      storedName,
      info.originalName,
      info.mimeType,
      info.size,
      timestamp,
      timestamp,
      movementId,
      userId,
    );
    deleteFileIfExists(previousPath);
  } catch (error) {
    deleteFileIfExists(targetPath);
    throw error;
  }

  return statements.findMovementById.get(movementId, userId);
}

function clearMovementReceiptById(userId, movementId) {
  const current = statements.findMovementById.get(movementId, userId);
  if (!current) {
    const error = new Error("movement_not_found");
    error.statusCode = 404;
    throw error;
  }

  const previousPath = current.receipt_stored_name ? getReceiptFilePath(current.receipt_stored_name) : "";
  statements.clearMovementReceipt.run(nowIso(), movementId, userId);
  deleteFileIfExists(previousPath);
  return statements.findMovementById.get(movementId, userId);
}

function getMovementReceiptFile(userId, movementId) {
  const current = statements.findMovementById.get(movementId, userId);
  if (!current) {
    const error = new Error("movement_not_found");
    error.statusCode = 404;
    throw error;
  }

  if (!current.receipt_stored_name) {
    const error = new Error("receipt_not_found");
    error.statusCode = 404;
    throw error;
  }

  const filePath = getReceiptFilePath(current.receipt_stored_name);
  if (!fs.existsSync(filePath)) {
    const error = new Error("receipt_not_found");
    error.statusCode = 404;
    throw error;
  }

  return {
    filePath,
    mimeType: current.receipt_mime_type || "application/octet-stream",
    fileName: current.receipt_original_name || "comprovante",
  };
}

function findCategoryForUserOrThrow(userId, categoryId) {
  const category = statements.findCategoryById.get(categoryId, userId);
  if (!category) {
    const error = new Error("category_not_found");
    error.statusCode = 404;
    throw error;
  }
  return category;
}

function ensureCategoryCapacity(userId, type, name) {
  const normalizedName = normalizeName(name);
  const slug = slugify(normalizedName);
  if (!normalizedName || !slug) {
    const error = new Error("invalid_category");
    error.statusCode = 400;
    throw error;
  }

  const existing = statements.findCategoryBySlug.get(userId, type, slug);
  if (existing) return existing;

  const timestamp = nowIso();
  const id = uuid();
  statements.insertCategory.run({
    id,
    userId,
    type,
    name: normalizedName,
    slug,
    isDefault: 0,
    createdAt: timestamp,
    updatedAt: timestamp,
  });

  return statements.findCategoryById.get(id, userId);
}

function upsertMovement(userId, body, existingId = null) {
  const currentCycle = ensureCurrentCycle(userId);
  const type = body.type === "income" ? "income" : "expense";
  const amount = parsePositiveAmount(body.amount, { code: "invalid_movement" });
  const categoryId = String(body.categoryId || "").trim();
  const description = normalizeMovementDescription(body.description);
  const date = validateIsoDate(body.date, "invalid_movement_date");
  const sourceKey = String(body.sourceKey || body.id || existingId || uuid()).trim();
  const movementId = String(body.id || existingId || sourceKey || uuid()).trim();

  if (!categoryId || !description || !date || !sourceKey || !movementId || categoryId.length > 128 || sourceKey.length > 128 || movementId.length > 128) {
    const error = new Error("invalid_movement");
    error.statusCode = 400;
    throw error;
  }

  const category = findCategoryForUserOrThrow(userId, categoryId);
  if (category.type !== type) {
    const error = new Error("category_type_mismatch");
    error.statusCode = 400;
    throw error;
  }

  const existing = existingId
    ? statements.findActiveMovementById.get(existingId, userId)
    : statements.findActiveMovementBySource.get(userId, sourceKey);

  const timestamp = nowIso();
  if (existing) {
    statements.updateMovement.run(type, amount, categoryId, description, date, timestamp, existing.id, userId);
    return { id: existing.id, created: false };
  }

  statements.insertMovement.run({
    id: movementId,
    userId,
    cycleId: currentCycle.id,
    type,
    amount,
    categoryId,
    description,
    movementDate: date,
    sourceKey,
    receiptStoredName: null,
    receiptOriginalName: null,
    receiptMimeType: null,
    receiptSize: null,
    receiptUploadedAt: null,
    createdAt: timestamp,
    updatedAt: timestamp,
  });

  return { id: movementId, created: true };
}

function collectUserBootstrap(userId) {
  const currentCycle = ensureCurrentCycle(userId);
  return {
    user: serializeUser(statements.findUserById.get(userId)),
    currentCycle,
    cycles: listCyclesByUser(userId),
    categories: listCategoriesByUser(userId),
    movements: listMovementsByCycle(userId, currentCycle.id),
    goals: listGoalsByUser(userId),
    commitments: listCommitmentsByCycle(userId, currentCycle.id),
  };
}

function sendAuthCookie(request, response, sessionToken, expiresAt) {
  setCookie(response, SESSION_COOKIE_NAME, sessionToken, {
    expires: expiresAt,
    maxAge: Math.floor((expiresAt.getTime() - Date.now()) / 1000),
    secure: isSecureRequest(request),
  });
}

function clearAuthCookie(request, response) {
  clearCookie(response, SESSION_COOKIE_NAME, {
    secure: isSecureRequest(request),
  });
}

function createSession(userId, request, response) {
  cleanupExpiredSessions();
  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = sha256(token);
  const createdAt = nowIso();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  statements.insertSession.run({
    id: uuid(),
    userId,
    tokenHash,
    createdAt,
    lastSeenAt: createdAt,
    expiresAt: expiresAt.toISOString(),
  });
  sendAuthCookie(request, response, token, expiresAt);
}

function registerUser(body, request, response) {
  const checks = registerRateChecks(request);
  if (enforceAuthRateLimit(response, checks)) return;
  recordRateLimitAttempts(checks);

  const credentials = validateAuthPayload(body, { requireStrongPassword: true });
  if (!credentials) {
    sendJson(response, 400, { error: "invalid_auth_request" });
    return;
  }

  const { email, password } = credentials;
  const existing = statements.findUserByEmail.get(email);
  if (existing) {
    sendJson(response, 400, { error: "registration_failed" });
    return;
  }

  const userId = uuid();
  const createdAt = nowIso();
  const { salt, hash } = hashPassword(password);

  db.exec("BEGIN");
  try {
    statements.insertUser.run({
      id: userId,
      email,
      salt,
      hash,
      createdAt,
      updatedAt: createdAt,
    });
    seedDefaultCategories(userId);
    ensureCurrentCycle(userId);
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }

  createSession(userId, request, response);
  sendJson(response, 201, { user: serializeUser(statements.findUserById.get(userId)) });
}

function loginUser(body, request, response) {
  const ipChecks = loginRateChecks(request);
  if (enforceAuthRateLimit(response, ipChecks)) return;

  const credentials = validateAuthPayload(body);
  if (!credentials) {
    recordRateLimitAttempts(ipChecks);
    sendJson(response, 400, { error: "invalid_credentials" });
    return;
  }

  const { email, password } = credentials;
  const checks = loginRateChecks(request, email);
  if (enforceAuthRateLimit(response, checks)) return;

  const user = statements.findUserByEmail.get(email);
  if (!user || !verifyPassword(password, user.password_salt, user.password_hash)) {
    recordRateLimitAttempts(checks);
    sendJson(response, 401, { error: "invalid_credentials" });
    return;
  }

  checks.forEach((check) => clearRateLimit(check.key));
  createSession(user.id, request, response);
  sendJson(response, 200, { user: serializeUser(statements.findUserById.get(user.id)) });
}

function logoutUser(request, response) {
  const token = getSessionToken(request);
  if (token) {
    statements.deleteSessionByTokenHash.run(sha256(token));
  }
  clearAuthCookie(request, response);
  sendJson(response, 200, { ok: true });
}

function handleImport(request, response, context, body) {
  const snapshot = body && typeof body === "object" ? body : {};
  const categories = snapshot.categories && typeof snapshot.categories === "object" ? snapshot.categories : {};
  const movements = Array.isArray(snapshot.movements) ? snapshot.movements : [];
  const userId = context.user.id;

  let importedCategories = 0;
  let importedMovements = 0;
  const importedIds = new Map();

  db.exec("BEGIN");
  try {
    for (const type of ["income", "expense"]) {
      const list = Array.isArray(categories[type]) ? categories[type] : [];
      for (const categoryName of list) {
        try {
          const normalizedCategoryName = normalizeName(categoryName);
          if (!normalizedCategoryName) continue;
          const existing = statements.findCategoryBySlug.get(userId, type, slugify(normalizedCategoryName));
          const category = ensureCategoryCapacity(userId, type, normalizedCategoryName);
          importedIds.set(`${type}:${normalizedCategoryName}`, category.id);
          if (!existing) importedCategories += 1;
        } catch {
          continue;
        }
      }
    }

    for (const movement of movements) {
      if (!movement || typeof movement !== "object") continue;
      try {
        const type = movement.type === "income" ? "income" : "expense";
        const categoryName = normalizeName(movement.category || movement.categoryName || "outros");
        const categoryKey = `${type}:${categoryName}`;
        let categoryId = importedIds.get(categoryKey);
        if (!categoryId) {
          const category = ensureCategoryCapacity(userId, type, categoryName);
          categoryId = category.id;
          importedIds.set(categoryKey, categoryId);
        }

        const sourceKey = String(movement.id || movement.sourceKey || "").trim();
        if (!sourceKey) continue;
        const already = statements.findMovementBySource.get(userId, sourceKey);
        if (already) continue;

        upsertMovement(userId, {
          id: sourceKey,
          sourceKey,
          type,
          amount: movement.amount,
          categoryId,
          description: movement.description,
          date: movement.date,
        });
        importedMovements += 1;
      } catch {
        continue;
      }
    }

    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }

  sendJson(response, 200, {
    ok: true,
    importedCategories,
    importedMovements,
    bootstrap: collectUserBootstrap(userId),
  });
}

function handleBootstrap(response, context) {
  sendJson(response, 200, collectUserBootstrap(context.user.id));
}

function handleCommitments(request, response, context, pathname, method, body) {
  const userId = context.user.id;
  const currentCycle = ensureCurrentCycle(userId);

  if (method === "GET" && pathname === "/api/commitments") {
    sendJson(response, 200, {
      currentCycle,
      commitments: listCommitmentsByCycle(userId, currentCycle.id),
    });
    return;
  }

  if (method === "POST" && pathname === "/api/commitments") {
    const commitment = ensureCommitmentCapacity(userId, currentCycle.id, body);
    sendJson(response, 201, {
      ok: true,
      commitment: serializeCommitment(commitment),
      commitments: listCommitmentsByCycle(userId, currentCycle.id),
      currentCycle,
    });
    return;
  }

  const match = pathname.match(/^\/api\/commitments\/([^/]+)(?:\/(complete|reopen|convert-to-movement))?$/);
  if (!match) {
    sendJson(response, 404, { error: "not_found" });
    return;
  }

  const commitmentId = decodeURIComponent(match[1]);
  const action = match[2] || "";

  if (method === "PUT" || method === "PATCH") {
    const commitment = updateCommitmentById(userId, currentCycle.id, commitmentId, body);
    sendJson(response, 200, {
      ok: true,
      commitment: serializeCommitment(commitment),
      commitments: listCommitmentsByCycle(userId, currentCycle.id),
      currentCycle,
    });
    return;
  }

  if (method === "DELETE" && !action) {
    const commitment = statements.findCommitmentById.get(commitmentId, userId, currentCycle.id);
    if (!commitment) {
      sendJson(response, 404, { error: "not_found" });
      return;
    }
    statements.deleteCommitment.run(commitmentId, userId, currentCycle.id);
    sendJson(response, 200, {
      ok: true,
      commitment: serializeCommitment(commitment),
      commitments: listCommitmentsByCycle(userId, currentCycle.id),
      currentCycle,
    });
    return;
  }

  if (method === "POST" && action === "complete") {
    const result = convertCommitmentToMovement(userId, currentCycle.id, commitmentId, currentCycle);
    sendJson(response, 200, {
      ok: true,
      commitment: serializeCommitment(result.commitment),
      movement: serializeMovement(result.movement),
      created: result.created,
      commitments: listCommitmentsByCycle(userId, currentCycle.id),
      movements: listMovementsByCycle(userId, currentCycle.id),
      currentCycle,
    });
    return;
  }

  if (method === "POST" && action === "reopen") {
    const commitment = reopenCommitmentAndRevertMovement(userId, currentCycle.id, commitmentId);
    sendJson(response, 200, {
      ok: true,
      commitment: serializeCommitment(commitment),
      commitments: listCommitmentsByCycle(userId, currentCycle.id),
      movements: listMovementsByCycle(userId, currentCycle.id),
      currentCycle,
    });
    return;
  }

  if (method === "POST" && action === "convert-to-movement") {
    const result = convertCommitmentToMovement(userId, currentCycle.id, commitmentId, currentCycle);
    sendJson(response, 200, {
      ok: true,
      commitment: serializeCommitment(result.commitment),
      movement: serializeMovement(result.movement),
      created: result.created,
      commitments: listCommitmentsByCycle(userId, currentCycle.id),
      movements: listMovementsByCycle(userId, currentCycle.id),
      currentCycle,
    });
    return;
  }

  sendJson(response, 405, { error: "method_not_allowed" });
}

function handleCategories(request, response, context, pathname, method, body) {
  const userId = context.user.id;
  if (method === "GET" && pathname === "/api/categories") {
    sendJson(response, 200, listCategoriesByUser(userId));
    return;
  }

  if (method === "POST" && pathname === "/api/categories") {
    const type = body.type === "income" ? "income" : "expense";
    const category = ensureCategoryCapacity(userId, type, body.name);
    sendJson(response, 201, { category: serializeCategory(category), categories: listCategoriesByUser(userId) });
    return;
  }

  const match = pathname.match(/^\/api\/categories\/([^/]+)$/);
  if (!match) {
    sendJson(response, 404, { error: "not_found" });
    return;
  }

  const categoryId = decodeURIComponent(match[1]);
  const category = statements.findCategoryById.get(categoryId, userId);
  if (!category) {
    sendJson(response, 404, { error: "not_found" });
    return;
  }

  if (method === "PATCH" || method === "PUT") {
    if (category.is_default) {
      sendJson(response, 400, { error: "category_protected", message: "Categorias padrao nao podem ser editadas." });
      return;
    }

    if (category.slug === "outros") {
      sendJson(response, 400, { error: "category_protected", message: "Outros nao pode ser alterada." });
      return;
    }

    const nextName = normalizeName(body.name);
    const nextSlug = slugify(nextName);
    if (!nextName || !nextSlug) {
      sendJson(response, 400, { error: "invalid_category" });
      return;
    }

    const existing = statements.findCategoryBySlug.get(userId, category.type, nextSlug);
    if (existing && existing.id !== category.id) {
      sendJson(response, 409, { error: "category_exists" });
      return;
    }

    statements.updateCategory.run(nextName, nextSlug, nowIso(), category.id, userId);
    sendJson(response, 200, {
      category: serializeCategory(statements.findCategoryById.get(category.id, userId)),
      categories: listCategoriesByUser(userId),
    });
    return;
  }

  if (method === "DELETE") {
    if (category.slug === "outros") {
      sendJson(response, 400, { error: "category_protected", message: "Outros nao pode ser excluida." });
      return;
    }

    const affected = statements.countMovementsForCategory.get(userId, category.id).count;
    if (affected > 0) {
      sendJson(response, 409, {
        error: "category_in_use",
        message: "Ha lancamentos utilizando esta categoria.",
      });
      return;
    }

    statements.deleteCategory.run(category.id, userId);
    sendJson(response, 200, { ok: true, categories: listCategoriesByUser(userId) });
    return;
  }

  sendJson(response, 405, { error: "method_not_allowed" });
}

function handleMovements(request, response, context, pathname, method, body) {
  const userId = context.user.id;
  if (method === "GET" && pathname === "/api/movements") {
    const currentCycle = ensureCurrentCycle(userId);
    sendJson(response, 200, listMovementsByCycle(userId, currentCycle.id));
    return;
  }

  if (method === "POST" && pathname === "/api/movements") {
    const result = upsertMovement(userId, body);
    const currentCycle = ensureCurrentCycle(userId);
    sendJson(response, 201, {
      ok: true,
      id: result.id,
      currentCycle,
      movements: listMovementsByCycle(userId, currentCycle.id),
    });
    return;
  }

  const match = pathname.match(/^\/api\/movements\/([^/]+)$/);
  if (!match) {
    sendJson(response, 404, { error: "not_found" });
    return;
  }

  const movementId = decodeURIComponent(match[1]);
  const current = statements.findActiveMovementById.get(movementId, userId);
  if (!current) {
    const exists = statements.findMovementById.get(movementId, userId);
    if (exists) {
      sendJson(response, 409, { error: "cycle_closed", message: "Lancamentos de ciclos fechados sao somente leitura." });
      return;
    }
    sendJson(response, 404, { error: "not_found" });
    return;
  }

  if (method === "PUT" || method === "PATCH") {
    upsertMovement(userId, body, movementId);
    const currentCycle = ensureCurrentCycle(userId);
    sendJson(response, 200, { ok: true, movements: listMovementsByCycle(userId, currentCycle.id) });
    return;
  }

  if (method === "DELETE") {
    const receiptPath = current.receipt_stored_name ? getReceiptFilePath(current.receipt_stored_name) : "";
    statements.deleteMovement.run(movementId, userId);
    deleteFileIfExists(receiptPath);
    const currentCycle = ensureCurrentCycle(userId);
    sendJson(response, 200, { ok: true, movements: listMovementsByCycle(userId, currentCycle.id) });
    return;
  }

  sendJson(response, 405, { error: "method_not_allowed" });
}

async function handleMovementReceipt(request, response, context, pathname, method) {
  const userId = context.user.id;
  const match = pathname.match(/^\/api\/movements\/([^/]+)\/receipt$/);
  if (!match) {
    sendJson(response, 404, { error: "not_found" });
    return;
  }

  const movementId = decodeURIComponent(match[1]);

  if (method === "GET") {
    try {
      const file = getMovementReceiptFile(userId, movementId);
      streamFile(response, file.filePath, file.mimeType, file.fileName);
    } catch (error) {
      sendJson(response, error.statusCode || 404, {
        error: error.message || "receipt_not_found",
      });
    }
    return;
  }

  const current = statements.findActiveMovementById.get(movementId, userId);
  if (!current) {
    const exists = statements.findMovementById.get(movementId, userId);
    if (exists) {
      sendJson(response, 409, { error: "cycle_closed", message: "Lancamentos de ciclos fechados sao somente leitura." });
      return;
    }
    sendJson(response, 404, { error: "not_found" });
    return;
  }

  if (current.type !== "expense") {
    sendJson(response, 409, { error: "receipt_not_allowed", message: "Comprovante so pode ser anexado em saídas." });
    return;
  }

  if (method === "DELETE") {
    const updated = clearMovementReceiptById(userId, movementId);
    sendJson(response, 200, { ok: true, movement: serializeMovement(updated), movements: listMovementsByCycle(userId, current.cycle_id) });
    return;
  }

  if (method === "POST") {
    const contentType = String(request.headers["content-type"] || "");
    if (!contentType.toLowerCase().includes("multipart/form-data")) {
      sendJson(response, 415, { error: "invalid_content_type" });
      return;
    }

    const raw = await readBufferBody(request, 12 * 1024 * 1024);
    const { files } = parseMultipartFormData(raw, contentType);
    const file = files.find((item) => item.name === "file") || files[0];
    if (!file) {
      sendJson(response, 400, { error: "missing_file", message: "Envie um arquivo válido." });
      return;
    }

    try {
      const updated = replaceMovementReceipt(userId, movementId, file);
      sendJson(response, 200, {
        ok: true,
        movement: serializeMovement(updated),
        movements: listMovementsByCycle(userId, current.cycle_id),
      });
    } catch (error) {
      sendJson(response, error.statusCode || 500, {
        error: error.message || "internal_error",
        message: error.message || "Unexpected error",
      });
    }
    return;
  }

  sendJson(response, 405, { error: "method_not_allowed" });
}

function handleGoals(request, response, context, pathname, method, body) {
  const userId = context.user.id;
  const currentCycle = ensureCurrentCycle(userId);

  if (method === "GET" && pathname === "/api/goals") {
    sendJson(response, 200, {
      currentCycle,
      goals: listGoalsByUser(userId),
    });
    return;
  }

  if (method === "POST" && pathname === "/api/goals") {
    const goal = ensureGoalCapacity(userId, body.name, body.targetAmount, body.accent || body.theme);
    sendJson(response, 201, {
      ok: true,
      goal: serializeGoal(goal),
      goals: listGoalsByUser(userId),
      currentCycle,
    });
    return;
  }

  const match = pathname.match(/^\/api\/goals\/([^/]+)(?:\/(save|remove))?$/);
  if (!match) {
    sendJson(response, 404, { error: "not_found" });
    return;
  }

  const goalId = decodeURIComponent(match[1]);
  const action = match[2] || "";

  if (method === "PUT" || method === "PATCH") {
    const goal = updateGoalCapacity(userId, goalId, body.name, body.targetAmount, body.accent || body.theme);
    sendJson(response, 200, {
      ok: true,
      goal: serializeGoal(goal),
      goals: listGoalsByUser(userId),
      currentCycle,
    });
    return;
  }

  if (method === "DELETE" && !action) {
    const goal = deleteGoalById(userId, goalId);
    sendJson(response, 200, {
      ok: true,
      goal: serializeGoal(goal),
      goals: listGoalsByUser(userId),
      currentCycle,
    });
    return;
  }

  if (method === "POST" && action === "save") {
    const goal = saveGoalAmount(userId, goalId, body.amount);
    sendJson(response, 200, {
      ok: true,
      goal: serializeGoal(goal),
      goals: listGoalsByUser(userId),
      currentCycle,
    });
    return;
  }

  if (method === "POST" && action === "remove") {
    const goal = removeGoalAmount(userId, goalId, body.amount);
    sendJson(response, 200, {
      ok: true,
      goal: serializeGoal(goal),
      goals: listGoalsByUser(userId),
      currentCycle,
    });
    return;
  }

  sendJson(response, 405, { error: "method_not_allowed" });
}

function serveStatic(request, response, pathname) {
  let filePath = pathname === "/" ? "/index.html" : pathname;
  const normalized = path.normalize(path.join(root, decodeURIComponent(filePath)));
  if (!normalized.startsWith(root)) {
    sendText(response, 403, "Forbidden");
    return;
  }

  fs.readFile(normalized, (error, data) => {
    if (error) {
      sendText(response, 404, "Not found");
      return;
    }
    response.writeHead(200, {
      ...buildSecurityHeaders(),
      "Content-Type": mimeTypes[path.extname(normalized)] || "application/octet-stream",
      "Cache-Control": staticCacheControlFor(normalized),
    });
    response.end(data);
  });
}

migrateCyclesForExistingUsers();
cleanupExpiredSessions(true);

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url || "/", `http://${host}`);
  if (appBasePath && appBasePath !== "/" && url.pathname === appBasePath && (request.method || "GET").toUpperCase() === "GET") {
    sendRedirect(response, `${appBasePath}/${url.search || ""}`);
    return;
  }

  const pathname = normalizeRequestPath(url.pathname);
  const method = (request.method || "GET").toUpperCase();

  try {
    if (pathname === "/auth/me" && method === "GET") {
      const context = getAuthContext(request);
      if (!context) {
        sendJson(response, 401, { error: "unauthorized" });
        return;
      }
      sendJson(response, 200, { user: serializeUser(context.user) });
      return;
    }

    if (pathname === "/auth/register" && method === "POST") {
      const body = await readJsonBody(request, AUTH_BODY_LIMIT_BYTES);
      registerUser(body, request, response);
      return;
    }

    if (pathname === "/auth/login" && method === "POST") {
      const body = await readJsonBody(request, AUTH_BODY_LIMIT_BYTES);
      loginUser(body, request, response);
      return;
    }

    if (pathname === "/auth/logout" && method === "POST") {
      logoutUser(request, response);
      return;
    }

    if (pathname === "/api/bootstrap" && method === "GET") {
      const context = requireAuth(request, response);
      if (!context) return;
      handleBootstrap(response, context);
      return;
    }

    if (pathname === "/api/cycles/current" && method === "GET") {
      const context = requireAuth(request, response);
      if (!context) return;
      const cycle = ensureCurrentCycle(context.user.id);
      sendJson(response, 200, {
        cycle,
        movements: listMovementsByCycle(context.user.id, cycle.id),
      });
      return;
    }

    if (pathname === "/api/cycles" && method === "GET") {
      const context = requireAuth(request, response);
      if (!context) return;
      const userId = context.user.id;
      sendJson(response, 200, {
        currentCycle: ensureCurrentCycle(userId),
        cycles: listCyclesByUser(userId),
      });
      return;
    }

    if (pathname === "/api/cycles/close" && method === "POST") {
      const context = requireAuth(request, response);
      if (!context) return;
      const result = closeCurrentCycle(context.user.id);
      sendJson(response, 200, {
        ok: true,
        ...result,
        movements: listMovementsByCycle(context.user.id, result.currentCycle.id),
      });
      return;
    }

    if (pathname.startsWith("/api/commitments")) {
      const context = requireAuth(request, response);
      if (!context) return;
      const body = method === "GET" || method === "DELETE" ? {} : await readJsonBody(request);
      handleCommitments(request, response, context, pathname, method, body);
      return;
    }

    if (pathname.startsWith("/api/goals")) {
      const context = requireAuth(request, response);
      if (!context) return;
      const body = method === "GET" || method === "DELETE" ? {} : await readJsonBody(request);
      handleGoals(request, response, context, pathname, method, body);
      return;
    }

    const cycleMatch = pathname.match(/^\/api\/cycles\/([^/]+)$/);
    if (cycleMatch && method === "GET") {
      const context = requireAuth(request, response);
      if (!context) return;
      const cycleId = decodeURIComponent(cycleMatch[1]);
      const cycle = statements.findCycleById.get(cycleId, context.user.id);
      if (!cycle) {
        sendJson(response, 404, { error: "not_found" });
        return;
      }
      sendJson(response, 200, {
        cycle: serializeCycle(statements.listCycleSummaryById.get(context.user.id, cycleId)),
        movements: listMovementsByCycle(context.user.id, cycleId),
      });
      return;
    }

    if (pathname === "/api/import/local" && method === "POST") {
      const context = requireAuth(request, response);
      if (!context) return;
      const body = await readJsonBody(request);
      handleImport(request, response, context, body);
      return;
    }

    if (pathname.startsWith("/api/categories")) {
      const context = requireAuth(request, response);
      if (!context) return;
      const body = method === "GET" || method === "DELETE" ? {} : await readJsonBody(request);
      handleCategories(request, response, context, pathname, method, body);
      return;
    }

    if (pathname.startsWith("/api/movements")) {
      const context = requireAuth(request, response);
      if (!context) return;
      if (/^\/api\/movements\/[^/]+\/receipt$/.test(pathname)) {
        await handleMovementReceipt(request, response, context, pathname, method);
        return;
      }
      const body = method === "GET" || method === "DELETE" ? {} : await readJsonBody(request);
      handleMovements(request, response, context, pathname, method, body);
      return;
    }

    if (method === "OPTIONS") {
      response.writeHead(204, {
        ...buildSecurityHeaders(),
        "Allow": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
      });
      response.end();
      return;
    }

    serveStatic(request, response, pathname);
  } catch (error) {
    console.error(error);
    const statusCode = error.statusCode || 500;
    const clientError = statusCode >= 400 && statusCode < 500;
    sendJson(response, statusCode, {
      error: clientError ? error.code || "request_failed" : "internal_error",
      message: clientError ? error.message || "Request failed" : "Unexpected error",
    });
  }
});

server.listen(port, host, () => {
  console.log(`Pulso backend rodando em http://${host}:${port}/`);
});
