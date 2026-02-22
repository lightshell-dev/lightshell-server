/**
 * Storage backend abstraction for release files and metadata.
 */

export interface StorageBackend {
  /** Store a file or metadata blob */
  put(
    key: string,
    data: ArrayBuffer | ReadableStream | Uint8Array,
    metadata?: Record<string, string>
  ): Promise<void>;

  /** Retrieve a file. Returns null if not found. */
  get(
    key: string
  ): Promise<{
    data: ReadableStream | ArrayBuffer;
    metadata?: Record<string, string>;
    size: number;
  } | null>;

  /** Delete a key */
  delete(key: string): Promise<void>;

  /** List keys with optional prefix */
  list(prefix?: string): Promise<string[]>;

  /** Check if a key exists */
  exists(key: string): Promise<boolean>;
}

/**
 * JSON metadata helpers — store/retrieve JSON alongside files
 */
export async function putJSON(
  storage: StorageBackend,
  key: string,
  data: unknown
): Promise<void> {
  const json = JSON.stringify(data, null, 2);
  await storage.put(key, new TextEncoder().encode(json));
}

export async function getJSON<T>(
  storage: StorageBackend,
  key: string
): Promise<T | null> {
  const result = await storage.get(key);
  if (!result) return null;

  let text: string;
  if (result.data instanceof ArrayBuffer) {
    text = new TextDecoder().decode(result.data);
  } else {
    const reader = (result.data as ReadableStream).getReader();
    const chunks: Uint8Array[] = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }
    const total = chunks.reduce((s, c) => s + c.length, 0);
    const merged = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      merged.set(chunk, offset);
      offset += chunk.length;
    }
    text = new TextDecoder().decode(merged);
  }

  return JSON.parse(text) as T;
}
