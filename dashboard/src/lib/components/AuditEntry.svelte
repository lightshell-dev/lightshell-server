<script lang="ts">
  import type { AuditEntry } from '../types';
  let { entry }: { entry: AuditEntry } = $props();

  let timeAgo = $derived(() => {
    const diff = Date.now() - new Date(entry.timestamp).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  });

  let methodColor = $derived(
    entry.method === 'POST' ? 'var(--success)' :
    entry.method === 'DELETE' ? 'var(--error)' :
    entry.method === 'PUT' ? 'var(--warning)' :
    'var(--text-secondary)'
  );
</script>

<div class="audit-row">
  <div class="audit-time">{timeAgo()}</div>
  <span class="audit-method" style="color: {methodColor}">{entry.method}</span>
  <span class="audit-path">{entry.path}</span>
  <span class="audit-action">{entry.action}</span>
  <span class="audit-ip" title={entry.ip_hash}>{entry.ip_hash.slice(0, 8)}...</span>
</div>

<style>
  .audit-row {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 0;
    border-bottom: 1px solid var(--border);
    font-size: 13px;
  }
  .audit-row:last-child { border-bottom: none; }
  .audit-time { width: 70px; color: var(--text-tertiary); font-size: 12px; flex-shrink: 0; }
  .audit-method { width: 55px; font-weight: 600; font-size: 11px; font-family: monospace; flex-shrink: 0; }
  .audit-path { flex: 1; font-family: monospace; font-size: 12px; color: var(--text-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .audit-action { color: var(--text-secondary); font-size: 12px; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .audit-ip { width: 80px; font-family: monospace; font-size: 11px; color: var(--text-tertiary); flex-shrink: 0; text-align: right; }
</style>
