/**
 * Audit logging middleware.
 * Logs every write operation to storage.
 */

import { Context, Next } from "hono";
import { AuditEntry } from "../types.js";
import { StorageBackend, getJSON, putJSON } from "../storage/interface.js";
import { sha256String } from "../crypto/sha256.js";
import { getClientIP } from "./rate-limit.js";

const AUDIT_KEY = "meta/audit.json";
const MAX_ENTRIES = 1000;

export function auditLogger(getStorage: (c: Context) => StorageBackend) {
  return async (c: Context, next: Next) => {
    // Only audit write operations
    const method = c.req.method;
    if (method === "GET" || method === "HEAD" || method === "OPTIONS") {
      await next();
      return;
    }

    await next();

    // Log after the handler runs
    const storage = getStorage(c);
    const ip = getClientIP(c);
    const hashedIP = (await sha256String(ip)).slice(0, 16);

    const entry: AuditEntry = {
      timestamp: new Date().toISOString(),
      action: inferAction(c.req.method, c.req.path),
      ip: hashedIP,
      apiKeyFingerprint: c.get("apiKeyFingerprint") || "unknown",
      result: c.res.status < 400 ? "success" : "rejected",
    };

    // Extract version if present
    const versionMatch = c.req.path.match(/\/releases\/([^/]+)/);
    if (versionMatch) {
      entry.version = versionMatch[1];
    }

    if (c.res.status >= 400) {
      entry.reason = `HTTP ${c.res.status}`;
    }

    try {
      const existing = (await getJSON<AuditEntry[]>(storage, AUDIT_KEY)) || [];
      existing.unshift(entry);
      // Keep only the most recent entries
      const trimmed = existing.slice(0, MAX_ENTRIES);
      await putJSON(storage, AUDIT_KEY, trimmed);
    } catch {
      // Don't fail the request if audit logging fails
      console.error("Failed to write audit log:", entry);
    }
  };
}

function inferAction(
  method: string,
  path: string
): AuditEntry["action"] {
  if (method === "POST" && path.includes("/releases")) return "release.create";
  if (method === "DELETE" && path.includes("/releases"))
    return "release.deprecate";
  if (path.includes("/keys/rotate")) return "key.rotate";
  return "settings.update";
}

export async function getAuditLog(
  storage: StorageBackend,
  limit: number = 50,
  offset: number = 0
): Promise<{ entries: AuditEntry[]; total: number }> {
  const all = (await getJSON<AuditEntry[]>(storage, AUDIT_KEY)) || [];
  return {
    entries: all.slice(offset, offset + limit),
    total: all.length,
  };
}
