import { requireUser, uuid, nowIso } from '../auth.js';
import { sendJson, readJsonBody } from '../http.js';
import { all, first, run } from '../db.js';
import { ensureCurrentCycle } from './cycles.js';
import { deleteReceipt } from '../files.js';

function parsePositiveAmount(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  return amount;
}

async function getCommitmentsByCycle(env, userId, cycleId) {
  return await all(env.DB, `
    SELECT id, user_id AS userId, cycle_id AS cycleId, type, description, amount, status,
      due_date AS dueDate, completed_at AS completedAt, converted_movement_id AS convertedMovementId,
      converted_at AS convertedAt, created_at AS createdAt, updated_at AS updatedAt
    FROM commitments WHERE user_id = ? AND cycle_id = ?
    ORDER BY CASE status WHEN 'pending' THEN 0 ELSE 1 END, COALESCE(due_date, created_at) ASC, created_at ASC
  `, userId, cycleId);
}

async function getMovementsByCycle(env, userId, cycleId) {
  return await all(env.DB, `
    SELECT
      movements.id, movements.type, movements.amount, movements.description,
      movements.movement_date AS date, movements.category_id AS categoryId,
      movements.cycle_id AS cycleId, movements.source_key AS sourceKey,
      movements.receipt_stored_name AS receiptStoredName, movements.receipt_original_name AS receiptOriginalName,
      movements.receipt_mime_type AS receiptMimeType, movements.receipt_size AS receiptSize,
      movements.receipt_uploaded_at AS receiptUploadedAt, movements.created_at AS createdAt, movements.updated_at AS updatedAt,
      categories.name AS categoryName, categories.type AS categoryType
    FROM movements
    JOIN categories ON categories.id = movements.category_id
    WHERE movements.user_id = ? AND movements.cycle_id = ?
    ORDER BY movement_date DESC, movements.created_at DESC
  `, userId, cycleId);
}

async function getCycleSummary(env, userId, cycleId) {
  return await first(env.DB, `
    SELECT
      cycles.id, cycles.user_id AS userId, cycles.label, cycles.status,
      cycles.started_at AS startedAt, cycles.closed_at AS closedAt,
      cycles.created_at AS createdAt, cycles.updated_at AS updatedAt,
      COALESCE(SUM(CASE WHEN movements.type = 'income' THEN movements.amount ELSE 0 END), 0) AS incomeTotal,
      COALESCE(SUM(CASE WHEN movements.type = 'expense' THEN movements.amount ELSE 0 END), 0) AS expenseTotal,
      COUNT(movements.id) AS movementCount
    FROM cycles
    LEFT JOIN movements ON movements.cycle_id = cycles.id AND movements.user_id = cycles.user_id
    WHERE cycles.id = ? AND cycles.user_id = ?
    GROUP BY cycles.id
  `, cycleId, userId);
}

