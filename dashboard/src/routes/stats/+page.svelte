<script lang="ts">
  import { onMount } from 'svelte';
  import StatCard from '$lib/components/StatCard.svelte';
  import BarChart from '$lib/components/BarChart.svelte';
  import { appState as app } from '$lib/stores.svelte';

  onMount(() => { app.loadStats(); });

  let topVersion = $derived(() => {
    if (!app.stats?.byVersion) return 'N/A';
    const entries = Object.entries(app.stats.byVersion) as [string, number][];
    if (entries.length === 0) return 'N/A';
    return entries.sort((a, b) => b[1] - a[1])[0][0];
  });

  let topPlatform = $derived(() => {
    if (!app.stats?.byPlatform) return 'N/A';
    const entries = Object.entries(app.stats.byPlatform) as [string, number][];
    if (entries.length === 0) return 'N/A';
    return entries.sort((a, b) => b[1] - a[1])[0][0];
  });
</script>

<div class="page-header">
  <h1>Statistics</h1>
  <p>Download analytics and distribution metrics</p>
</div>

<div class="stats-row">
  <StatCard label="Total Downloads" value={app.stats?.total || 0} />
  <StatCard label="Top Version" value={topVersion()} />
  <StatCard label="Top Platform" value={topPlatform()} />
</div>

<div class="charts-grid">
  <BarChart data={app.stats?.byVersion || {}} title="Downloads by Version" />
  <BarChart data={app.stats?.byPlatform || {}} title="Downloads by Platform" />
</div>

<div style="margin-top: 20px;">
  <BarChart data={app.stats?.byDay || {}} title="Downloads by Day (Recent)" maxBars={20} />
</div>

<style>
  .stats-row {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 16px;
    margin-bottom: 24px;
  }

  .charts-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
  }

  @media (max-width: 768px) {
    .stats-row { grid-template-columns: 1fr; }
    .charts-grid { grid-template-columns: 1fr; }
  }
</style>
