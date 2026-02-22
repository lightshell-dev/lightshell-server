<script lang="ts">
  import { getContext, onMount } from 'svelte';
  import AuditEntryComp from '$lib/components/AuditEntry.svelte';

  const app: any = getContext('app');

  let currentPage = $state(0);
  let pageSize = 50;

  onMount(() => { app.loadAudit(pageSize, 0); });

  function loadPage(page: number) {
    currentPage = page;
    app.loadAudit(pageSize, page * pageSize);
  }

  let totalPages = $derived(Math.ceil(app.auditTotal / pageSize));
</script>

<div class="page-header">
  <h1>Audit Log</h1>
  <p>{app.auditTotal} total entries</p>
</div>

<div class="card">
  {#if app.auditEntries.length === 0}
    <div class="empty-state">
      <h3>No audit entries</h3>
      <p>Write operations (uploads, deletions, key rotations) will appear here.</p>
    </div>
  {:else}
    <div class="audit-header">
      <span class="col-time">Time</span>
      <span class="col-method">Method</span>
      <span class="col-path">Path</span>
      <span class="col-action">Action</span>
      <span class="col-ip">IP Hash</span>
    </div>
    {#each app.auditEntries as entry}
      <AuditEntryComp {entry} />
    {/each}

    {#if totalPages > 1}
      <div class="pagination">
        <button
          class="btn btn-sm btn-secondary"
          disabled={currentPage === 0}
          onclick={() => loadPage(currentPage - 1)}
        >Previous</button>
        <span class="page-info">Page {currentPage + 1} of {totalPages}</span>
        <button
          class="btn btn-sm btn-secondary"
          disabled={currentPage >= totalPages - 1}
          onclick={() => loadPage(currentPage + 1)}
        >Next</button>
      </div>
    {/if}
  {/if}
</div>

<style>
  .audit-header {
    display: flex;
    gap: 12px;
    padding: 8px 0;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--text-secondary);
    border-bottom: 1px solid var(--border);
  }
  .col-time { width: 70px; }
  .col-method { width: 55px; }
  .col-path { flex: 1; }
  .col-action { max-width: 200px; }
  .col-ip { width: 80px; text-align: right; }

  .pagination {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    padding-top: 16px;
    margin-top: 8px;
    border-top: 1px solid var(--border);
  }
  .page-info { font-size: 13px; color: var(--text-secondary); }
</style>
