/**
 * Ed25519 signing and verification for release manifests.
 * Uses @noble/ed25519 which works on Workers, Bun, and Node.
 */

import * as ed from "@noble/ed25519";

// Required for @noble/ed25519 v2+ on non-Node environments
if (typeof globalThis.crypto === "undefined") {
  // Node.js polyfill
  const { webcrypto } = await import("node:crypto");
  // @ts-ignore
  globalThis.crypto = webcrypto;
}

/**
 * Generate an Ed25519 keypair.
 * Returns base64-encoded private and public keys.
 */
export async function generateKeypair(): Promise<{
  privateKey: string;
  publicKey: string;
}> {
  const privateKeyBytes = ed.utils.randomPrivateKey();
  const publicKeyBytes = await ed.getPublicKeyAsync(privateKeyBytes);

  return {
    privateKey: toBase64(privateKeyBytes),
    publicKey: toBase64(publicKeyBytes),
  };
}

/**
 * Sign a message with an Ed25519 private key.
 */
export async function sign(
  message: string,
  privateKeyBase64: string
): Promise<string> {
  const privateKey = fromBase64(privateKeyBase64);
  const messageBytes = new TextEncoder().encode(message);
  const signature = await ed.signAsync(messageBytes, privateKey);
  return toBase64(signature);
}

/**
 * Verify an Ed25519 signature.
 */
export async function verify(
  message: string,
  signatureBase64: string,
  publicKeyBase64: string
): Promise<boolean> {
  try {
    const publicKey = fromBase64(publicKeyBase64);
    const signature = fromBase64(signatureBase64);
    const messageBytes = new TextEncoder().encode(message);
    return await ed.verifyAsync(signature, messageBytes, publicKey);
  } catch {
    return false;
  }
}

/**
 * Create the canonical manifest string for signing.
 * This ensures consistent signing regardless of JSON key order.
 */
export function canonicalManifest(manifest: {
  version: string;
  pub_date: string;
  platforms: Record<string, { sha256: string }>;
}): string {
  const platformEntries = Object.entries(manifest.platforms)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([platform, info]) => `${platform}:${info.sha256}`)
    .join("|");
  return `${manifest.version}|${manifest.pub_date}|${platformEntries}`;
}

function toBase64(bytes: Uint8Array): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(bytes).toString("base64");
  }
  return btoa(String.fromCharCode(...bytes));
}

function fromBase64(str: string): Uint8Array {
  if (typeof Buffer !== "undefined") {
    return new Uint8Array(Buffer.from(str, "base64"));
  }
  return new Uint8Array(
    atob(str)
      .split("")
      .map((c) => c.charCodeAt(0))
  );
}
