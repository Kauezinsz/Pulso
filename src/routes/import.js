import { requireUser, uuid, nowIso } from '../auth.js';
import { sendJson, readJsonBody } from '../http.js';
import { all, first, run } from '../db.js';
import { ensureCurrentCycle } from './cycles.js';

function slugify(name) {
  return String(name || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

function normalizeName(name) {
  return String(name || "").trim().substring(0, 60);
}

function parsePositiveAmount(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  return amount;
}

async function ensureCategoryCapacity(env, userId, type, name) {
  const normalizedName = normalizeName(name);
  const slug = slugify(normalizedName);
  if (!normalizedName || !slug) return null;

  const existing = await first(env.DB, `SELECT id FROM categories WHERE user_id = ? AND type = ? AND slug = ?`, userId, type, slug);
  if (existing) return existing;

  const id = uuid();
  const timestamp = nowIso();
  await run(env.DB, `
    INSERT INTO categories (id, user_id, type, name, slug, is_default, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, 0, ?, ?)
  `, id, userId, type, normalizedName, slug, timestamp, timestamp);

  return { id };
}

export async function handleImport(request, url, env) {
  if (request.method !== "POST") return sendJson({ error: "Method not allowed" }, 405);

  const user = await requireUser(request, env);
  if (!user) return sendJson({ error: "Unauthorized" }, 401);

  const body = await readJsonBody(request);
  if (!body || typeof body !== "object") {
    return sendJson({ error: "invalid_payload" }, 400);
  }
  const snapshot = body;
  const categoryData = snapshot.categories && typeof snapshot.categories === "object" ? snapshot.categories : {};
  const movements = Array.isArray(snapshot.movements) ? snapshot.movements : [];
  const userId = user.id;

  let importedCategories = 0;
  let importedMovements = 0;
  const importedIds = new Map();

  const currentCycle = await ensureCurrentCycle(env, userId);

  // Import categories
  for (const type of ["income", "expense"]) {
    const list = Array.isArray(categoryData[type]) ? categoryData[type] : [];
    for (const categoryName of list) {
      try {
        const normalizedName = normalizeName(categoryName);
        if (!normalizedName) continue;
        const slug = slugify(normalizedName);
        const existing = await first(env.DB, `SELECT id FROM categories WHERE user_id = ? AND type = ? AND slug = ?`, userId, type, slug);
        const category = existing || await ensureCategoryCapacity(env, userId, type, normalizedName);
        if (category) {
          importedIds.set(`${type}:${normalizedName}`, category.id);
          if (!existing) importedCategories += 1;
        }
      } catch {
        continue;
      }
    }
  }

  // Import movements in batches to avoid D1 batch limits
  const batchSize = 50;
  const movementBatches = [];
  let currentBatch = [];

  for (const movement of movements) {
    if (!movement || typeof movement !== "object") continue;
    try {
      const type = movement.type === "income" ? "income" : "expense";
      const categoryName = normalizeName(movement.category || movement.categoryName || "outros");
      const categoryKey = `${type}:${categoryName}`;
      let categoryId = importedIds.get(categoryKey);

      if (!categoryId) {
        const category = await ensureCategoryCapacity(env, userId, type, categoryName);
        if (!category) continue;
        categoryId = category.id;
        importedIds.set(categoryKey, categoryId);
      }

      const sourceKey = String(movement.id || movement.sourceKey || "").trim();
      if (!sourceKey) continue;

      const already = await first(env.DB, `SELECT id FROM movements WHERE user_id = ? AND source_key = ?`, userId, sourceKey);
      if (already) continue;

      const amount = parsePositiveAmount(movement.amount);
      const description = String(movement.description || "").trim().substring(0, 120);
      const date = String(movement.date || "").trim();
      if (!amount || !description || !date) continue;

      const movementId = uuid();
      const timestamp = nowIso();

      currentBatch.push(env.DB.prepare(`
        INSERT INTO movements (
          id, user_id, cycle_id, type, amount, category_id, description,
          movement_date, source_key, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(movementId, userId, currentCycle.id, type, amount, categoryId, description, date, sourceKey, timestamp, timestamp));

      importedMovements += 1;

      if (currentBatch.length >= batchSize) {
        movementBatches.push([...currentBatch]);
        currentBatch = [];
      }
    } catch {
      continue;
    }
  }

  if (currentBatch.length > 0) movementBatches.push(currentBatch);

  for (const batch of movementBatches) {
    try {
      await env.DB.batch(batch);
    } catch (e) {
      console.error("Import batch failed:", e);
    }
  }

  return sendJson({ ok: true, importedCategories, importedMovements });
}
