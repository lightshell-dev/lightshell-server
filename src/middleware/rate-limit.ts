/**
 * In-memory sliding window rate limiter.
 * Works on Workers, Bun, and Node.
 */

import { Context, Next } from "hono";

interface RateLimitConfig {
  max: number;
  windowMs: number;
  keyGenerator?: (c: Context) => string;
}

interface WindowEntry {
  count: number;
  resetAt: number;
}

const windows = new Map<string, WindowEntry>();

// Cleanup stale entries every 60 seconds
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of windows) {
    if (entry.resetAt < now) {
      windows.delete(key);
    }
  }
}, 60_000);

export function rateLimiter(config: RateLimitConfig) {
  return async (c: Context, next: Next) => {
    const key = config.keyGenerator
      ? config.keyGenerator(c)
      : getClientIP(c);

    const now = Date.now();
    const entry = windows.get(key);

    if (!entry || entry.resetAt < now) {
      // New window
      windows.set(key, { count: 1, resetAt: now + config.windowMs });
      c.header("X-RateLimit-Limit", String(config.max));
      c.header("X-RateLimit-Remaining", String(config.max - 1));
      await next();
      return;
    }

    entry.count++;

    if (entry.count > config.max) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
      c.header("Retry-After", String(retryAfter));
      c.header("X-RateLimit-Limit", String(config.max));
      c.header("X-RateLimit-Remaining", "0");
      return c.json(
        { error: "Rate limit exceeded", retryAfter },
        429
      );
    }

    c.header("X-RateLimit-Limit", String(config.max));
    c.header(
      "X-RateLimit-Remaining",
      String(config.max - entry.count)
    );

    await next();
  };
}

function getClientIP(c: Context): string {
  return (
    c.req.header("CF-Connecting-IP") ||
    c.req.header("X-Forwarded-For")?.split(",")[0]?.trim() ||
    c.req.header("X-Real-IP") ||
    "unknown"
  );
}

export { getClientIP };
