<script lang="ts">
  import { getContext, onMount } from 'svelte';
  import StatCard from '$lib/components/StatCard.svelte';
  import BarChart from '$lib/components/BarChart.svelte';
  import ReleaseCard from '$lib/components/ReleaseCard.svelte';
  import type { Release } from '$lib/types';

  const app: any = getContext('app');

  onMount(() => {
    app.loadReleases();
    app.loadStats();
  });

  let latestVersion = $derived(
    app.releases.length > 0 ? app.releases[0].version : 'None'
  );

  let activeReleases = $derived(
    app.releases.filter((r: Release) => !r.deprecated && !r.draft)
  );

  let platformCount = $derived(() => {
    const platforms = new Set<string>();
    for (const r of app.releases) {
      for (const p of Object.keys(r.platforms)) {
        platforms.add(p);
      }
    }
    return platforms.size;
  });

  let recentReleases = $derived(app.releases.slice(0, 5));
  let dailyDownloads = $derived(app.stats?.byDay || {});
</script>

<div class="page-header">
  <h1>Overview</h1>
  <p>Release server status and recent activity</p>
</div>

<div class="stats-grid">
  <StatCard
    label="Total Releases"
    value={app.releases.length}
  />
  <StatCard
    label="Total Downloads"
    value={app.stats?.total || 0}
    variant="success"
  />
  <StatCard
    label="Latest Version"
    value={latestVersion}
  />
  <StatCard
    label="Platforms"
    value={platformCount()}
  />
</div>

<div class="overview-grid">
  <div>
    <h2 class="section-title">Recent Releases</h2>
    {#if app.loading}
      <div class="loading">Loading...</div>
    {:else if recentReleases.length === 0}
      <div class="card empty-state">
        <h3>No releases yet</h3>
        <p>Upload your first release from the Releases page.</p>
      </div>
    {:else}
      {#each recentReleases as release}
        <ReleaseCard {release} onDeprecate={() => {}} />
      {/each}
    {/if}
  </div>

  <div>
    <BarChart data={dailyDownloads} title="Downloads (by day)" maxBars={10} />
  </div>
</div>

<style>
  .stats-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 16px;
    margin-bottom: 28px;
  }

  .overview-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 24px;
  }

  .section-title {
    font-size: 15px;
    font-weight: 600;
    margin-bottom: 16px;
  }

  @media (max-width: 1024px) {
    .stats-grid { grid-template-columns: repeat(2, 1fr); }
    .overview-grid { grid-template-columns: 1fr; }
  }

  @media (max-width: 640px) {
    .stats-grid { grid-template-columns: 1fr; }
  }
</style>
