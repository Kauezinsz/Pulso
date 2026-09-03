#!/usr/bin/env node
/**
 * scripts/export-sqlite-to-d1.mjs
 * 
 * Exports data from the local SQLite file (data/pulso.sqlite) and applies it
 * to the Cloudflare D1 database via wrangler.
 *
 * Usage:
 *   node scripts/export-sqlite-to-d1.mjs [--remote]
 *
 * By default applies to the LOCAL D1 (for testing). Pass --remote to apply
 * to production. Run only after `npx wrangler d1 migrations apply pulso-db`.
 *
 * IMPORTANT:
 *  - Backup data/pulso.sqlite before running.
 *  - This script is idempotent: re-running will skip already-imported rows.
 *  - Passwords are migrated as-is (salt + hash). Users will need to reset
 *    their passwords if you changed the hashing algorithm (PBKDF2 vs scrypt).
 */

import { DatabaseSync } from "node:sqlite";
import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const DB_PATH = path.join(ROOT, "data", "pulso.sqlite");
const IS_REMOTE = process.argv.includes("--remote");
const TARGET_FLAG = IS_REMOTE ? "--remote" : "--local";
const DB_NAME = "pulso-db";

if (!existsSync(DB_PATH)) {
  console.error(`SQLite file not found at: ${DB_PATH}`);
  process.exit(1);
}

console.log(`\nMigrating ${DB_PATH} → D1 (${IS_REMOTE ? "REMOTE" : "local"})\n`);

const db = new DatabaseSync(DB_PATH);

function applyD1(sql) {
  const escaped = sql.replace(/'/g, "'\\''");
  execSync(`npx wrangler d1 execute ${DB_NAME} ${TARGET_FLAG} --command='${escaped}'`, {
    stdio: "pipe",
    cwd: ROOT
  });
}

function applyD1Batch(statements) {
  if (statements.length === 0) return;
  // Write to a temp file and use --file for large batches
  const tempFile = path.join(ROOT, ".d1-import-temp.sql");
  const { writeFileSync, unlinkSync } = await import("node:fs");
  writeFileSync(tempFile, statements.join("\n"), "utf8");
  try {
    execSync(`npx wrangler d1 execute ${DB_NAME} ${TARGET_FLAG} --file=${tempFile}`, {
      stdio: "inherit",
      cwd: ROOT
    });
  } finally {
    try { unlinkSync(tempFile); } catch {}
  }
}

// Escape a value for SQL
function esc(value) {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "number") return String(value);
  return `'${String(value).replace(/'/g, "''")}'`;
}

function migrate(tableName, rows, insertFn) {
  if (rows.length === 0) { console.log(`  [${tableName}] 0 rows — skipped`); return; }
  let count = 0;
  for (const row of rows) {
    try {
      applyD1(insertFn(row));
      count++;
    } catch (e) {
      if (e.message && e.message.includes("UNIQUE constraint")) {
        // Idempotent — row already exists
      } else {
        console.warn(`  [${tableName}] Skipped row (${e.message?.slice(0, 80)})`);
      }
    }
  }
  console.log(`  [${tableName}] ${count}/${rows.length} rows migrated`);
}

// ─── Users ────────────────────────────────────────────────────────────────────
const users = db.prepare("SELECT * FROM users").all();
console.log("Migrating users...");
migrate("users", users, row =>
  `INSERT OR IGNORE INTO users (id, email, password_salt, password_hash, created_at, updated_at) VALUES (${esc(row.id)}, ${esc(row.email)}, ${esc(row.password_salt)}, ${esc(row.password_hash)}, ${esc(row.created_at)}, ${esc(row.updated_at)})`
);

// ─── Categories ───────────────────────────────────────────────────────────────
const categories = db.prepare("SELECT * FROM categories").all();
console.log("Migrating categories...");
migrate("categories", categories, row =>
  `INSERT OR IGNORE INTO categories (id, user_id, type, name, slug, is_default, created_at, updated_at) VALUES (${esc(row.id)}, ${esc(row.user_id)}, ${esc(row.type)}, ${esc(row.name)}, ${esc(row.slug)}, ${esc(row.is_default)}, ${esc(row.created_at)}, ${esc(row.updated_at)})`
);

