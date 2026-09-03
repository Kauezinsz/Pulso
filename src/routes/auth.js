import { sendJson, readJsonBody, parseCookies } from '../http.js';
import { requireUser, hashPassword, uuid, nowIso, setCookieHeader, clearCookieHeader, sha256 } from '../auth.js';
import { first, run } from '../db.js';

// Configuration
const SESSION_DAYS = 30;
const SESSION_TTL_MS = SESSION_DAYS * 24 * 60 * 60 * 1000;
const AUTH_PASSWORD_MIN_LENGTH = 8;
const AUTH_PASSWORD_MAX_LENGTH = 128;

function isValidEmail(email) {
  const normalized = String(email || "").trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized) && normalized.length <= 254;
}

function isValidPassword(password) {
  return typeof password === 'string' &&
    password.length >= AUTH_PASSWORD_MIN_LENGTH &&
    password.length <= AUTH_PASSWORD_MAX_LENGTH &&
    !/^\s+$/.test(password);
}

// Generate random salt
function generateSalt() {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

async function createSession(env, userId, email) {
  const sessionId = uuid();
  const token = uuid();
  const tokenHash = await sha256(token);
  const createdAt = nowIso();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();

  await run(env.DB, `
    INSERT INTO sessions (id, user_id, token_hash, created_at, last_seen_at, expires_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `, sessionId, userId, tokenHash, createdAt, createdAt, expiresAt);

  return { token, expiresAt };
}

async function seedDefaultCategories(env, userId) {
  const createdAt = nowIso();
  const income = ["salário", "freelance", "venda", "outros"];
  const expense = ["alimentação", "transporte", "moradia", "contas", "lazer", "saúde", "compras", "trabalho", "outros"];
  
  const stmts = [];
  
  income.forEach(name => {
    stmts.push(env.DB.prepare(`
      INSERT INTO categories (id, user_id, type, name, slug, is_default, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(uuid(), userId, 'income', name, name.toLowerCase(), 1, createdAt, createdAt));
  });

  expense.forEach(name => {
    stmts.push(env.DB.prepare(`
      INSERT INTO categories (id, user_id, type, name, slug, is_default, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(uuid(), userId, 'expense', name, name.toLowerCase(), 1, createdAt, createdAt));
  });

  await env.DB.batch(stmts);
}

export async function handleAuth(request, url, env) {
  const path = url.pathname;
  
  if (path === "/auth/me" && request.method === "GET") {
    const user = await requireUser(request, env);
    if (!user) return sendJson({ error: "Unauthorized" }, 401);
    return sendJson({ user: { id: user.id, email: user.email } });
  }

  if (path === "/auth/logout" && request.method === "POST") {
    const cookieHeader = request.headers.get("Cookie");
    const cookies = parseCookies(cookieHeader);
    const token = cookies.pulso_session;
    
    if (token) {
      const tokenHash = await sha256(token);
      await run(env.DB, `DELETE FROM sessions WHERE token_hash = ?`, tokenHash);
    }
    
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Set-Cookie": clearCookieHeader("pulso_session")
      }
    });
  }

  if (path === "/auth/register" && request.method === "POST") {
    const body = await readJsonBody(request);
    if (!body || !isValidEmail(body.email) || !isValidPassword(body.password)) {
      return sendJson({ error: "Invalid email or password" }, 400);
    }
    
    const email = body.email.trim().toLowerCase();
    const existing = await first(env.DB, `SELECT id FROM users WHERE email = ?`, email);
    if (existing) {
      return sendJson({ error: "registration_failed" }, 400);
    }

    const salt = generateSalt();
    const hash = await hashPassword(body.password, salt);
    const userId = uuid();
    const now = nowIso();

    await run(env.DB, `
      INSERT INTO users (id, email, password_salt, password_hash, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `, userId, email, salt, hash, now, now);
    
    // Seed default data
    await seedDefaultCategories(env, userId);
    
    const session = await createSession(env, userId, email);
    
    const isSecure = url.protocol === "https:"; // Best effort
    return new Response(JSON.stringify({ user: { id: userId, email } }), {
      status: 201,
      headers: {
        "Content-Type": "application/json",
        "Set-Cookie": setCookieHeader("pulso_session", session.token, {
          maxAge: SESSION_DAYS * 24 * 60 * 60,
          secure: isSecure
        })
      }
    });
  }

  if (path === "/auth/login" && request.method === "POST") {
    const body = await readJsonBody(request);
    if (!body || !isValidEmail(body.email) || !body.password) {
      return sendJson({ error: "Invalid request" }, 400);
    }
    
    const email = body.email.trim().toLowerCase();
    const user = await first(env.DB, `SELECT * FROM users WHERE email = ?`, email);
    
    if (!user) {
      return sendJson({ error: "invalid_credentials" }, 401);
    }
    
    // Verify PBKDF2 hash
    const hash = await hashPassword(body.password, user.password_salt);
    if (hash !== user.password_hash) {
      return sendJson({ error: "invalid_credentials" }, 401);
    }
    
    const session = await createSession(env, user.id, user.email);
    const isSecure = url.protocol === "https:";
    
    return new Response(JSON.stringify({ user: { id: user.id, email: user.email } }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Set-Cookie": setCookieHeader("pulso_session", session.token, {
          maxAge: SESSION_DAYS * 24 * 60 * 60,
          secure: isSecure
        })
      }
    });
  }

  return sendJson({ error: "Not found" }, 404);
}
