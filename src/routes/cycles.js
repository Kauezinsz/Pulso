import { requireUser, uuid, nowIso } from '../auth.js';
import { sendJson } from '../http.js';
import { all, first, run } from '../db.js';

export async function ensureCurrentCycle(env, userId) {
  let cycle = await first(env.DB, `SELECT * FROM cycles WHERE user_id = ? AND status = 'active' LIMIT 1`, userId);
  
  if (!cycle) {
    const createdAt = nowIso();
    const earliest = await first(env.DB, `SELECT MIN(movement_date) AS firstDate FROM movements WHERE user_id = ?`, userId);
    const startedAt = earliest && earliest.firstDate ? new Date(`${earliest.firstDate}T00:00:00`).toISOString() : createdAt;
    const id = uuid();
    
    await run(env.DB, `
      INSERT INTO cycles (id, user_id, label, status, started_at, closed_at, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, id, userId, "Ciclo atual", "active", startedAt, null, createdAt, createdAt);
    
    cycle = await first(env.DB, `SELECT * FROM cycles WHERE id = ? AND user_id = ?`, id, userId);
  }
  
  const missing = await first(env.DB, `SELECT COUNT(*) AS count FROM movements WHERE user_id = ? AND cycle_id IS NULL`, userId);
  if (missing && missing.count > 0) {
    await run(env.DB, `UPDATE movements SET cycle_id = ? WHERE user_id = ? AND cycle_id IS NULL`, cycle.id, userId);
  }
  
  return cycle;
}

export async function handleCycles(request, url, env) {
  const user = await requireUser(request, env);
  if (!user) return sendJson({ error: "Unauthorized" }, 401);

  const path = url.pathname;

  if (request.method === "GET" && path === "/api/cycles/current") {
    const cycle = await ensureCurrentCycle(env, user.id);
    const rawCycle = await first(env.DB, `
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
    `, cycle.id, user.id);

    return sendJson({
      ...rawCycle,
      incomeTotal: Number(rawCycle.incomeTotal),
      expenseTotal: Number(rawCycle.expenseTotal),
      balance: Number(rawCycle.incomeTotal) - Number(rawCycle.expenseTotal),
      movementCount: Number(rawCycle.movementCount)
    });
  }

  if (request.method === "GET" && path === "/api/cycles") {
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

    return sendJson(rawCycles.map(c => ({
      ...c,
      incomeTotal: Number(c.incomeTotal),
      expenseTotal: Number(c.expenseTotal),
      balance: Number(c.incomeTotal) - Number(c.expenseTotal),
      movementCount: Number(c.movementCount)
    })));
  }

  if (request.method === "POST" && path === "/api/cycles/close") {
    const activeCycle = await first(env.DB, `SELECT * FROM cycles WHERE user_id = ? AND status = 'active' LIMIT 1`, user.id);
    if (!activeCycle) return sendJson({ error: "active_cycle_not_found" }, 404);

    const cycleSummaryRow = await first(env.DB, `
      SELECT
        COALESCE(SUM(CASE WHEN movements.type = 'income' THEN movements.amount ELSE 0 END), 0) AS incomeTotal,
        COALESCE(SUM(CASE WHEN movements.type = 'expense' THEN movements.amount ELSE 0 END), 0) AS expenseTotal
      FROM cycles
      LEFT JOIN movements ON movements.cycle_id = cycles.id AND movements.user_id = cycles.user_id
      WHERE cycles.id = ? AND cycles.user_id = ?
    `, activeCycle.id, user.id);
    
    const closingBalance = Number(cycleSummaryRow.incomeTotal) - Number(cycleSummaryRow.expenseTotal);
    const closedAt = nowIso();
    const formatter = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" });
    const label = `${formatter.format(new Date(activeCycle.started_at))} - ${formatter.format(new Date(closedAt))}`;
    
    const newCycleId = uuid();
    const newStartedAt = closedAt;
    const timestamp = nowIso();

    const stmts = [
      env.DB.prepare(`
        UPDATE cycles SET label = ?, status = 'closed', closed_at = ?, updated_at = ? WHERE id = ? AND user_id = ?
      `).bind(label, closedAt, timestamp, activeCycle.id, user.id),
      
      env.DB.prepare(`
        INSERT INTO cycles (id, user_id, label, status, started_at, closed_at, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(newCycleId, user.id, "Ciclo atual", "active", newStartedAt, null, timestamp, timestamp)
    ];

    if (closingBalance !== 0) {
      const type = closingBalance > 0 ? "income" : "expense";
      const amount = Math.abs(closingBalance);
      const catSlug = "outros";
      
      const cat = await first(env.DB, `SELECT id FROM categories WHERE user_id = ? AND type = ? AND slug = ? LIMIT 1`, user.id, type, catSlug);
      
      if (cat) {
        stmts.push(env.DB.prepare(`
          INSERT INTO movements (
            id, user_id, cycle_id, type, amount, category_id, description, movement_date,
            source_key, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          uuid(), user.id, newCycleId, type, amount, cat.id,
          closingBalance > 0 ? "Restante do ciclo anterior" : "Dívida do ciclo anterior",
          timestamp.split("T")[0], uuid(), timestamp, timestamp
        ));
      }
    }

    await env.DB.batch(stmts);

    // Return the response they expect: { closedCycle, currentCycle, cycles }
    const closedCycle = await first(env.DB, `
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
    `, activeCycle.id, user.id);

    const newCycle = await first(env.DB, `
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
    `, newCycleId, user.id);

    const allCycles = await all(env.DB, `
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

    return sendJson({
      ok: true,
      closedCycle: closedCycle ? {
        ...closedCycle,
        incomeTotal: Number(closedCycle.incomeTotal),
        expenseTotal: Number(closedCycle.expenseTotal),
        balance: Number(closedCycle.incomeTotal) - Number(closedCycle.expenseTotal),
        movementCount: Number(closedCycle.movementCount)
      } : null,
      currentCycle: newCycle ? {
        ...newCycle,
        incomeTotal: Number(newCycle.incomeTotal),
        expenseTotal: Number(newCycle.expenseTotal),
        balance: Number(newCycle.incomeTotal) - Number(newCycle.expenseTotal),
        movementCount: Number(newCycle.movementCount)
      } : null,
      cycles: allCycles.map(c => ({
        ...c,
        incomeTotal: Number(c.incomeTotal),
        expenseTotal: Number(c.expenseTotal),
        balance: Number(c.incomeTotal) - Number(c.expenseTotal),
        movementCount: Number(c.movementCount)
      }))
    });
  }

  return sendJson({ error: "Not found" }, 404);
}
