/**
 * Upload validation middleware.
 * Strict validation for release file uploads.
 */

import { Context, Next } from "hono";
import { StorageBackend } from "../storage/interface.js";
import { getJSON } from "../storage/interface.js";
import { Release } from "../types.js";

const ALLOWED_FILENAME = /^[\w-]+-(?:darwin|linux)-(?:arm64|x64)\.tar\.gz$/;
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const MAX_FILES_PER_RELEASE = 6; // 3 platforms × 2 arches
const GZIP_MAGIC = [0x1f, 0x8b];
const SEMVER_REGEX =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export function validateFilename(filename: string): ValidationResult {
  if (!ALLOWED_FILENAME.test(filename)) {
    return {
      valid: false,
      error: `Invalid filename pattern: "${filename}". Expected: {name}-{darwin|linux}-{arm64|x64}.tar.gz`,
    };
  }
  return { valid: true };
}

export function validateFileSize(size: number): ValidationResult {
  if (size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File too large: ${(size / 1024 / 1024).toFixed(1)}MB. Maximum: 50MB`,
    };
  }
  return { valid: true };
}

export function validateGzip(header: Uint8Array): ValidationResult {
  if (header.length < 2 || header[0] !== GZIP_MAGIC[0] || header[1] !== GZIP_MAGIC[1]) {
    return {
      valid: false,
      error: "Not a valid gzip file (magic bytes mismatch)",
    };
  }
  return { valid: true };
}

export function validateSemver(version: string): ValidationResult {
  if (!SEMVER_REGEX.test(version)) {
    return {
      valid: false,
      error: `Invalid semver version: "${version}"`,
    };
  }
  return { valid: true };
}

export function compareSemver(a: string, b: string): number {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    if (pa[i] > pb[i]) return 1;
    if (pa[i] < pb[i]) return -1;
  }
  return 0;
}

export async function validateVersion(
  version: string,
  storage: StorageBackend
): Promise<ValidationResult> {
  const semverResult = validateSemver(version);
  if (!semverResult.valid) return semverResult;

  // Check if version already exists (immutability)
  const exists = await storage.exists(`releases/${version}/manifest.json`);
  if (exists) {
    return {
      valid: false,
      error: `Version ${version} already exists. Releases are immutable.`,
    };
  }

  // Check that version is newer than latest
  const releases = await getJSON<Record<string, Release>>(
    storage,
    "meta/releases.json"
  );
  if (releases) {
    const activeVersions = Object.keys(releases).filter(
      (v) => releases[v].status === "active"
    );
    for (const existing of activeVersions) {
      if (compareSemver(version, existing) <= 0) {
        return {
          valid: false,
          error: `Version ${version} must be newer than existing version ${existing}`,
        };
      }
    }
  }

  return { valid: true };
}

export function validateFileCount(count: number): ValidationResult {
  if (count > MAX_FILES_PER_RELEASE) {
    return {
      valid: false,
      error: `Too many files: ${count}. Maximum: ${MAX_FILES_PER_RELEASE}`,
    };
  }
  return { valid: true };
}
