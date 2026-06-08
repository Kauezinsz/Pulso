const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { DatabaseSync } = require("node:sqlite");

const root = __dirname;
const host = "127.0.0.1";
const port = Number(process.env.PORT || process.env.PULSO_PORT || 4173);
const appBasePath = process.env.PULSO_BASE_PATH || "/pulso";
const dataDir = path.join(root, "data");
const dbPath = process.env.PULSO_DB_PATH || path.join(dataDir, "pulso.sqlite");

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

fs.mkdirSync(dataDir, { recursive: true });

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
    cycle_id TEXT NOT NULL REFERENCES cycles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    target_amount REAL NOT NULL,
    saved_amount REAL NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE(user_id, cycle_id, slug)
  );

  CREATE UNIQUE INDEX IF NOT EXISTS idx_cycles_one_active_per_user ON cycles(user_id) WHERE status = 'active';
  CREATE INDEX IF NOT EXISTS idx_goals_cycle_lookup ON goals(user_id, cycle_id, created_at DESC);
`);

ensureMovementCycleColumn();

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
  listGoalsByCycle: db.prepare(`
    SELECT
      goals.id,
      goals.user_id AS userId,
      goals.cycle_id AS cycleId,
      goals.name,
      goals.slug,
      goals.target_amount AS targetAmount,
      goals.saved_amount AS savedAmount,
      goals.created_at AS createdAt,
      goals.updated_at AS updatedAt
    FROM goals
    WHERE goals.user_id = ? AND goals.cycle_id = ?
    ORDER BY goals.created_at DESC
  `),
  findGoalById: db.prepare(`
    SELECT
      goals.id,
      goals.user_id AS userId,
      goals.cycle_id AS cycleId,
      goals.name,
      goals.slug,
      goals.target_amount AS targetAmount,
      goals.saved_amount AS savedAmount,
      goals.created_at AS createdAt,
      goals.updated_at AS updatedAt
    FROM goals
    WHERE goals.id = ? AND goals.user_id = ? AND goals.cycle_id = ?
    LIMIT 1
  `),
  findGoalBySlug: db.prepare(`
    SELECT
      goals.id,
      goals.user_id AS userId,
      goals.cycle_id AS cycleId,
      goals.name,
      goals.slug,
      goals.target_amount AS targetAmount,
      goals.saved_amount AS savedAmount,
      goals.created_at AS createdAt,
      goals.updated_at AS updatedAt
    FROM goals
    WHERE goals.user_id = ? AND goals.cycle_id = ? AND goals.slug = ?
    LIMIT 1
  `),
  sumGoalsSavedByCycle: db.prepare(`
    SELECT COALESCE(SUM(saved_amount), 0) AS total
    FROM goals
    WHERE user_id = ? AND cycle_id = ?
  `),
  insertGoal: db.prepare(`
    INSERT INTO goals (
      id, user_id, cycle_id, name, slug, target_amount, saved_amount, created_at, updated_at
    )
    VALUES (
      @id, @userId, @cycleId, @name, @slug, @targetAmount, @savedAmount, @createdAt, @updatedAt
    )
  `),
  updateGoal: db.prepare(`
    UPDATE goals
    SET name = ?, slug = ?, target_amount = ?, updated_at = ?
    WHERE id = ? AND user_id = ? AND cycle_id = ?
  `),
  updateGoalSavedAmount: db.prepare(`
    UPDATE goals
    SET saved_amount = ?, updated_at = ?
    WHERE id = ? AND user_id = ? AND cycle_id = ?
  `),
  deleteGoal: db.prepare(`DELETE FROM goals WHERE id = ? AND user_id = ? AND cycle_id = ?`),
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
      source_key, created_at, updated_at
    )
    VALUES (
      @id, @userId, @cycleId, @type, @amount, @categoryId, @description, @movementDate,
      @sourceKey, @createdAt, @updatedAt
    )
  `),
  updateMovement: db.prepare(`
    UPDATE movements
    SET type = ?, amount = ?, category_id = ?, description = ?, movement_date = ?, updated_at = ?
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

function normalizeName(name) {
  return String(name || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function normalizeGoalName(name) {
  return String(name || "")
    .trim()
    .replace(/\s+/g, " ");
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

function setCookie(response, name, value, options = {}) {
  const parts = [`${name}=${encodeURIComponent(value)}`, "Path=/", "HttpOnly", "SameSite=Lax"];
  if (options.maxAge) parts.push(`Max-Age=${Math.floor(options.maxAge)}`);
  if (options.expires) parts.push(`Expires=${options.expires.toUTCString()}`);
  if (options.secure) parts.push("Secure");
  response.setHeader("Set-Cookie", parts.join("; "));
}

function clearCookie(response, name) {
  response.setHeader("Set-Cookie", `${name}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
}

