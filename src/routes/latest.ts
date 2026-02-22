/**
 * GET /latest.json — Public endpoint.
 * Returns the newest non-deprecated release manifest.
 */

import { Hono } from "hono";
import { StorageBackend, getJSON } from "../storage/interface.js";
import { Release, LatestManifest } from "../types.js";
import { compareSemver } from "../middleware/upload-validator.js";

export function createLatestRoute(getStorage: () => StorageBackend, getBaseUrl: () => string) {
  const app = new Hono();

  app.get("/latest.json", async (c) => {
    const storage = getStorage();
    const releases = await getJSON<Record<string, Release>>(
      storage,
      "meta/releases.json"
    );

    if (!releases) {
      return c.json({ error: "No releases found" }, 404);
    }

    // Find the newest active release
    const activeVersions = Object.entries(releases)
      .filter(([_, r]) => r.status === "active")
      .sort(([a], [b]) => compareSemver(b, a));

    if (activeVersions.length === 0) {
      return c.json({ error: "No active releases" }, 404);
    }

    const [version, release] = activeVersions[0];
    const baseUrl = getBaseUrl();

    const manifest: LatestManifest = {
      version: release.version,
      notes: release.notes,
      pub_date: release.pub_date,
      platforms: {},
      signature: release.signature,
    };

    for (const [platform, info] of Object.entries(release.platforms)) {
      manifest.platforms[platform] = {
        url: `${baseUrl}/releases/${version}/${platform}.tar.gz`,
        sha256: info.sha256,
      };
    }

    // Cache for 5 minutes
    c.header("Cache-Control", "public, max-age=300");
    return c.json(manifest);
  });

  return app;
}
