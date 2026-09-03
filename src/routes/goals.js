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

const GOAL_ACCENTS = new Set(["cyan", "green", "purple", "pink", "amber", "blue", "coral", "neutral"]);
function normalizeGoalAccent(value, fallback = "cyan") {
  const normalized = String(value || "").trim().toLowerCase();
  if (GOAL_ACCENTS.has(normalized)) return normalized;
  return GOAL_ACCENTS.has(fallback) ? fallback : "cyan";
}

function parsePositiveAmount(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0) return 0;
  return amount;
}

export async function handleGoals(request, url, env) {
  const user = await requireUser(request, env);
  if (!user) return sendJson({ error: "Unauthorized" }, 401);

  const path = url.pathname;
  const match = path.match(/^\/api\/goals\/([^/]+)(?:\/(save|remove))?$/);
  const id = match ? match[1] : null;
  const action = match ? match[2] : null;

  if (request.method === "GET" && path === "/api/goals") {
    const currentCycle = await ensureCurrentCycle(env, user.id);
    const rawGoals = await all(env.DB, `
      SELECT id, user_id AS userId, name, slug, accent, target_amount AS targetAmount, saved_amount AS savedAmount, created_at AS createdAt, updated_at AS updatedAt
      FROM goals WHERE user_id = ? ORDER BY created_at DESC
    `, user.id);
    
    return sendJson({
      currentCycle,
      goals: rawGoals.map(g => ({
        ...g,
        targetAmount: Number(g.targetAmount),
        savedAmount: Number(g.savedAmount),
        remainingAmount: Math.max(Number(g.targetAmount) - Number(g.savedAmount), 0),
        progress: Number(g.targetAmount) > 0 ? Math.max(Math.round((Number(g.savedAmount) / Number(g.targetAmount)) * 100), 0) : 0
      }))
    });
  }

  if (request.method === "POST" && path === "/api/goals") {
    const body = await readJsonBody(request);
    const name = normalizeName(body.name);
    const slug = slugify(name);
    const targetAmount = parsePositiveAmount(body.targetAmount);
    const accent = normalizeGoalAccent(body.accent);
    
    if (!name || !slug) return sendJson({ error: "invalid_goal" }, 400);

    const existing = await first(env.DB, `SELECT id FROM goals WHERE user_id = ? AND slug = ?`, user.id, slug);
    if (existing) return sendJson({ error: "goal_exists" }, 409);

    const newId = uuid();
    const timestamp = nowIso();
    
    await run(env.DB, `
      INSERT INTO goals (id, user_id, name, slug, accent, target_amount, saved_amount, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)
    `, newId, user.id, name, slug, accent, targetAmount, timestamp, timestamp);

    const created = await first(env.DB, `
      SELECT id, user_id AS userId, name, slug, accent, target_amount AS targetAmount, saved_amount AS savedAmount, created_at AS createdAt, updated_at AS updatedAt
      FROM goals WHERE id = ? AND user_id = ?
    `, newId, user.id);
    
    const currentCycle = await ensureCurrentCycle(env, user.id);
    const rawGoals = await all(env.DB, `
      SELECT id, user_id AS userId, name, slug, accent, target_amount AS targetAmount, saved_amount AS savedAmount, created_at AS createdAt, updated_at AS updatedAt
      FROM goals WHERE user_id = ? ORDER BY created_at DESC
    `, user.id);
    
    return sendJson({
      ok: true,
      goal: {
        ...created,
        targetAmount: Number(created.targetAmount),
        savedAmount: Number(created.savedAmount),
        remainingAmount: Math.max(Number(created.targetAmount) - Number(created.savedAmount), 0),
        progress: Number(created.targetAmount) > 0 ? Math.max(Math.round((Number(created.savedAmount) / Number(created.targetAmount)) * 100), 0) : 0
      },
      goals: rawGoals.map(g => ({
        ...g,
        targetAmount: Number(g.targetAmount),
        savedAmount: Number(g.savedAmount),
        remainingAmount: Math.max(Number(g.targetAmount) - Number(g.savedAmount), 0),
        progress: Number(g.targetAmount) > 0 ? Math.max(Math.round((Number(g.savedAmount) / Number(g.targetAmount)) * 100), 0) : 0
      })),
      currentCycle
    }, 201);
  }

  if (id && !action && (request.method === "PUT" || request.method === "PATCH")) {
    const body = await readJsonBody(request);
    const name = normalizeName(body.name);
    const slug = slugify(name);
    const targetAmount = parsePositiveAmount(body.targetAmount);
    const accent = normalizeGoalAccent(body.accent);
    
    if (!name || !slug) return sendJson({ error: "invalid_goal" }, 400);
    
    const current = await first(env.DB, `SELECT * FROM goals WHERE id = ? AND user_id = ?`, id, user.id);
    if (!current) return sendJson({ error: "goal_not_found" }, 404);

    const existing = await first(env.DB, `SELECT id FROM goals WHERE user_id = ? AND slug = ?`, user.id, slug);
    if (existing && existing.id !== id) return sendJson({ error: "goal_exists" }, 409);

    if (targetAmount < Number(current.saved_amount)) {
      return sendJson({ error: "goal_target_too_low" }, 409);
    }

    const timestamp = nowIso();
    await run(env.DB, `
      UPDATE goals SET name = ?, slug = ?, accent = ?, target_amount = ?, updated_at = ?
      WHERE id = ? AND user_id = ?
    `, name, slug, accent, targetAmount, timestamp, id, user.id);
    
    const updated = await first(env.DB, `
      SELECT id, user_id AS userId, name, slug, accent, target_amount AS targetAmount, saved_amount AS savedAmount, created_at AS createdAt, updated_at AS updatedAt
      FROM goals WHERE id = ? AND user_id = ?
    `, id, user.id);
    
    return sendJson({
      ...updated,
      targetAmount: Number(updated.targetAmount),
      savedAmount: Number(updated.savedAmount),
      remainingAmount: Math.max(Number(updated.targetAmount) - Number(updated.savedAmount), 0),
      progress: Number(updated.targetAmount) > 0 ? Math.max(Math.round((Number(updated.savedAmount) / Number(updated.targetAmount)) * 100), 0) : 0
    });
  }

  if (id && !action && request.method === "DELETE") {
    const current = await first(env.DB, `SELECT id FROM goals WHERE id = ? AND user_id = ?`, id, user.id);
    if (!current) return sendJson({ error: "goal_not_found" }, 404);
    
    await run(env.DB, `DELETE FROM goals WHERE id = ? AND user_id = ?`, id, user.id);
    return sendJson({ ok: true });
  }

  if (id && action === "save" && request.method === "POST") {
    const body = await readJsonBody(request);
    const amountToSave = parsePositiveAmount(body.amountToSave || body.amount);
    
    const goal = await first(env.DB, `SELECT * FROM goals WHERE id = ? AND user_id = ?`, id, user.id);
    if (!goal) return sendJson({ error: "goal_not_found" }, 404);

    const currentCycle = await ensureCurrentCycle(env, user.id);
    
    // Check cycle balance
    const cycleSummaryRow = await first(env.DB, `
      SELECT
        COALESCE(SUM(CASE WHEN movements.type = 'income' THEN movements.amount ELSE 0 END), 0) AS incomeTotal,
        COALESCE(SUM(CASE WHEN movements.type = 'expense' THEN movements.amount ELSE 0 END), 0) AS expenseTotal
      FROM cycles
      LEFT JOIN movements ON movements.cycle_id = cycles.id AND movements.user_id = cycles.user_id
      WHERE cycles.id = ? AND cycles.user_id = ?
    `, currentCycle.id, user.id);
    
    const availableBalance = Number(cycleSummaryRow.incomeTotal) - Number(cycleSummaryRow.expenseTotal);
    if (amountToSave > availableBalance) {
      return sendJson({ error: "insufficient_goal_balance" }, 409);
    }

    const nextSaved = Number(goal.saved_amount) + amountToSave;
    const timestamp = nowIso();
    
    let cat = await first(env.DB, `SELECT id FROM categories WHERE user_id = ? AND type = 'expense' AND slug = 'outros'`, user.id);
    if (!cat) {
      const catId = uuid();
      await run(env.DB, `
        INSERT INTO categories (id, user_id, type, name, slug, is_default, created_at, updated_at)
        VALUES (?, ?, 'expense', 'Outros', 'outros', 0, ?, ?)
      `, catId, user.id, timestamp, timestamp);
      cat = { id: catId };
    }

    await env.DB.batch([
      env.DB.prepare(`UPDATE goals SET saved_amount = ?, updated_at = ? WHERE id = ? AND user_id = ?`).bind(nextSaved, timestamp, id, user.id),
      env.DB.prepare(`
        INSERT INTO movements (id, user_id, cycle_id, type, amount, category_id, description, movement_date, source_key, created_at, updated_at)
        VALUES (?, ?, ?, 'expense', ?, ?, ?, ?, ?, ?, ?)
      `).bind(uuid(), user.id, currentCycle.id, amountToSave, cat.id, `Depósito na meta: ${goal.name}`, timestamp.split("T")[0], uuid(), timestamp, timestamp)
    ]);

    const updated = await first(env.DB, `SELECT id, user_id AS userId, name, slug, accent, target_amount AS targetAmount, saved_amount AS savedAmount, created_at AS createdAt, updated_at AS updatedAt FROM goals WHERE id = ? AND user_id = ?`, id, user.id);
    return sendJson({
      ...updated, targetAmount: Number(updated.targetAmount), savedAmount: Number(updated.savedAmount),
      remainingAmount: Math.max(Number(updated.targetAmount) - Number(updated.savedAmount), 0),
      progress: Number(updated.targetAmount) > 0 ? Math.max(Math.round((Number(updated.savedAmount) / Number(updated.targetAmount)) * 100), 0) : 0
    });
  }

  if (id && action === "remove" && request.method === "POST") {
    const body = await readJsonBody(request);
    const amountToRemove = parsePositiveAmount(body.amountToRemove || body.amount);
    
    const goal = await first(env.DB, `SELECT * FROM goals WHERE id = ? AND user_id = ?`, id, user.id);
    if (!goal) return sendJson({ error: "goal_not_found" }, 404);

    const currentSaved = Number(goal.saved_amount);
    if (amountToRemove > currentSaved) return sendJson({ error: "goal_insufficient_saved" }, 409);

    const nextSaved = currentSaved - amountToRemove;
    const timestamp = nowIso();
    const currentCycle = await ensureCurrentCycle(env, user.id);

    let cat = await first(env.DB, `SELECT id FROM categories WHERE user_id = ? AND type = 'income' AND slug = 'outros'`, user.id);
    if (!cat) {
      const catId = uuid();
      await run(env.DB, `
        INSERT INTO categories (id, user_id, type, name, slug, is_default, created_at, updated_at)
        VALUES (?, ?, 'income', 'Outros', 'outros', 0, ?, ?)
      `, catId, user.id, timestamp, timestamp);
      cat = { id: catId };
    }

    await env.DB.batch([
      env.DB.prepare(`UPDATE goals SET saved_amount = ?, updated_at = ? WHERE id = ? AND user_id = ?`).bind(nextSaved, timestamp, id, user.id),
      env.DB.prepare(`
        INSERT INTO movements (id, user_id, cycle_id, type, amount, category_id, description, movement_date, source_key, created_at, updated_at)
        VALUES (?, ?, ?, 'income', ?, ?, ?, ?, ?, ?, ?)
      `).bind(uuid(), user.id, currentCycle.id, amountToRemove, cat.id, `Resgate da meta: ${goal.name}`, timestamp.split("T")[0], uuid(), timestamp, timestamp)
    ]);

    const updated = await first(env.DB, `SELECT id, user_id AS userId, name, slug, accent, target_amount AS targetAmount, saved_amount AS savedAmount, created_at AS createdAt, updated_at AS updatedAt FROM goals WHERE id = ? AND user_id = ?`, id, user.id);
    return sendJson({
      ...updated, targetAmount: Number(updated.targetAmount), savedAmount: Number(updated.savedAmount),
      remainingAmount: Math.max(Number(updated.targetAmount) - Number(updated.savedAmount), 0),
      progress: Number(updated.targetAmount) > 0 ? Math.max(Math.round((Number(updated.savedAmount) / Number(updated.targetAmount)) * 100), 0) : 0
    });
  }

  return sendJson({ error: "Not found" }, 404);
}
