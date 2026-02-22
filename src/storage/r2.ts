/**
 * Cloudflare R2 storage backend.
 * Uses the R2 bucket binding from wrangler.toml.
 */

import { StorageBackend } from "./interface.js";

export class R2Storage implements StorageBackend {
  private bucket: R2Bucket;

  constructor(bucket: R2Bucket) {
    this.bucket = bucket;
  }

  async put(
    key: string,
    data: ArrayBuffer | ReadableStream | Uint8Array,
    metadata?: Record<string, string>
  ): Promise<void> {
    const value = data instanceof Uint8Array ? data.buffer : data;
    await this.bucket.put(key, value as any, {
      customMetadata: metadata,
    });
  }

  async get(
    key: string
  ): Promise<{
    data: ReadableStream;
    metadata?: Record<string, string>;
    size: number;
  } | null> {
    const object = await this.bucket.get(key);
    if (!object) return null;

    return {
      data: object.body,
      metadata: object.customMetadata as Record<string, string>,
      size: object.size,
    };
  }

  async delete(key: string): Promise<void> {
    await this.bucket.delete(key);
  }

  async list(prefix?: string): Promise<string[]> {
    const result = await this.bucket.list(prefix ? { prefix } : undefined);
    return result.objects.map((o) => o.key);
  }

  async exists(key: string): Promise<boolean> {
    const head = await this.bucket.head(key);
    return head !== null;
  }
}
