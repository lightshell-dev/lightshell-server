/**
 * Security headers middleware.
 * Applied to every response.
 */

import { Context, Next } from "hono";

export async function securityHeaders(c: Context, next: Next) {
  await next();

  c.header("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  c.header("X-Content-Type-Options", "nosniff");
  c.header("X-Frame-Options", "DENY");
  c.header("X-XSS-Protection", "0");
  c.header("Referrer-Policy", "strict-origin-when-cross-origin");
  c.header(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=()"
  );

  // CSP for dashboard pages — relaxed to support SvelteKit's dynamic imports and Google Fonts
  if (c.req.path === "/" || c.req.path.startsWith("/dashboard")) {
    c.header(
      "Content-Security-Policy",
      "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob:; connect-src 'self' https://fonts.googleapis.com https://fonts.gstatic.com"
    );
  }
}
