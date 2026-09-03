export function buildSecurityHeaders() {
  return {
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(self), microphone=(), geolocation=(), payment=(), usb=(), fullscreen=(self), autoplay=(), display-capture=(), clipboard-read=(), clipboard-write=(), xr-spatial-tracking=(), screen-wake-lock=()",
    "X-Frame-Options": "DENY",
    "Content-Security-Policy": [
      "default-src 'self'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
      "frame-ancestors 'none'",
      "script-src 'self'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' blob: data:",
      "font-src 'self' data:",
      "connect-src 'self'",
      "manifest-src 'self'",
      "worker-src 'self'",
      "media-src 'self' blob:",
    ].join("; "),
    "Strict-Transport-Security": "max-age=15552000; includeSubDomains"
  };
}

export function sendJson(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...buildSecurityHeaders(),
      ...extraHeaders
    }
  });
}

export function sendText(text, status = 200, extraHeaders = {}) {
  return new Response(String(text), {
    status,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      ...buildSecurityHeaders(),
      ...extraHeaders
    }
  });
}

export function parseCookies(cookieHeader) {
  const cookies = {};
  if (!cookieHeader) return cookies;
  const parts = cookieHeader.split(';');
  for (const part of parts) {
    const [name, ...rest] = part.split('=');
    const value = rest.join('=');
    if (name && value !== undefined) {
      cookies[name.trim()] = decodeURIComponent(value.trim());
    }
  }
  return cookies;
}

export async function readJsonBody(request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}
