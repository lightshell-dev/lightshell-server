export interface Release {
  version: string;
  notes: string;
  pub_date: string;
  signature?: string;
  draft?: boolean;
  deprecated?: boolean;
  platforms: Record<string, PlatformRelease>;
}

export interface PlatformRelease {
  url: string;
  sha256: string;
}

export interface AuditEntry {
  timestamp: string;
  action: string;
  method: string;
  path: string;
  ip_hash: string;
  api_key_fingerprint: string;
  details?: string;
}

export interface Stats {
  total: number;
  byVersion: Record<string, number>;
  byPlatform: Record<string, number>;
  byDay: Record<string, number>;
}

export interface HealthCheck {
  status: string;
  version: string;
  timestamp: string;
}
