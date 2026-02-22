export interface Release {
  version: string;
  notes: string;
  pub_date: string;
  platforms: Record<string, PlatformRelease>;
  signature: string;
  status: "active" | "deprecated";
  created_at: string;
  download_count: number;
}

export interface PlatformRelease {
  url: string;
  sha256: string;
  size: number;
}

export interface LatestManifest {
  version: string;
  notes: string;
  pub_date: string;
  platforms: Record<string, { url: string; sha256: string }>;
  signature: string;
}

export interface AuditEntry {
  timestamp: string;
  action: "release.create" | "release.deprecate" | "key.rotate" | "settings.update";
  ip: string;
  apiKeyFingerprint: string;
  version?: string;
  result: "success" | "rejected";
  reason?: string;
}

export interface DownloadStat {
  version: string;
  platform: string;
  timestamp: string;
}

export interface ServerMeta {
  publicKey: string;
  apiKeyHash: string;
  createdAt: string;
}

export interface Env {
  RELEASES_BUCKET?: R2Bucket;
  STORAGE_BACKEND?: string;
  API_KEY?: string;
  ED25519_PUBLIC_KEY?: string;
  DATA_DIR?: string;
  AWS_ACCESS_KEY_ID?: string;
  AWS_SECRET_ACCESS_KEY?: string;
  AWS_REGION?: string;
  S3_BUCKET?: string;
  S3_ENDPOINT?: string;
  BASE_URL?: string;
}
