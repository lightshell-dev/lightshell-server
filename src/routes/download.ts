/**
 * GET /releases/:version/:file — Public download endpoint.
 * Serves binary files and tracks download counts.
 */

import { Hono } from "hono";
import { StorageBackend, getJSON, putJSON } from "../storage/interface.js";
import { DownloadStat, Release } from "../types.js";

export function createDownloadRoute(getStorage: () => StorageBackend) {
  const app = new Hono();

  app.get("/releases/:version/:file", async (c) => {
    const version = c.req.param("version");
    const file = c.req.param("file");
    const storage = getStorage();

    // Validate the release exists and is active
    const releases = await getJSON<Record<string, Release>>(
      storage,
      "meta/releases.json"
    );

    if (!releases?.[version]) {
      return c.json({ error: "Release not found" }, 404);
    }

    if (releases[version].status === "deprecated") {
      return c.json({ error: "Release has been deprecated" }, 410);
    }

    // Serve the file
    const key = `releases/${version}/${file}`;
    const result = await storage.get(key);

    if (!result) {
      return c.json({ error: "File not found" }, 404);
    }

    // Track download
    trackDownload(storage, version, file).catch(() => {});

    // Determine content type
    const contentType = file.endsWith(".tar.gz")
      ? "application/gzip"
      : "application/octet-stream";

    c.header("Content-Type", contentType);
    c.header("Content-Length", String(result.size));
    c.header(
      "Content-Disposition",
      `attachment; filename="${file}"`
    );
    c.header("Cache-Control", "public, max-age=86400, immutable");

    if (result.data instanceof ArrayBuffer) {
      return c.body(result.data);
    }
    return c.body(result.data as ReadableStream);
  });

  return app;
}

async function trackDownload(
  storage: StorageBackend,
  version: string,
  file: string
): Promise<void> {
  const platform = file.replace(".tar.gz", "");
  const statsKey = "meta/stats.json";

  const stats: DownloadStat[] =
    (await getJSON<DownloadStat[]>(storage, statsKey)) || [];

  stats.push({
    version,
    platform,
    timestamp: new Date().toISOString(),
  });

  // Keep last 10K stats
  const trimmed = stats.slice(-10000);
  await putJSON(storage, statsKey, trimmed);
}