export async function handleCommitments(request, url, env) {
  const user = await requireUser(request, env);
  if (!user) return sendJson({ error: "Unauthorized" }, 401);

  const path = url.pathname;
  const match = path.match(/^\/api\/commitments\/([^/]+)(?:\/(complete|reopen|convert-to-movement))?$/);
  const id = match ? match[1] : null;
  const action = match ? match[2] : null;

  if (request.method === "GET" && path === "/api/commitments") {
    const currentCycle = await ensureCurrentCycle(env, user.id);
    const commitments = await getCommitmentsByCycle(env, user.id, currentCycle.id);
    const cycleSummary = await getCycleSummary(env, user.id, currentCycle.id);
    
    return sendJson({
      currentCycle: cycleSummary ? {
        ...cycleSummary,
        incomeTotal: Number(cycleSummary.incomeTotal),
        expenseTotal: Number(cycleSummary.expenseTotal),
        balance: Number(cycleSummary.incomeTotal) - Number(cycleSummary.expenseTotal),
        movementCount: Number(cycleSummary.movementCount)
      } : currentCycle,
      commitments
    });
  }

  if (request.method === "POST" && path === "/api/commitments") {
    const body = await readJsonBody(request);
    const currentCycle = await ensureCurrentCycle(env, user.id);

    const type = body.type === "receivable" ? "receivable" : "payable";
    const description = String(body.description || "").trim().substring(0, 120);
    const amount = parsePositiveAmount(body.amount);
    const dueDate = body.dueDate || body.due_date || null;

    if (!description) return sendJson({ error: "invalid_commitment" }, 400);

    const newId = String(body.id || uuid()).trim();
    const timestamp = nowIso();

    const existing = await first(env.DB, `SELECT id FROM commitments WHERE id = ? AND user_id = ? AND cycle_id = ?`, newId, user.id, currentCycle.id);
    if (existing) return sendJson({ error: "commitment_exists" }, 409);

    await run(env.DB, `
      INSERT INTO commitments (
        id, user_id, cycle_id, type, description, amount, status,
        due_date, completed_at, converted_movement_id, converted_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, NULL, NULL, NULL, ?, ?)
    `, newId, user.id, currentCycle.id, type, description, amount, dueDate, timestamp, timestamp);

    const created = await first(env.DB, `
      SELECT id, user_id AS userId, cycle_id AS cycleId, type, description, amount, status,
        due_date AS dueDate, completed_at AS completedAt, converted_movement_id AS convertedMovementId,
        converted_at AS convertedAt, created_at AS createdAt, updated_at AS updatedAt
      FROM commitments WHERE id = ? AND user_id = ?
    `, newId, user.id);

    const commitments = await getCommitmentsByCycle(env, user.id, currentCycle.id);
    const cycleSummary = await getCycleSummary(env, user.id, currentCycle.id);

    return sendJson({
      ok: true,
      commitment: created,
      commitments,
      currentCycle: cycleSummary ? {
        ...cycleSummary,
        incomeTotal: Number(cycleSummary.incomeTotal),
        expenseTotal: Number(cycleSummary.expenseTotal),
        balance: Number(cycleSummary.incomeTotal) - Number(cycleSummary.expenseTotal),
        movementCount: Number(cycleSummary.movementCount)
      } : currentCycle
    }, 201);
  }

  if (id && !action && (request.method === "PUT" || request.method === "PATCH")) {
    const body = await readJsonBody(request);
    const currentCycle = await ensureCurrentCycle(env, user.id);
    const current = await first(env.DB, `SELECT * FROM commitments WHERE id = ? AND user_id = ? AND cycle_id = ?`, id, user.id, currentCycle.id);
    if (!current) return sendJson({ error: "commitment_not_found" }, 404);

    const type = (body.type === "receivable" || body.type === "payable") ? body.type : current.type;
    const description = String(body.description || "").trim().substring(0, 120) || current.description;
    const amount = parsePositiveAmount(body.amount) || Number(current.amount);
    const dueDate = body.dueDate !== undefined ? (body.dueDate || null) : (current.due_date || null);
    const timestamp = nowIso();

    await run(env.DB, `
      UPDATE commitments SET type = ?, description = ?, amount = ?, due_date = ?, updated_at = ?
      WHERE id = ? AND user_id = ? AND cycle_id = ?
    `, type, description, amount, dueDate, timestamp, id, user.id, currentCycle.id);

    const updated = await first(env.DB, `
      SELECT id, user_id AS userId, cycle_id AS cycleId, type, description, amount, status,
        due_date AS dueDate, completed_at AS completedAt, converted_movement_id AS convertedMovementId,
        converted_at AS convertedAt, created_at AS createdAt, updated_at AS updatedAt
      FROM commitments WHERE id = ? AND user_id = ?
    `, id, user.id);

    const commitments = await getCommitmentsByCycle(env, user.id, currentCycle.id);
    const cycleSummary = await getCycleSummary(env, user.id, currentCycle.id);

    return sendJson({
      ok: true,
      commitment: updated,
      commitments,
      currentCycle: cycleSummary ? {
        ...cycleSummary,
        incomeTotal: Number(cycleSummary.incomeTotal),
        expenseTotal: Number(cycleSummary.expenseTotal),
        balance: Number(cycleSummary.incomeTotal) - Number(cycleSummary.expenseTotal),
        movementCount: Number(cycleSummary.movementCount)
      } : currentCycle
    });
  }

  if (id && !action && request.method === "DELETE") {
    const currentCycle = await ensureCurrentCycle(env, user.id);
    const existing = await first(env.DB, `SELECT id FROM commitments WHERE id = ? AND user_id = ? AND cycle_id = ?`, id, user.id, currentCycle.id);
    if (!existing) return sendJson({ error: "commitment_not_found" }, 404);

    await run(env.DB, `DELETE FROM commitments WHERE id = ? AND user_id = ? AND cycle_id = ?`, id, user.id, currentCycle.id);

    const commitments = await getCommitmentsByCycle(env, user.id, currentCycle.id);
    const cycleSummary = await getCycleSummary(env, user.id, currentCycle.id);

    return sendJson({
      ok: true,
      commitment: existing,
      commitments,
      currentCycle: cycleSummary ? {
        ...cycleSummary,
        incomeTotal: Number(cycleSummary.incomeTotal),
        expenseTotal: Number(cycleSummary.expenseTotal),
        balance: Number(cycleSummary.incomeTotal) - Number(cycleSummary.expenseTotal),
        movementCount: Number(cycleSummary.movementCount)
      } : currentCycle
    });
  }

  if (id && action === "complete" && request.method === "POST") {
    const currentCycle = await ensureCurrentCycle(env, user.id);
    const current = await first(env.DB, `SELECT * FROM commitments WHERE id = ? AND user_id = ? AND cycle_id = ?`, id, user.id, currentCycle.id);
    if (!current) return sendJson({ error: "commitment_not_found" }, 404);

    const timestamp = nowIso();
    await run(env.DB, `
      UPDATE commitments SET status = 'done', completed_at = ?, updated_at = ?
      WHERE id = ? AND user_id = ? AND cycle_id = ?
    `, timestamp, timestamp, id, user.id, currentCycle.id);

    const updated = await first(env.DB, `
      SELECT id, user_id AS userId, cycle_id AS cycleId, type, description, amount, status,
        due_date AS dueDate, completed_at AS completedAt, converted_movement_id AS convertedMovementId,
        converted_at AS convertedAt, created_at AS createdAt, updated_at AS updatedAt
      FROM commitments WHERE id = ? AND user_id = ?
    `, id, user.id);

    const commitments = await getCommitmentsByCycle(env, user.id, currentCycle.id);
    const movements = await getMovementsByCycle(env, user.id, currentCycle.id);
    const cycleSummary = await getCycleSummary(env, user.id, currentCycle.id);

    return sendJson({
      ok: true,
      commitment: updated,
      commitments,
      movements,
      currentCycle: cycleSummary ? {
        ...cycleSummary,
        incomeTotal: Number(cycleSummary.incomeTotal),
        expenseTotal: Number(cycleSummary.expenseTotal),
        balance: Number(cycleSummary.incomeTotal) - Number(cycleSummary.expenseTotal),
        movementCount: Number(cycleSummary.movementCount)
      } : currentCycle
    });
  }

  if (id && action === "reopen" && request.method === "POST") {
    const currentCycle = await ensureCurrentCycle(env, user.id);
    const current = await first(env.DB, `SELECT * FROM commitments WHERE id = ? AND user_id = ? AND cycle_id = ?`, id, user.id, currentCycle.id);
    if (!current) return sendJson({ error: "commitment_not_found" }, 404);

    const timestamp = nowIso();
    const linkedMovementId = current.converted_movement_id || null;

    const stmts = [
      env.DB.prepare(`
        UPDATE commitments SET status = 'pending', completed_at = NULL, converted_movement_id = NULL, converted_at = NULL, updated_at = ?
        WHERE id = ? AND user_id = ? AND cycle_id = ?
      `).bind(timestamp, id, user.id, currentCycle.id)
    ];

    if (linkedMovementId) {
      stmts.push(env.DB.prepare(`DELETE FROM movements WHERE id = ? AND user_id = ?`).bind(linkedMovementId, user.id));
    }

    await env.DB.batch(stmts);

    const updated = await first(env.DB, `
      SELECT id, user_id AS userId, cycle_id AS cycleId, type, description, amount, status,
        due_date AS dueDate, completed_at AS completedAt, converted_movement_id AS convertedMovementId,
        converted_at AS convertedAt, created_at AS createdAt, updated_at AS updatedAt
      FROM commitments WHERE id = ? AND user_id = ?
    `, id, user.id);

    const commitments = await getCommitmentsByCycle(env, user.id, currentCycle.id);
    const movements = await getMovementsByCycle(env, user.id, currentCycle.id);
    const cycleSummary = await getCycleSummary(env, user.id, currentCycle.id);

    return sendJson({
      ok: true,
      commitment: updated,
      commitments,
      movements,
      currentCycle: cycleSummary ? {
        ...cycleSummary,
        incomeTotal: Number(cycleSummary.incomeTotal),
        expenseTotal: Number(cycleSummary.expenseTotal),
        balance: Number(cycleSummary.incomeTotal) - Number(cycleSummary.expenseTotal),
        movementCount: Number(cycleSummary.movementCount)
      } : currentCycle
    });
  }

  if (id && action === "convert-to-movement" && request.method === "POST") {
    const currentCycle = await ensureCurrentCycle(env, user.id);
    const current = await first(env.DB, `SELECT * FROM commitments WHERE id = ? AND user_id = ? AND cycle_id = ?`, id, user.id, currentCycle.id);
    if (!current) return sendJson({ error: "commitment_not_found" }, 404);

    const sourceKey = `commitment:${current.id}:launch`;
    const existingMovement = await first(env.DB, `SELECT id FROM movements WHERE user_id = ? AND source_key = ?`, user.id, sourceKey);

    if (existingMovement) {
      const timestamp = nowIso();
      await run(env.DB, `
        UPDATE commitments SET status = 'done', completed_at = COALESCE(completed_at, ?), converted_movement_id = ?, converted_at = COALESCE(converted_at, ?), updated_at = ?
        WHERE id = ? AND user_id = ?
      `, timestamp, existingMovement.id, timestamp, timestamp, id, user.id);

      const updatedCommitment = await first(env.DB, `
        SELECT id, user_id AS userId, cycle_id AS cycleId, type, description, amount, status,
          due_date AS dueDate, completed_at AS completedAt, converted_movement_id AS convertedMovementId,
          converted_at AS convertedAt, created_at AS createdAt, updated_at AS updatedAt
        FROM commitments WHERE id = ? AND user_id = ?
      `, id, user.id);

      const commitments = await getCommitmentsByCycle(env, user.id, currentCycle.id);
      const movements = await getMovementsByCycle(env, user.id, currentCycle.id);
      const cycleSummary = await getCycleSummary(env, user.id, currentCycle.id);

      return sendJson({
        ok: true,
        commitment: updatedCommitment,
        movement: await first(env.DB, `SELECT * FROM movements WHERE id = ? AND user_id = ?`, existingMovement.id, user.id),
        created: false,
        commitments,
        movements,
        currentCycle: cycleSummary ? {
          ...cycleSummary,
          incomeTotal: Number(cycleSummary.incomeTotal),
          expenseTotal: Number(cycleSummary.expenseTotal),
          balance: Number(cycleSummary.incomeTotal) - Number(cycleSummary.expenseTotal),
          movementCount: Number(cycleSummary.movementCount)
        } : currentCycle
      });
    }

    // Check balance for payable
    if (current.type === "payable") {
      const cycleSummaryRow = await first(env.DB, `
        SELECT
          COALESCE(SUM(CASE WHEN movements.type = 'income' THEN movements.amount ELSE 0 END), 0) AS incomeTotal,
          COALESCE(SUM(CASE WHEN movements.type = 'expense' THEN movements.amount ELSE 0 END), 0) AS expenseTotal
        FROM cycles
        LEFT JOIN movements ON movements.cycle_id = cycles.id AND movements.user_id = cycles.user_id
        WHERE cycles.id = ? AND cycles.user_id = ?
      `, currentCycle.id, user.id);

      const goalSaved = await first(env.DB, `SELECT COALESCE(SUM(saved_amount), 0) AS total FROM goals WHERE user_id = ?`, user.id);
      const availableBalance = Number(cycleSummaryRow.incomeTotal) - Number(cycleSummaryRow.expenseTotal) - Number(goalSaved.total);

      if (availableBalance < Number(current.amount)) {
        return sendJson({ error: "insufficient_balance", availableBalance, requiredBalance: Number(current.amount) }, 409);
      }
    }

    const categoryType = current.type === "receivable" ? "income" : "expense";
    let cat = await first(env.DB, `SELECT id FROM categories WHERE user_id = ? AND type = ? AND slug = 'outros'`, user.id, categoryType);

    const timestamp = nowIso();
    const completedAt = timestamp;

    if (!cat) {
      const catId = uuid();
      await run(env.DB, `
        INSERT INTO categories (id, user_id, type, name, slug, is_default, created_at, updated_at)
        VALUES (?, ?, ?, 'Outros', 'outros', 0, ?, ?)
      `, catId, user.id, categoryType, timestamp, timestamp);
      cat = { id: catId };
    }

    const movementId = uuid();
    const movementDate = completedAt.slice(0, 10);

    await env.DB.batch([
      env.DB.prepare(`
        INSERT INTO movements (id, user_id, cycle_id, type, amount, category_id, description, movement_date, source_key, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(movementId, user.id, currentCycle.id, categoryType, current.amount, cat.id, current.description, movementDate, sourceKey, timestamp, timestamp),

      env.DB.prepare(`
        UPDATE commitments SET status = 'done', completed_at = ?, converted_movement_id = ?, converted_at = ?, updated_at = ?
        WHERE id = ? AND user_id = ?
      `).bind(completedAt, movementId, timestamp, timestamp, id, user.id)
    ]);

    const updatedCommitment = await first(env.DB, `
      SELECT id, user_id AS userId, cycle_id AS cycleId, type, description, amount, status,
        due_date AS dueDate, completed_at AS completedAt, converted_movement_id AS convertedMovementId,
        converted_at AS convertedAt, created_at AS createdAt, updated_at AS updatedAt
      FROM commitments WHERE id = ? AND user_id = ?
    `, id, user.id);

    const commitments = await getCommitmentsByCycle(env, user.id, currentCycle.id);
    const movements = await getMovementsByCycle(env, user.id, currentCycle.id);
    const cycleSummary = await getCycleSummary(env, user.id, currentCycle.id);

    return sendJson({
      ok: true,
      commitment: updatedCommitment,
      movement: await first(env.DB, `SELECT * FROM movements WHERE id = ? AND user_id = ?`, movementId, user.id),
      created: true,
      commitments,
      movements,
      currentCycle: cycleSummary ? {
        ...cycleSummary,
        incomeTotal: Number(cycleSummary.incomeTotal),
        expenseTotal: Number(cycleSummary.expenseTotal),
        balance: Number(cycleSummary.incomeTotal) - Number(cycleSummary.expenseTotal),
        movementCount: Number(cycleSummary.movementCount)
      } : currentCycle
    });
  }

  return sendJson({ error: "Not found" }, 404);
}
