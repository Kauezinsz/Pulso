import { sendJson, buildSecurityHeaders } from './http.js';
import { handleAuth } from './routes/auth.js';
import { handleBootstrap } from './routes/bootstrap.js';
import { handleCycles } from './routes/cycles.js';
import { handleCategories } from './routes/categories.js';
import { handleMovements } from './routes/movements.js';
import { handleGoals } from './routes/goals.js';
import { handleCommitments } from './routes/commitments.js';
import { handleImport } from './routes/import.js';

async function router(request, url, env, ctx) {
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        ...buildSecurityHeaders()
      }
    });
  }

  const path = url.pathname;

  try {
    if (path.startsWith("/auth/")) return await handleAuth(request, url, env);
    if (path === "/api/bootstrap") return await handleBootstrap(request, url, env);
    if (path.startsWith("/api/cycles")) return await handleCycles(request, url, env);
    if (path.startsWith("/api/categories")) return await handleCategories(request, url, env);
    if (path.startsWith("/api/movements")) return await handleMovements(request, url, env);
    if (path.startsWith("/api/goals")) return await handleGoals(request, url, env);
    if (path.startsWith("/api/commitments")) return await handleCommitments(request, url, env);
    if (path.startsWith("/api/import")) return await handleImport(request, url, env);
    
    if (path.startsWith("/api/") || path.startsWith("/auth/")) {
      return sendJson({ error: "Not found" }, 404);
    }
  } catch (error) {
    console.error("API Error:", error);
    return sendJson({ error: "Internal Server Error" }, 500);
  }

  return null; // Fallback to ASSETS
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const response = await router(request, url, env, ctx);
    
    if (response) return response;
    
    // Serve static files via ASSETS binding
    return env.ASSETS.fetch(request);
  }
};