function sendJson(response, statusCode, payload) {
  const body = JSON.stringify(payload);
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  response.end(body);
}

function sendText(response, statusCode, text, contentType = "text/plain; charset=utf-8") {
  response.writeHead(statusCode, {
    "Content-Type": contentType,
    "Cache-Control": "no-cache",
  });
  response.end(text);
}

function readJsonBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    request.on("data", (chunk) => {
      size += chunk.length;
      if (size > 1024 * 1024) {
        reject(new Error("Payload too large"));
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });
    request.on("end", () => {
      if (!chunks.length) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
      } catch {
        reject(new Error("Invalid JSON"));
      }
    });
    request.on("error", reject);
  });
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
  return parseCookies(request.headers.cookie || "")["pulso_session"] || "";
}

function getAuthContext(request) {
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
  return {
    id: row.id,
    type: row.type,
    amount: Number(row.amount),
    categoryId: row.categoryId,
    categoryName: row.categoryName,
    categoryType: row.categoryType,
    description: row.description,
    date: row.date,
    sourceKey: row.sourceKey,
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
  return {
    id: row.id,
    userId: row.userId,
    cycleId: row.cycleId,
    name: row.name,
    slug: row.slug,
    targetAmount,
    savedAmount,
    remainingAmount: Math.max(targetAmount - savedAmount, 0),
    progress: targetAmount > 0 ? Math.max(Math.round((savedAmount / targetAmount) * 100), 0) : 0,
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

function listGoalsByCycle(userId, cycleId) {
  return statements.listGoalsByCycle.all(userId, cycleId).map(serializeGoal);
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

  return serializeCycle(cycle);
}

function getGoalSummary(userId, cycleId) {
  return Number(statements.sumGoalsSavedByCycle.get(userId, cycleId)?.total || 0);
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

function ensureGoalCapacity(userId, cycleId, name, targetAmount) {
  const normalizedName = normalizeGoalName(name);
  const slug = slugify(normalizedName);
  const amount = Number(targetAmount);

  if (!normalizedName || !slug || !Number.isFinite(amount) || amount <= 0) {
    const error = new Error("invalid_goal");
    error.statusCode = 400;
    throw error;
  }

  const existing = statements.findGoalBySlug.get(userId, cycleId, slug);
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
    cycleId,
    name: normalizedName,
    slug,
    targetAmount: amount,
    savedAmount: 0,
    createdAt: timestamp,
    updatedAt: timestamp,
  });

  return statements.findGoalById.get(id, userId, cycleId);
}

function updateGoalCapacity(userId, cycleId, goalId, name, targetAmount) {
  const current = statements.findGoalById.get(goalId, userId, cycleId);
  if (!current) {
    const error = new Error("goal_not_found");
    error.statusCode = 404;
    throw error;
  }

  const normalizedName = normalizeGoalName(name);
  const slug = slugify(normalizedName);
  const amount = Number(targetAmount);

  if (!normalizedName || !slug || !Number.isFinite(amount) || amount <= 0) {
    const error = new Error("invalid_goal");
    error.statusCode = 400;
    throw error;
  }

  const existing = statements.findGoalBySlug.get(userId, cycleId, slug);
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
  statements.updateGoal.run(normalizedName, slug, amount, timestamp, goalId, userId, cycleId);
  return statements.findGoalById.get(goalId, userId, cycleId);
}

function saveGoalAmount(userId, cycleId, goalId, amountToSave) {
  const goal = statements.findGoalById.get(goalId, userId, cycleId);
  if (!goal) {
    const error = new Error("goal_not_found");
    error.statusCode = 404;
    throw error;
  }

  const amount = Number(amountToSave);
  if (!Number.isFinite(amount) || amount <= 0) {
    const error = new Error("invalid_goal_amount");
    error.statusCode = 400;
    throw error;
  }

  const currentCycle = getCycleSummary(userId, cycleId);
  const reservedTotal = getGoalSummary(userId, cycleId);
  const availableBalance = Number(currentCycle?.balance || 0) - Number(reservedTotal || 0);
  if (amount > availableBalance) {
    const error = new Error("insufficient_goal_balance");
    error.statusCode = 409;
    throw error;
  }

  const nextSaved = Number(goal.savedAmount || 0) + amount;
  statements.updateGoalSavedAmount.run(nextSaved, nowIso(), goalId, userId, cycleId);
  return statements.findGoalById.get(goalId, userId, cycleId);
}

function removeGoalAmount(userId, cycleId, goalId, amountToRemove) {
  const goal = statements.findGoalById.get(goalId, userId, cycleId);
  if (!goal) {
    const error = new Error("goal_not_found");
    error.statusCode = 404;
    throw error;
  }

  const amount = Number(amountToRemove);
  if (!Number.isFinite(amount) || amount <= 0) {
    const error = new Error("invalid_goal_amount");
    error.statusCode = 400;
    throw error;
  }

  const currentSaved = Number(goal.savedAmount || 0);
  if (amount > currentSaved) {
    const error = new Error("goal_insufficient_saved");
    error.statusCode = 409;
    throw error;
  }

  const nextSaved = currentSaved - amount;
  statements.updateGoalSavedAmount.run(nextSaved, nowIso(), goalId, userId, cycleId);
  return statements.findGoalById.get(goalId, userId, cycleId);
}

function deleteGoalById(userId, cycleId, goalId) {
  const goal = statements.findGoalById.get(goalId, userId, cycleId);
  if (!goal) {
    const error = new Error("goal_not_found");
    error.statusCode = 404;
    throw error;
  }

  statements.deleteGoal.run(goalId, userId, cycleId);
  return goal;
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
  const amount = Number(body.amount);
  const categoryId = String(body.categoryId || "").trim();
  const description = String(body.description || "").trim();
  const date = String(body.date || "").trim();
  const sourceKey = String(body.sourceKey || body.id || existingId || uuid()).trim();
  const movementId = String(body.id || existingId || sourceKey || uuid()).trim();

  if (!amount || amount <= 0 || !categoryId || !description || !date) {
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
    goals: listGoalsByCycle(userId, currentCycle.id),
  };
}

function sendAuthCookie(response, sessionToken, expiresAt) {
  setCookie(response, "pulso_session", sessionToken, {
    expires: expiresAt,
  });
}

function createSession(userId, response) {
  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = sha256(token);
  const createdAt = nowIso();
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);
  statements.insertSession.run({
    id: uuid(),
    userId,
    tokenHash,
    createdAt,
    lastSeenAt: createdAt,
    expiresAt: expiresAt.toISOString(),
  });
  sendAuthCookie(response, token, expiresAt);
}

function registerUser(body, response) {
  const email = normalizeEmail(body.email);
  const password = String(body.password || "");
  if (!email || !email.includes("@") || password.length < 8) {
    sendJson(response, 400, { error: "invalid_credentials" });
    return;
  }

  const existing = statements.findUserByEmail.get(email);
  if (existing) {
    sendJson(response, 409, { error: "email_in_use" });
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

  createSession(userId, response);
  sendJson(response, 201, { user: serializeUser(statements.findUserById.get(userId)) });
}

function loginUser(body, response) {
  const email = normalizeEmail(body.email);
  const password = String(body.password || "");
  if (!email || !password) {
    sendJson(response, 400, { error: "invalid_credentials" });
    return;
  }

  const user = statements.findUserByEmail.get(email);
  if (!user || !verifyPassword(password, user.password_salt, user.password_hash)) {
    sendJson(response, 401, { error: "invalid_credentials" });
    return;
  }

  createSession(user.id, response);
  sendJson(response, 200, { user: serializeUser(statements.findUserById.get(user.id)) });
}

function logoutUser(request, response) {
  const token = getSessionToken(request);
  if (token) {
    statements.deleteSessionByTokenHash.run(sha256(token));
  }
  clearCookie(response, "pulso_session");
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
        const existing = statements.findCategoryBySlug.get(userId, type, slugify(categoryName));
        const category = ensureCategoryCapacity(userId, type, categoryName);
        importedIds.set(`${type}:${normalizeName(categoryName)}`, category.id);
        if (!existing) importedCategories += 1;
      }
    }

    for (const movement of movements) {
      if (!movement || typeof movement !== "object") continue;
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
    statements.deleteMovement.run(movementId, userId);
    const currentCycle = ensureCurrentCycle(userId);
    sendJson(response, 200, { ok: true, movements: listMovementsByCycle(userId, currentCycle.id) });
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
      goals: listGoalsByCycle(userId, currentCycle.id),
    });
    return;
  }

  if (method === "POST" && pathname === "/api/goals") {
    const goal = ensureGoalCapacity(userId, currentCycle.id, body.name, body.targetAmount);
    sendJson(response, 201, {
      ok: true,
      goal: serializeGoal(goal),
      goals: listGoalsByCycle(userId, currentCycle.id),
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
    const goal = updateGoalCapacity(userId, currentCycle.id, goalId, body.name, body.targetAmount);
    sendJson(response, 200, {
      ok: true,
      goal: serializeGoal(goal),
      goals: listGoalsByCycle(userId, currentCycle.id),
      currentCycle,
    });
    return;
  }

  if (method === "DELETE" && !action) {
    const goal = deleteGoalById(userId, currentCycle.id, goalId);
    sendJson(response, 200, {
      ok: true,
      goal: serializeGoal(goal),
      goals: listGoalsByCycle(userId, currentCycle.id),
      currentCycle,
    });
    return;
  }

  if (method === "POST" && action === "save") {
    const goal = saveGoalAmount(userId, currentCycle.id, goalId, body.amount);
    sendJson(response, 200, {
      ok: true,
      goal: serializeGoal(goal),
      goals: listGoalsByCycle(userId, currentCycle.id),
      currentCycle,
    });
    return;
  }

  if (method === "POST" && action === "remove") {
    const goal = removeGoalAmount(userId, currentCycle.id, goalId, body.amount);
    sendJson(response, 200, {
      ok: true,
      goal: serializeGoal(goal),
      goals: listGoalsByCycle(userId, currentCycle.id),
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
      "Content-Type": mimeTypes[path.extname(normalized)] || "application/octet-stream",
      "Cache-Control": "no-cache",
    });
    response.end(data);
  });
}

migrateCyclesForExistingUsers();

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url || "/", `http://${host}`);
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
      const body = await readJsonBody(request);
      registerUser(body, response);
      return;
    }

    if (pathname === "/auth/login" && method === "POST") {
      const body = await readJsonBody(request);
      loginUser(body, response);
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
      const body = method === "GET" || method === "DELETE" ? {} : await readJsonBody(request);
      handleMovements(request, response, context, pathname, method, body);
      return;
    }

    if (method === "OPTIONS") {
      response.writeHead(204, {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      });
      response.end();
      return;
    }

    serveStatic(request, response, pathname);
  } catch (error) {
    console.error(error);
    sendJson(response, error.statusCode || 500, {
      error: "internal_error",
      message: error.message || "Unexpected error",
    });
  }
});

server.listen(port, host, () => {
  console.log(`Pulso backend rodando em http://${host}:${port}/`);
});
