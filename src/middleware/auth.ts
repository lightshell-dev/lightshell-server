/**
 * Authentication middleware.
 * Verifies Bearer token against hashed API key.
 */

import { Context, Next } from "hono";
import { verifyApiKey } from "../crypto/sha256.js";

export function authMiddleware(getApiKey: (c: Context) => string) {
  return async (c: Context, next: Next) => {
    const authHeader = c.req.header("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return c.json(
        { error: "Missing or invalid Authorization header" },
        401
      );
    }

    const token = authHeader.slice(7);
    const storedHash = getApiKey(c);

    if (!storedHash) {
      return c.json({ error: "Server not configured with API key" }, 500);
    }

    const valid = await verifyApiKey(token, storedHash);
    if (!valid) {
      return c.json({ error: "Invalid API key" }, 401);
    }

    // Store key fingerprint for audit logging
    const fingerprint = storedHash.slice(0, 8);
    c.set("apiKeyFingerprint", fingerprint);

    await next();
  };
}

/**
 * Extract API key hash from environment or config.
 */
export function getApiKeyHash(c: Context): string {
  // Try environment variable first
  const env = c.env as Record<string, string>;
  if (env?.API_KEY_HASH) return env.API_KEY_HASH;

  // For simple setups, hash the raw key on the fly
  // (less secure but convenient for dev)
  return "";
}
