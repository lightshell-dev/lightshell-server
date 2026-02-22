/**
 * LightShell Release Server
 *
 * Hono-based server for hosting signed release binaries.
 * Runs on Cloudflare Workers, Bun, and Node.js.
 */

import { Hono } from "hono";
import { cors } from "hono/cors";
import { Env } from "./types.js";
import { StorageBackend } from "./storage/interface.js";
import { LocalStorage } from "./storage/local.js";
import { R2Storage } from "./storage/r2.js";
import { S3Storage } from "./storage/s3.js";
import { securityHeaders } from "./middleware/security-headers.js";
import { rateLimiter, getClientIP } from "./middleware/rate-limit.js";
import { authMiddleware } from "./middleware/auth.ts";
import { auditLogger } from "./middleware/audit-log.js";
import { hashApiKey } from "./crypto/sha256.js";
import { createLatestRoute } from "./routes/latest.js";
import { createDownloadRoute } from "./routes/download.js";
import { createReleasesRoute } from "./routes/releases.js";
import { createDashboardRoutes } from "./routes/dashboard.js";

const app = new Hono<{ Bindings: Env }>();

// --- Storage factory ---
let storageInstance: StorageBackend | null = null;

function getStorage(env?: Env): StorageBackend {
  if (storageInstance) return storageInstance;

  const backend = env?.STORAGE_BACKEND || process.env.STORAGE_BACKEND || "local";

  switch (backend) {
    case "r2":
      if (!env?.RELEASES_BUCKET) {
        throw new Error("R2 storage requires RELEASES_BUCKET binding");
      }
      storageInstance = new R2Storage(env.RELEASES_BUCKET);
      break;

    case "s3":
      storageInstance = new S3Storage({
        region: env?.AWS_REGION || process.env.AWS_REGION || "us-east-1",
        bucket: env?.S3_BUCKET || process.env.S3_BUCKET || "lightshell-releases",
        accessKeyId: env?.AWS_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID || "",
        secretAccessKey: env?.AWS_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY || "",
        endpoint: env?.S3_ENDPOINT || process.env.S3_ENDPOINT,
      });
      break;

    default:
      storageInstance = new LocalStorage(
        env?.DATA_DIR || process.env.DATA_DIR || "./data"
      );
  }

  return storageInstance;
}

function getBaseUrl(env?: Env): string {
  return env?.BASE_URL || process.env.BASE_URL || "http://localhost:8080";
}

function getPublicKey(env?: Env): string {
  return env?.ED25519_PUBLIC_KEY || process.env.ED25519_PUBLIC_KEY || "";
}

async function getApiKeyHash(env?: Env): Promise<string> {
  const raw = env?.API_KEY || process.env.API_KEY || "";
  if (!raw) return "";
  return hashApiKey(raw);
}

// --- Global middleware ---
app.use("*", securityHeaders);
app.use("*", cors({ origin: "*", allowMethods: ["GET", "HEAD"] }));

// Rate limiting
app.use("/latest.json", rateLimiter({ max: 60, windowMs: 60_000 }));
app.use(
  "/releases/*",
  rateLimiter({ max: 30, windowMs: 60_000 })
);
app.use(
  "/api/*",
  rateLimiter({
    max: 100,
    windowMs: 3600_000,
    keyGenerator: (c) => c.get("apiKeyFingerprint") || getClientIP(c),
  })
);

// Auth for API endpoints
app.use("/api/*", async (c, next) => {
  const apiKeyHash = await getApiKeyHash(c.env as Env);
  if (!apiKeyHash) {
    return c.json({ error: "Server API key not configured" }, 500);
  }

  const authHeader = c.req.header("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return c.json({ error: "Missing Authorization header" }, 401);
  }

  const token = authHeader.slice(7);
  const tokenHash = await hashApiKey(token);

  // Constant-time compare
  if (tokenHash.length !== apiKeyHash.length) {
    return c.json({ error: "Invalid API key" }, 401);
  }
  let mismatch = 0;
  for (let i = 0; i < tokenHash.length; i++) {
    mismatch |= tokenHash.charCodeAt(i) ^ apiKeyHash.charCodeAt(i);
  }
  if (mismatch !== 0) {
    return c.json({ error: "Invalid API key" }, 401);
  }

  c.set("apiKeyFingerprint", apiKeyHash.slice(0, 8));
  await next();
});

// Audit logging for write operations
app.use(
  "/api/*",
  auditLogger((c) => getStorage(c.env as Env))
);

// --- Routes ---

// Public routes
app.route(
  "/",
  createLatestRoute(
    () => getStorage(),
    () => getBaseUrl()
  )
);
app.route("/", createDownloadRoute(() => getStorage()));

// Dashboard (public — has its own auth via the SPA)
app.route("/", createDashboardRoutes(() => getStorage()));

// Authenticated API routes
app.route(
  "/",
  createReleasesRoute(
    () => getStorage(),
    () => getPublicKey(),
    () => getBaseUrl()
  )
);

// --- Export for different runtimes ---

// Cloudflare Workers
export default {
  fetch: app.fetch,
};

// Bun / Node.js
const port = parseInt(process.env.PORT || "8080");
if (typeof Bun !== "undefined" || typeof process !== "undefined") {
  try {
    // Only start listening if not in Workers environment
    if (typeof globalThis.addEventListener !== "function" || typeof Bun !== "undefined") {
      console.log(`LightShell Release Server listening on port ${port}`);
      console.log(`Dashboard: http://localhost:${port}`);
      console.log(`Latest:    http://localhost:${port}/latest.json`);
    }
  } catch {
    // Workers environment — skip
  }
}

export { app };
