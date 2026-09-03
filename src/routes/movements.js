import { requireUser, uuid, nowIso } from '../auth.js';
import { sendJson, readJsonBody, buildSecurityHeaders } from '../http.js';
import { all, first, run } from '../db.js';
import { ensureCurrentCycle } from './cycles.js';
import { getReceiptMimeType, putReceipt, getReceipt, deleteReceipt } from '../files.js';

function parsePositiveAmount(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  return amount;
}

export async function handleMovements(request, url, env) {
  const user = await requireUser(request, env);
  if (!user) return sendJson({ error: "Unauthorized" }, 401);

  const path = url.pathname;
  
  if (path === "/api/movements" && request.method === "GET") {
    // Actually cycles handles GET /movements maybe? No, frontend might call it if needed, or it's handled through bootstrap.
    // Let's implement it for completeness.
    const currentCycle = await ensureCurrentCycle(env, user.id);
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

    return sendJson(movements.map(m => ({
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
    })));
  }

  if (path === "/api/movements" && request.method === "POST") {
    const body = await readJsonBody(request);
    const currentCycle = await ensureCurrentCycle(env, user.id);
    
    const type = body.type === "income" ? "income" : "expense";
    const amount = parsePositiveAmount(body.amount);
    const categoryId = String(body.categoryId || "").trim();
    const description = String(body.description || "").trim().substring(0, 120);
    const date = String(body.date || "").trim();
    const sourceKey = String(body.sourceKey || body.id || uuid()).trim();
    const movementId = String(body.id || sourceKey || uuid()).trim();

    if (!categoryId || !description || !date || !sourceKey) {
      return sendJson({ error: "invalid_movement" }, 400);
    }

    const category = await first(env.DB, `SELECT id, type FROM categories WHERE id = ? AND user_id = ?`, categoryId, user.id);
    if (!category || category.type !== type) return sendJson({ error: "category_type_mismatch" }, 400);

    const timestamp = nowIso();
    
    const existing = await first(env.DB, `SELECT id FROM movements WHERE user_id = ? AND source_key = ?`, user.id, sourceKey);
    if (existing) {
      await run(env.DB, `
        UPDATE movements SET type = ?, amount = ?, category_id = ?, description = ?, movement_date = ?, updated_at = ?
        WHERE id = ? AND user_id = ?
      `, type, amount, categoryId, description, date, timestamp, existing.id, user.id);
      return sendJson({ id: existing.id, created: false });
    }

    await run(env.DB, `
      INSERT INTO movements (
        id, user_id, cycle_id, type, amount, category_id, description, movement_date,
        source_key, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, movementId, user.id, currentCycle.id, type, amount, categoryId, description, date, sourceKey, timestamp, timestamp);

    return sendJson({ id: movementId, created: true }, 201);
  }

  // Handle /api/movements/:id and /api/movements/:id/receipt
  const matchReceipt = path.match(/^\/api\/movements\/([^/]+)\/receipt$/);
  if (matchReceipt) {
    const movementId = matchReceipt[1];
    
    if (request.method === "GET") {
      const movement = await first(env.DB, `SELECT * FROM movements WHERE id = ? AND user_id = ?`, movementId, user.id);
      if (!movement || !movement.receipt_stored_name) return sendJson({ error: "Not found" }, 404);
      
      const object = await getReceipt(env, movement.receipt_stored_name);
      if (!object) return sendJson({ error: "Not found" }, 404);
      
      const headers = new Headers();
      object.writeHttpMetadata(headers);
      headers.set("etag", object.httpEtag);
      for (const [key, val] of Object.entries(buildSecurityHeaders())) {
        headers.set(key, val);
      }
      
      return new Response(object.body, { headers });
    }

    if (request.method === "DELETE") {
      const movement = await first(env.DB, `SELECT * FROM movements WHERE id = ? AND user_id = ?`, movementId, user.id);
      if (!movement) return sendJson({ error: "Not found" }, 404);
      
      const storedName = movement.receipt_stored_name;
      await run(env.DB, `
        UPDATE movements SET receipt_stored_name = NULL, receipt_original_name = NULL,
        receipt_mime_type = NULL, receipt_size = NULL, receipt_uploaded_at = NULL, updated_at = ?
        WHERE id = ? AND user_id = ?
      `, nowIso(), movementId, user.id);

      if (storedName) {
        try { await deleteReceipt(env, storedName); } catch (e) { /* best-effort */ }
      }

      return sendJson({ ok: true });
    }

    if (request.method === "POST") {
      const movement = await first(env.DB, `
        SELECT movements.* FROM movements
        JOIN cycles ON cycles.id = movements.cycle_id
        WHERE movements.id = ? AND movements.user_id = ? AND cycles.status = 'active'
      `, movementId, user.id);
      
      if (!movement) return sendJson({ error: "cycle_closed" }, 409);
      if (movement.type !== "expense") return sendJson({ error: "receipt_not_allowed" }, 409);

      let formData;
      try {
        formData = await request.formData();
      } catch (e) {
        return sendJson({ error: "Invalid multipart data" }, 400);
      }
      
      const file = formData.get("file");
      if (!file || !file.name) return sendJson({ error: "No file uploaded" }, 400);
      
      const mimeType = getReceiptMimeType(file.name, file.type);
      if (!mimeType) return sendJson({ error: "invalid_receipt_type" }, 400);
      
      const maxSize = mimeType === "application/pdf" ? 10 * 1024 * 1024 : 5 * 1024 * 1024;
      if (file.size > maxSize) return sendJson({ error: "receipt_too_large" }, 413);

      let objectKey;
      try {
        objectKey = await putReceipt(env, user.id, movementId, file.stream(), mimeType, file.name);
      } catch (e) {
        return sendJson({ error: "receipt_upload_failed" }, 500);
      }
      const timestamp = nowIso();
      const oldStoredName = movement.receipt_stored_name;

      await run(env.DB, `
        UPDATE movements SET receipt_stored_name = ?, receipt_original_name = ?,
        receipt_mime_type = ?, receipt_size = ?, receipt_uploaded_at = ?, updated_at = ?
        WHERE id = ? AND user_id = ?
      `, objectKey, file.name, mimeType, file.size, timestamp, timestamp, movementId, user.id);

      if (oldStoredName) {
        try { await deleteReceipt(env, oldStoredName); } catch (e) { /* best-effort cleanup */ }
      }

      return sendJson({ ok: true });
    }
  }

  const match = path.match(/^\/api\/movements\/([^/]+)$/);
  if (match) {
    const movementId = match[1];

    if (request.method === "PUT" || request.method === "PATCH") {
      const body = await readJsonBody(request);
      const type = body.type === "income" ? "income" : "expense";
      const amount = parsePositiveAmount(body.amount);
      const categoryId = String(body.categoryId || "").trim();
      const description = String(body.description || "").trim().substring(0, 120);
      const date = String(body.date || "").trim();

      const category = await first(env.DB, `SELECT id, type FROM categories WHERE id = ? AND user_id = ?`, categoryId, user.id);
      if (!category || category.type !== type) return sendJson({ error: "category_type_mismatch" }, 400);

      const existing = await first(env.DB, `SELECT id FROM movements WHERE id = ? AND user_id = ?`, movementId, user.id);
      if (!existing) return sendJson({ error: "Not found" }, 404);

      await run(env.DB, `
        UPDATE movements SET type = ?, amount = ?, category_id = ?, description = ?, movement_date = ?, updated_at = ?
        WHERE id = ? AND user_id = ?
      `, type, amount, categoryId, description, date, nowIso(), movementId, user.id);

      return sendJson({ ok: true });
    }

    if (request.method === "DELETE") {
      const existing = await first(env.DB, `SELECT receipt_stored_name FROM movements WHERE id = ? AND user_id = ?`, movementId, user.id);
      if (!existing) return sendJson({ error: "Not found" }, 404);

      await run(env.DB, `DELETE FROM movements WHERE id = ? AND user_id = ?`, movementId, user.id);

      if (existing.receipt_stored_name) {
        try { await deleteReceipt(env, existing.receipt_stored_name); } catch (e) { /* best-effort */ }
      }

      return sendJson({ ok: true });
    }
  }

  return sendJson({ error: "Not found" }, 404);
}
