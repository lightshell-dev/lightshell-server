<script lang="ts">
  let { data = {}, title = '', maxBars = 12 }:
    { data: Record<string, number>; title: string; maxBars?: number } = $props();

  let entries = $derived(
    Object.entries(data)
      .sort((a, b) => b[1] - a[1])
      .slice(0, maxBars)
  );

  let maxValue = $derived(Math.max(...entries.map(e => e[1]), 1));
</script>

<div class="chart card">
  <h3 class="chart-title">{title}</h3>
  {#if entries.length === 0}
    <div class="empty-state">No data yet</div>
  {:else}
    <div class="bars">
      {#each entries as [label, count]}
        <div class="bar-row">
          <span class="bar-label" title={label}>{label}</span>
          <div class="bar-track">
            <div class="bar-fill" style="width: {(count / maxValue) * 100}%"></div>
          </div>
          <span class="bar-value">{count}</span>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .chart-title { font-size: 14px; font-weight: 600; margin-bottom: 16px; }
  .bars { display: flex; flex-direction: column; gap: 8px; }
  .bar-row { display: flex; align-items: center; gap: 10px; }
  .bar-label { width: 100px; font-size: 12px; color: var(--text-secondary); text-overflow: ellipsis; overflow: hidden; white-space: nowrap; flex-shrink: 0; text-align: right; }
  .bar-track { flex: 1; height: 20px; background: var(--bg); border-radius: 4px; overflow: hidden; }
  .bar-fill { height: 100%; background: var(--accent); border-radius: 4px; transition: width 0.3s ease; min-width: 2px; }
  .bar-value { width: 40px; font-size: 12px; font-weight: 600; text-align: right; flex-shrink: 0; }
  .empty-state { padding: 24px; text-align: center; color: var(--text-tertiary); font-size: 13px; }
</style>
