import type { Release, AuditEntry, Stats, HealthCheck } from './types';

function getApiKey(): string {
  return localStorage.getItem('ls-api-key') || '';
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const key = getApiKey();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> || {})
  };

  if (key) {
    headers['Authorization'] = `Bearer ${key}`;
  }

  const res = await fetch(path, { ...options, headers });

  if (!res.ok) {
    const body = await res.text();
    let message: string;
    try {
      const json = JSON.parse(body);
      message = json.error || json.message || body;
    } catch {
      message = body;
    }
    throw new Error(`${res.status}: ${message}`);
  }

  return res.json();
}

export const api = {
  health(): Promise<HealthCheck> {
    return request('/health');
  },

  getReleases(): Promise<Release[]> {
    return request('/api/releases');
  },

  deleteRelease(version: string): Promise<{ message: string }> {
    return request(`/api/releases/${version}`, { method: 'DELETE' });
  },

  uploadRelease(formData: FormData): Promise<{ message: string; version: string }> {
    const key = getApiKey();
    return fetch('/api/releases', {
      method: 'POST',
      headers: key ? { 'Authorization': `Bearer ${key}` } : {},
      body: formData
    }).then(async (res) => {
      if (!res.ok) {
        const body = await res.text();
        throw new Error(`${res.status}: ${body}`);
      }
      return res.json();
    });
  },

  getAudit(limit = 50, offset = 0): Promise<{ entries: AuditEntry[]; total: number }> {
    return request(`/api/audit?limit=${limit}&offset=${offset}`);
  },

  getStats(): Promise<Stats> {
    return request('/api/stats');
  },

  rotateKey(): Promise<{ message: string; newKey: string; newKeyHash: string }> {
    return request('/api/keys/rotate', { method: 'POST' });
  },

  updatePublicKey(publicKey: string): Promise<{ message: string }> {
    return request('/api/settings/public-key', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ publicKey })
    });
  }
};
