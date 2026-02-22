/**
 * Local filesystem storage backend.
 * Stores files in ./data/releases/ and metadata in ./data/meta/.
 */

import { StorageBackend } from "./interface.js";
import { mkdir, readFile, writeFile, unlink, readdir, stat } from "node:fs/promises";
import { join, dirname, resolve } from "node:path";
import { existsSync } from "node:fs";

export class LocalStorage implements StorageBackend {
  private baseDir: string;

  constructor(dataDir: string = "./data") {
    this.baseDir = dataDir;
  }

  private resolvePath(key: string): string {
    // Prevent path traversal — resolve and verify within base dir
    const resolved = resolve(join(this.baseDir, key));
    const base = resolve(this.baseDir);
    if (!resolved.startsWith(base + "/") && resolved !== base) {
      throw new Error(`Path traversal denied: ${key}`);
    }
    return resolved;
  }

  async put(
    key: string,
    data: ArrayBuffer | ReadableStream | Uint8Array,
    _metadata?: Record<string, string>
  ): Promise<void> {
    const filePath = this.resolvePath(key);
    await mkdir(dirname(filePath), { recursive: true });

    let bytes: Uint8Array;
    if (data instanceof ArrayBuffer) {
      bytes = new Uint8Array(data);
    } else if (data instanceof Uint8Array) {
      bytes = data;
    } else {
      // ReadableStream
      const reader = (data as ReadableStream).getReader();
      const chunks: Uint8Array[] = [];
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
      }
      const total = chunks.reduce((s, c) => s + c.length, 0);
      bytes = new Uint8Array(total);
      let offset = 0;
      for (const chunk of chunks) {
        bytes.set(chunk, offset);
        offset += chunk.length;
      }
    }

    await writeFile(filePath, bytes);
  }

  async get(
    key: string
  ): Promise<{
    data: ArrayBuffer;
    metadata?: Record<string, string>;
    size: number;
  } | null> {
    const filePath = this.resolvePath(key);
    try {
      const buffer = await readFile(filePath);
      return {
        data: buffer.buffer.slice(
          buffer.byteOffset,
          buffer.byteOffset + buffer.byteLength
        ),
        size: buffer.length,
      };
    } catch {
      return null;
    }
  }

  async delete(key: string): Promise<void> {
    const filePath = this.resolvePath(key);
    try {
      await unlink(filePath);
    } catch {
      // Ignore if not found
    }
  }

  async list(prefix?: string): Promise<string[]> {
    const dir = prefix ? this.resolvePath(prefix) : this.baseDir;
    try {
      const entries = await readdir(dir, {
        recursive: true,
        withFileTypes: true,
      });
      return entries
        .filter((e) => e.isFile())
        .map((e) => {
          const base = e.parentPath || (e as any).path || dir;
          const full = join(base, e.name);
          return full.slice(this.baseDir.length + 1);
        });
    } catch {
      return [];
    }
  }

  async exists(key: string): Promise<boolean> {
    const filePath = this.resolvePath(key);
    return existsSync(filePath);
  }
}