// ─── Cycles ───────────────────────────────────────────────────────────────────
const cycles = db.prepare("SELECT * FROM cycles").all();
console.log("Migrating cycles...");
migrate("cycles", cycles, row =>
  `INSERT OR IGNORE INTO cycles (id, user_id, label, status, started_at, closed_at, created_at, updated_at) VALUES (${esc(row.id)}, ${esc(row.user_id)}, ${esc(row.label)}, ${esc(row.status)}, ${esc(row.started_at)}, ${esc(row.closed_at)}, ${esc(row.created_at)}, ${esc(row.updated_at)})`
);

// ─── Goals ────────────────────────────────────────────────────────────────────
const goals = db.prepare("SELECT * FROM goals").all();
console.log("Migrating goals...");
migrate("goals", goals, row =>
  `INSERT OR IGNORE INTO goals (id, user_id, name, slug, accent, target_amount, saved_amount, created_at, updated_at) VALUES (${esc(row.id)}, ${esc(row.user_id)}, ${esc(row.name)}, ${esc(row.slug)}, ${esc(row.accent)}, ${esc(row.target_amount)}, ${esc(row.saved_amount)}, ${esc(row.created_at)}, ${esc(row.updated_at)})`
);

// ─── Movements ────────────────────────────────────────────────────────────────
const movements = db.prepare("SELECT * FROM movements").all();
console.log("Migrating movements...");
migrate("movements", movements, row =>
  `INSERT OR IGNORE INTO movements (id, user_id, cycle_id, type, amount, category_id, description, movement_date, source_key, receipt_stored_name, receipt_original_name, receipt_mime_type, receipt_size, receipt_uploaded_at, created_at, updated_at) VALUES (${esc(row.id)}, ${esc(row.user_id)}, ${esc(row.cycle_id)}, ${esc(row.type)}, ${esc(row.amount)}, ${esc(row.category_id)}, ${esc(row.description)}, ${esc(row.movement_date)}, ${esc(row.source_key)}, NULL, ${esc(row.receipt_original_name)}, ${esc(row.receipt_mime_type)}, ${esc(row.receipt_size)}, ${esc(row.receipt_uploaded_at)}, ${esc(row.created_at)}, ${esc(row.updated_at)})`
);
// Note: receipt_stored_name is set to NULL because the R2 key format differs from the local path.
// Upload comprovantes manually to R2 and update the movements table if needed.

// ─── Commitments ──────────────────────────────────────────────────────────────
const commitments = db.prepare("SELECT * FROM commitments").all();
console.log("Migrating commitments...");
migrate("commitments", commitments, row =>
  `INSERT OR IGNORE INTO commitments (id, user_id, cycle_id, type, description, amount, status, due_date, completed_at, converted_movement_id, converted_at, created_at, updated_at) VALUES (${esc(row.id)}, ${esc(row.user_id)}, ${esc(row.cycle_id)}, ${esc(row.type)}, ${esc(row.description)}, ${esc(row.amount)}, ${esc(row.status)}, ${esc(row.due_date)}, ${esc(row.completed_at)}, ${esc(row.converted_movement_id)}, ${esc(row.converted_at)}, ${esc(row.created_at)}, ${esc(row.updated_at)})`
);

// ─── Sessions ─────────────────────────────────────────────────────────────────
// Sessions are NOT migrated — all users will need to log in again after migration.
console.log("\n[sessions] Skipped — all users will be logged out after migration.");
console.log("\n✅ Migration complete!\n");
console.log("IMPORTANT: Comprovantes (receipts) stored in data/uploads/ must be uploaded to R2 manually.");
console.log("Run: npx wrangler r2 object put pulso-receipts/<key> --file=data/uploads/<file>\n");
