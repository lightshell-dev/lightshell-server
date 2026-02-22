/**
 * Dashboard and admin API routes (authenticated).
 * GET / — Serve dashboard SPA
 * GET /api/audit — Audit log
 * GET /api/stats — Download statistics
 * POST /api/keys/rotate — Rotate API key
 * PUT /api/settings/public-key — Update signing public key
 */

import { Hono } from "hono";
import { serveStatic } from "hono/bun";
import { StorageBackend, getJSON, putJSON } from "../storage/interface.js";
import { getAuditLog } from "../middleware/audit-log.js";
import { DownloadStat, ServerMeta } from "../types.js";
import { sha256String } from "../crypto/sha256.js";
import { existsSync } from "fs";

// Resolve dashboard dist path — Docker copies to ./src/dashboard/dist/, local build is ./dashboard/dist/
const dashboardDist = existsSync("./src/dashboard/dist/index.html")
  ? "./src/dashboard/dist"
  : "./dashboard/dist";

export function createDashboardRoutes(getStorage: () => StorageBackend) {
  const app = new Hono();

  // Serve SvelteKit _app assets from dashboard dist
  app.use("/_app/*", serveStatic({ root: dashboardDist }));

  // Serve dashboard SPA — try built index.html first, fall back to placeholder
  app.get("/", async (c) => {
    try {
      const file = Bun.file(`${dashboardDist}/index.html`);
      if (await file.exists()) {
        return c.html(await file.text());
      }
    } catch {
      // Not running under Bun or file doesn't exist — serve placeholder
    }

    return c.html(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>LightShell Release Server</title>
  <style>
    body {
      font-family: 'Inter', -apple-system, system-ui, sans-serif;
      background: #F5F4F0;
      color: #1C1B19;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
    }
    .container {
      text-align: center;
      padding: 48px;
      background: #fff;
      border-radius: 16px;
      border: 1px solid #DDDCD8;
      max-width: 480px;
    }
    h1 { font-size: 24px; font-weight: 700; margin: 0 0 8px; }
    p { color: #6E6D6A; margin: 0 0 24px; font-size: 14px; }
    a {
      display: inline-block;
      background: #1C1B19;
      color: #fff;
      padding: 10px 24px;
      border-radius: 8px;
      text-decoration: none;
      font-weight: 500;
      font-size: 14px;
    }
    a:hover { opacity: 0.9; }
  </style>
</head>
<body>
  <div class="container">
    <h1>LightShell Release Server</h1>
    <p>The dashboard is served from the Svelte SPA build. Run <code>cd dashboard && bun run build</code> to generate it.</p>
    <a href="/health">Check Health</a>
  </div>
</body>
</html>`);
  });

  // Health check
  app.get("/health", (c) => {
    return c.json({
      status: "ok",
      version: "1.0.0",
      timestamp: new Date().toISOString(),
    });
  });

  // Audit log
  app.get("/api/audit", async (c) => {
    const storage = getStorage();
    const limit = parseInt(c.req.query("limit") || "50");
    const offset = parseInt(c.req.query("offset") || "0");

    const { entries, total } = await getAuditLog(storage, limit, offset);
    return c.json({ entries, total, limit, offset });
  });

  // Download statistics
  app.get("/api/stats", async (c) => {
    const storage = getStorage();
    const stats =
      (await getJSON<DownloadStat[]>(storage, "meta/stats.json")) || [];

    // Aggregate by version
    const byVersion: Record<string, number> = {};
    const byPlatform: Record<string, number> = {};
    const byDay: Record<string, number> = {};

    for (const stat of stats) {
      byVersion[stat.version] = (byVersion[stat.version] || 0) + 1;
      byPlatform[stat.platform] = (byPlatform[stat.platform] || 0) + 1;

      const day = stat.timestamp.split("T")[0];
      byDay[day] = (byDay[day] || 0) + 1;
    }

    return c.json({
      total: stats.length,
      byVersion,
      byPlatform,
      byDay,
    });
  });

  // Rotate API key
  app.post("/api/keys/rotate", async (c) => {
    const storage = getStorage();

    // Generate new key
    const keyBytes = new Uint8Array(32);
    crypto.getRandomValues(keyBytes);
    const newKey = Array.from(keyBytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    const newHash = await sha256String(newKey);

    // Update stored config
    const meta =
      (await getJSON<ServerMeta>(storage, "meta/server.json")) || {
        publicKey: "",
        apiKeyHash: "",
        createdAt: new Date().toISOString(),
      };
    meta.apiKeyHash = newHash;
    await putJSON(storage, "meta/server.json", meta);

    return c.json({
      message: "API key rotated. Update your environment variable.",
      newKey,
      newKeyHash: newHash,
    });
  });

  // Update Ed25519 public key
  app.put("/api/settings/public-key", async (c) => {
    const body = await c.req.json<{ publicKey: string }>();
    if (!body.publicKey) {
      return c.json({ error: "Missing publicKey" }, 400);
    }

    const storage = getStorage();
    const meta =
      (await getJSON<ServerMeta>(storage, "meta/server.json")) || {
        publicKey: "",
        apiKeyHash: "",
        createdAt: new Date().toISOString(),
      };
    meta.publicKey = body.publicKey;
    await putJSON(storage, "meta/server.json", meta);

    return c.json({
      message: "Public key updated",
      publicKey: body.publicKey,
    });
  });

  return app;
}
