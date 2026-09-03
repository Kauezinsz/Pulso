import { parseCookies, sendJson } from './http.js';
import { first, run } from './db.js';

export async function sha256(value) {
  const encoder = new TextEncoder();
  const data = encoder.encode(value);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export function uuid() {
  return crypto.randomUUID();
}

export function nowIso() {
  return new Date().toISOString();
}

export async function hashPassword(password, salt) {
  const enc = new TextEncoder();
  const passwordKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits"]
  );
  
  const saltBuffer = enc.encode(salt);
  
  const hashBuffer = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: saltBuffer,
      iterations: 100000,
      hash: "SHA-256"
    },
    passwordKey,
    256 // 64 bytes in hex is 128 hex chars, here we use 256 bits (32 bytes) for pbkdf2
  );
  
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function verifyPassword(password, salt, expectedHash) {
  // If we wanted to support scrypt from legacy node, we'd need node:crypto. 
  // Here we use PBKDF2 for new hashes via Web Crypto API.
  const hash = await hashPassword(password, salt);
  return hash === expectedHash;
}

export async function requireUser(request, env) {
  const cookieHeader = request.headers.get("Cookie");
  const cookies = parseCookies(cookieHeader);
  const token = cookies.pulso_session;
  
  if (!token) return null;
  
  const tokenHash = await sha256(token);
  
  const session = await first(env.DB, `
    SELECT sessions.id, sessions.user_id AS userId, sessions.expires_at AS expiresAt, users.email
    FROM sessions
    JOIN users ON users.id = sessions.user_id
    WHERE sessions.token_hash = ?
  `, tokenHash);
  
  if (!session) return null;
  
  const now = new Date();
  const expiresAt = new Date(session.expiresAt);
  if (now > expiresAt) {
    await run(env.DB, `DELETE FROM sessions WHERE id = ?`, session.id);
    return null;
  }
  
  await run(env.DB, `UPDATE sessions SET last_seen_at = ? WHERE id = ?`, nowIso(), session.id);
  
  return { id: session.userId, email: session.email };
}

export function setCookieHeader(name, value, options = {}) {
  const sameSite = options.sameSite || "Lax";
  const pathValue = options.path || "/";
  const parts = [`${name}=${encodeURIComponent(value)}`, `Path=${pathValue}`, "HttpOnly", `SameSite=${sameSite}`];
  if (options.maxAge !== undefined) parts.push(`Max-Age=${Math.floor(options.maxAge)}`);
  if (options.secure) parts.push("Secure");
  return parts.join("; ");
}

export function clearCookieHeader(name, options = {}) {
  return setCookieHeader(name, "", {
    ...options,
    maxAge: 0
  });
}
