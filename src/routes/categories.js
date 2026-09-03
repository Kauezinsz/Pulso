import { requireUser, uuid, nowIso } from '../auth.js';
import { sendJson, readJsonBody } from '../http.js';
import { all, first, run } from '../db.js';

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

export async function handleCategories(request, url, env) {
  const user = await requireUser(request, env);
  if (!user) return sendJson({ error: "Unauthorized" }, 401);

  const path = url.pathname;
  const match = path.match(/^\/api\/categories\/([^/]+)$/);
  const id = match ? match[1] : null;

  if (request.method === "GET" && path === "/api/categories") {
    const categories = await all(env.DB, `
      SELECT id, type, name, slug, is_default AS isDefault, created_at AS createdAt, updated_at AS updatedAt
      FROM categories WHERE user_id = ?
      ORDER BY CASE type WHEN 'income' THEN 0 ELSE 1 END, is_default DESC, name ASC
    `, user.id);
    return sendJson({
      income: categories.filter(c => c.type === "income"),
      expense: categories.filter(c => c.type === "expense")
    });
  }

  if (request.method === "POST" && path === "/api/categories") {
    const body = await readJsonBody(request);
    const type = body.type === "income" ? "income" : "expense";
    const name = normalizeName(body.name);
    const slug = slugify(name);
    
    if (!name || !slug) return sendJson({ error: "invalid_category" }, 400);

    const existing = await first(env.DB, `SELECT id FROM categories WHERE user_id = ? AND type = ? AND slug = ?`, user.id, type, slug);
    if (existing) return sendJson({ error: "category_exists" }, 409);

    const newId = uuid();
    const timestamp = nowIso();
    
    await run(env.DB, `
      INSERT INTO categories (id, user_id, type, name, slug, is_default, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 0, ?, ?)
    `, newId, user.id, type, name, slug, timestamp, timestamp);

    const created = await first(env.DB, `
      SELECT id, type, name, slug, is_default AS isDefault, created_at AS createdAt, updated_at AS updatedAt
      FROM categories WHERE id = ? AND user_id = ?
    `, newId, user.id);
    
    const allCategories = await all(env.DB, `
      SELECT id, type, name, slug, is_default AS isDefault, created_at AS createdAt, updated_at AS updatedAt
      FROM categories WHERE user_id = ?
      ORDER BY CASE type WHEN 'income' THEN 0 ELSE 1 END, is_default DESC, name ASC
    `, user.id);
    
    return sendJson({
      category: created,
      categories: {
        income: allCategories.filter(c => c.type === "income"),
        expense: allCategories.filter(c => c.type === "expense")
      }
    }, 201);
  }

  if (id && (request.method === "PUT" || request.method === "PATCH")) {
    const body = await readJsonBody(request);
    const name = normalizeName(body.name);
    const slug = slugify(name);
    
    if (!name || !slug) return sendJson({ error: "invalid_category" }, 400);
    
    const current = await first(env.DB, `SELECT * FROM categories WHERE id = ? AND user_id = ?`, id, user.id);
    if (!current) return sendJson({ error: "category_not_found" }, 404);

    const existing = await first(env.DB, `SELECT id FROM categories WHERE user_id = ? AND type = ? AND slug = ?`, user.id, current.type, slug);
    if (existing && existing.id !== id) return sendJson({ error: "category_exists" }, 409);

    const timestamp = nowIso();
    await run(env.DB, `UPDATE categories SET name = ?, slug = ?, updated_at = ? WHERE id = ? AND user_id = ?`, name, slug, timestamp, id, user.id);
    
    const updated = await first(env.DB, `
      SELECT id, type, name, slug, is_default AS isDefault, created_at AS createdAt, updated_at AS updatedAt
      FROM categories WHERE id = ? AND user_id = ?
    `, id, user.id);
    
    const allCategories = await all(env.DB, `
      SELECT id, type, name, slug, is_default AS isDefault, created_at AS createdAt, updated_at AS updatedAt
      FROM categories WHERE user_id = ?
      ORDER BY CASE type WHEN 'income' THEN 0 ELSE 1 END, is_default DESC, name ASC
    `, user.id);
    
    return sendJson({
      category: updated,
      categories: {
        income: allCategories.filter(c => c.type === "income"),
        expense: allCategories.filter(c => c.type === "expense")
      }
    });
  }

  if (id && request.method === "DELETE") {
    const current = await first(env.DB, `SELECT id FROM categories WHERE id = ? AND user_id = ?`, id, user.id);
    if (!current) return sendJson({ error: "category_not_found" }, 404);
    
    try {
      await run(env.DB, `DELETE FROM categories WHERE id = ? AND user_id = ?`, id, user.id);
    } catch (err) {
      return sendJson({ error: "category_in_use" }, 409);
    }
    
    const allCategories = await all(env.DB, `
      SELECT id, type, name, slug, is_default AS isDefault, created_at AS createdAt, updated_at AS updatedAt
      FROM categories WHERE user_id = ?
      ORDER BY CASE type WHEN 'income' THEN 0 ELSE 1 END, is_default DESC, name ASC
    `, user.id);
    
    return sendJson({
      ok: true,
      categories: {
        income: allCategories.filter(c => c.type === "income"),
        expense: allCategories.filter(c => c.type === "expense")
      }
    });
  }

  return sendJson({ error: "Not found" }, 404);
}
