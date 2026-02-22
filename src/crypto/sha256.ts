/**
 * SHA-256 hashing using Web Crypto API (works on Workers, Bun, Node)
 */

export async function sha256(data: ArrayBuffer | Uint8Array): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function sha256String(text: string): Promise<string> {
  return sha256(new TextEncoder().encode(text));
}

export async function hashApiKey(key: string): Promise<string> {
  return sha256String(key);
}

export async function verifyApiKey(
  provided: string,
  storedHash: string
): Promise<boolean> {
  const hash = await hashApiKey(provided);
  // Constant-time comparison
  if (hash.length !== storedHash.length) return false;
  let result = 0;
  for (let i = 0; i < hash.length; i++) {
    result |= hash.charCodeAt(i) ^ storedHash.charCodeAt(i);
  }
  return result === 0;
}
