import { requireUser } from '../auth.js';
import { sendJson } from '../http.js';
import { all, first } from '../db.js';
import { ensureCurrentCycle } from './cycles.js';

export async function handleBootstrap(request, url, env) {
  if (request.method !== "GET") return sendJson({ error: "Method not allowed" }, 405);
  
  const user = await requireUser(request, env);
  if (!user) return sendJson({ error: "Unauthorized" }, 401);

  const currentCycle = await ensureCurrentCycle(env, user.id);
  
  // Serialize user
  const userData = await first(env.DB, `SELECT id, email, created_at as createdAt, updated_at as updatedAt FROM users WHERE id = ?`, user.id);
  
  // Cycles
  const rawCycles = await all(env.DB, `
    SELECT
      cycles.id, cycles.user_id AS userId, cycles.label, cycles.status,
      cycles.started_at AS startedAt, cycles.closed_at AS closedAt,
      cycles.created_at AS createdAt, cycles.updated_at AS updatedAt,
      COALESCE(SUM(CASE WHEN movements.type = 'income' THEN movements.amount ELSE 0 END), 0) AS incomeTotal,
      COALESCE(SUM(CASE WHEN movements.type = 'expense' THEN movements.amount ELSE 0 END), 0) AS expenseTotal,
      COUNT(movements.id) AS movementCount
    FROM cycles
    LEFT JOIN movements ON movements.cycle_id = cycles.id AND movements.user_id = cycles.user_id
    WHERE cycles.user_id = ?
    GROUP BY cycles.id
    ORDER BY CASE cycles.status WHEN 'active' THEN 0 ELSE 1 END, COALESCE(cycles.closed_at, cycles.started_at) DESC
  `, user.id);
  
  const cycles = rawCycles.map(c => ({
    ...c, 
    incomeTotal: Number(c.incomeTotal), 
    expenseTotal: Number(c.expenseTotal), 
    balance: Number(c.incomeTotal) - Number(c.expenseTotal)
  }));
  
  // Categories
  const categories = await all(env.DB, `
    SELECT id, type, name, slug, is_default AS isDefault, created_at AS createdAt, updated_at AS updatedAt
    FROM categories WHERE user_id = ?
    ORDER BY CASE type WHEN 'income' THEN 0 ELSE 1 END, is_default DESC, name ASC
  `, user.id);
  
  const categoriesGrouped = {
    income: categories.filter(c => c.type === "income"),
    expense: categories.filter(c => c.type === "expense")
  };
  
  // Movements
  const movements = await all(env.DB, `
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
  `, user.id, currentCycle.id);

  const serializedMovements = movements.map(m => ({
    ...m,
    amount: Number(m.amount),
    receipt: m.receiptStoredName ? {
      storedName: m.receiptStoredName,
      originalName: m.receiptOriginalName,
      mimeType: m.receiptMimeType,
      size: Number(m.receiptSize || 0),
      uploadedAt: m.receiptUploadedAt,
      url: `/api/movements/${m.id}/receipt`,
      kind: m.receiptMimeType === "application/pdf" ? "pdf" : "image"
    } : null
  }));

  // Goals
  const rawGoals = await all(env.DB, `
    SELECT id, user_id AS userId, name, slug, accent, target_amount AS targetAmount, saved_amount AS savedAmount, created_at AS createdAt, updated_at AS updatedAt
    FROM goals WHERE user_id = ? ORDER BY created_at DESC
  `, user.id);
  
  const goals = rawGoals.map(g => ({
    ...g,
    targetAmount: Number(g.targetAmount),
    savedAmount: Number(g.savedAmount),
    remainingAmount: Math.max(Number(g.targetAmount) - Number(g.savedAmount), 0),
    progress: Number(g.targetAmount) > 0 ? Math.max(Math.round((Number(g.savedAmount) / Number(g.targetAmount)) * 100), 0) : 0
  }));
  
  // Commitments
  const commitments = await all(env.DB, `
    SELECT id, user_id AS userId, cycle_id AS cycleId, type, description, amount, status, due_date AS dueDate, completed_at AS completedAt, converted_movement_id AS convertedMovementId, converted_at AS convertedAt, created_at AS createdAt, updated_at AS updatedAt
    FROM commitments WHERE user_id = ? AND cycle_id = ?
    ORDER BY CASE status WHEN 'pending' THEN 0 ELSE 1 END, COALESCE(due_date, created_at) ASC, created_at ASC
  `, user.id, currentCycle.id);

  return sendJson({
    user: userData,
    currentCycle: cycles.find(c => c.id === currentCycle.id) || currentCycle,
    cycles,
    categories: categoriesGrouped,
    movements: serializedMovements,
    goals,
    commitments
  });
}
