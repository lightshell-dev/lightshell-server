import { api } from './api';
import type { Release, Stats, AuditEntry } from './types';

// Reactive state using module-level $state (Svelte 5 runes)
// These are imported and used directly in components.

export function createAppState() {
  let authenticated = $state(!!localStorage.getItem('ls-api-key'));
  let releases = $state<Release[]>([]);
  let stats = $state<Stats | null>(null);
  let auditEntries = $state<AuditEntry[]>([]);
  let auditTotal = $state(0);
  let loading = $state(false);
  let error = $state<string | null>(null);

  async function login(key: string): Promise<boolean> {
    localStorage.setItem('ls-api-key', key);
    try {
      await api.getReleases();
      authenticated = true;
      return true;
    } catch {
      localStorage.removeItem('ls-api-key');
      authenticated = false;
      return false;
    }
  }

  function logout() {
    localStorage.removeItem('ls-api-key');
    authenticated = false;
    releases = [];
    stats = null;
    auditEntries = [];
  }

  async function loadReleases() {
    loading = true;
    error = null;
    try {
      releases = await api.getReleases();
    } catch (e: any) {
      error = e.message;
    } finally {
      loading = false;
    }
  }

  async function loadStats() {
    try {
      stats = await api.getStats();
    } catch (e: any) {
      error = e.message;
    }
  }

  async function loadAudit(limit = 50, offset = 0) {
    try {
      const result = await api.getAudit(limit, offset);
      auditEntries = result.entries;
      auditTotal = result.total;
    } catch (e: any) {
      error = e.message;
    }
  }

  return {
    get authenticated() { return authenticated; },
    get releases() { return releases; },
    get stats() { return stats; },
    get auditEntries() { return auditEntries; },
    get auditTotal() { return auditTotal; },
    get loading() { return loading; },
    get error() { return error; },
    set error(v: string | null) { error = v; },
    login,
    logout,
    loadReleases,
    loadStats,
    loadAudit,
  };
}
