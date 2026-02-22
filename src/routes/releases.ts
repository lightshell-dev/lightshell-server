/**
 * Release CRUD routes (authenticated).
 * POST /api/releases — Upload new release
 * GET /api/releases — List all releases
 * DELETE /api/releases/:version — Deprecate (soft delete)
 */

import { Hono } from "hono";
import { StorageBackend, getJSON, putJSON } from "../storage/interface.js";
import { Release } from "../types.js";
import { sha256 } from "../crypto/sha256.js";
import { verify, canonicalManifest } from "../crypto/ed25519.js";
import {
  validateFilename,
  validateFileSize,
  validateGzip,
  validateVersion,
  validateFileCount,
} from "../middleware/upload-validator.js";

export function createReleasesRoute(
  getStorage: () => StorageBackend,
  getPublicKey: () => string,
  getBaseUrl: () => string
) {
  const app = new Hono();

  // List all releases
  app.get("/api/releases", async (c) => {
    const storage = getStorage();
    const releases = await getJSON<Record<string, Release>>(
      storage,
      "meta/releases.json"
    );

    if (!releases) {
      return c.json({ releases: [] });
    }

    const list = Object.values(releases).sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    return c.json({ releases: list });
  });

  // Upload new release
  app.post("/api/releases", async (c) => {
    const storage = getStorage();
    const publicKey = getPublicKey();

    const formData = await c.req.formData();
    const version = formData.get("version") as string;
    const notes = (formData.get("notes") as string) || "";
    const signature = formData.get("signature") as string;

    if (!version) {
      return c.json({ error: "Missing version" }, 400);
    }
    if (!signature) {
      return c.json({ error: "Missing signature" }, 400);
    }

    // Validate version
    const versionResult = await validateVersion(version, storage);
    if (!versionResult.valid) {
      return c.json({ error: versionResult.error }, 400);
    }

    // Collect uploaded files
    const files: Array<{ name: string; data: ArrayBuffer }> = [];
    for (const [key, value] of formData.entries()) {
      if (key.startsWith("file_") && value instanceof File) {
        const filenameResult = validateFilename(value.name);
        if (!filenameResult.valid) {
          return c.json({ error: filenameResult.error }, 400);
        }

        const sizeResult = validateFileSize(value.size);
        if (!sizeResult.valid) {
          return c.json({ error: sizeResult.error }, 400);
        }

        const data = await value.arrayBuffer();

        // Validate gzip magic bytes
        const header = new Uint8Array(data.slice(0, 2));
        const gzipResult = validateGzip(header);
        if (!gzipResult.valid) {
          return c.json({ error: `${value.name}: ${gzipResult.error}` }, 400);
        }

        files.push({ name: value.name, data });
      }
    }

    if (files.length === 0) {
      return c.json({ error: "No files uploaded" }, 400);
    }

    const countResult = validateFileCount(files.length);
    if (!countResult.valid) {
      return c.json({ error: countResult.error }, 400);
    }

    // Compute SHA256 hashes and build platform map
    const platforms: Record<string, { url: string; sha256: string; size: number }> = {};
    const baseUrl = getBaseUrl();

    for (const file of files) {
      const hash = await sha256(file.data);
      // Extract platform from filename: myapp-darwin-arm64.tar.gz → darwin-arm64
      const match = file.name.match(/(darwin|linux)-(arm64|x64)\.tar\.gz$/);
      if (!match) continue;

      const platform = `${match[1]}-${match[2]}`;
      platforms[platform] = {
        url: `${baseUrl}/releases/${version}/${platform}.tar.gz`,
        sha256: hash,
        size: file.data.byteLength,
      };
    }

    // Verify Ed25519 signature
    const pub_date = new Date().toISOString();
    const manifestData = {
      version,
      pub_date,
      platforms: Object.fromEntries(
        Object.entries(platforms).map(([k, v]) => [k, { sha256: v.sha256 }])
      ),
    };
    const canonical = canonicalManifest(manifestData);

    if (publicKey) {
      const valid = await verify(canonical, signature, publicKey);
      if (!valid) {
        return c.json(
          {
            error: "Invalid Ed25519 signature. Manifest was not signed with the registered public key.",
          },
          403
        );
      }
    }

    // Store binary files
    for (const file of files) {
      const match = file.name.match(/(darwin|linux)-(arm64|x64)\.tar\.gz$/);
      if (!match) continue;
      const platform = `${match[1]}-${match[2]}`;
      await storage.put(
        `releases/${version}/${platform}.tar.gz`,
        file.data
      );
    }

    // Create release record
    const release: Release = {
      version,
      notes,
      pub_date,
      platforms,
      signature,
      status: "active",
      created_at: new Date().toISOString(),
      download_count: 0,
    };

    // Update releases index
    const releases =
      (await getJSON<Record<string, Release>>(storage, "meta/releases.json")) ||
      {};
    releases[version] = release;
    await putJSON(storage, "meta/releases.json", releases);

    // Store individual manifest
    await putJSON(storage, `releases/${version}/manifest.json`, release);

    return c.json(
      {
        status: "published",
        version,
        platforms: Object.keys(platforms),
        signature: signature.slice(0, 16) + "...",
      },
      201
    );
  });

  // Deprecate a release (soft delete)
  app.delete("/api/releases/:version", async (c) => {
    const version = c.req.param("version");
    const storage = getStorage();

    const releases = await getJSON<Record<string, Release>>(
      storage,
      "meta/releases.json"
    );

    if (!releases?.[version]) {
      return c.json({ error: "Release not found" }, 404);
    }

    if (releases[version].status === "deprecated") {
      return c.json({ error: "Release already deprecated" }, 400);
    }

    // Soft delete — mark as deprecated, keep files
    releases[version].status = "deprecated";
    await putJSON(storage, "meta/releases.json", releases);

    return c.json({
      status: "deprecated",
      version,
      message:
        "Release hidden from latest.json. Files preserved for existing users.",
    });
  });

  return app;
}
