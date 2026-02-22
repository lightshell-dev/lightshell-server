<script lang="ts">
  import type { Release } from '../types';
  let { release, onDeprecate = () => {} }: { release: Release; onDeprecate: (version: string) => void } = $props();

  let platforms = $derived(Object.keys(release.platforms));
  let formattedDate = $derived(new Date(release.pub_date).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric'
  }));
</script>

<div class="release-card card">
  <div class="release-header">
    <div class="release-info">
      <span class="release-version">v{release.version}</span>
      {#if release.deprecated}
        <span class="badge badge-deprecated">Deprecated</span>
      {:else if release.draft}
        <span class="badge" style="background: var(--warning-bg); color: #B45309;">Draft</span>
      {:else}
        <span class="badge badge-active">Active</span>
      {/if}
    </div>
    <span class="release-date">{formattedDate}</span>
  </div>

  {#if release.notes}
    <p class="release-notes">{release.notes}</p>
  {/if}

  <div class="release-footer">
    <div class="platforms">
      {#each platforms as platform}
        <span class="badge badge-platform">{platform}</span>
      {/each}
    </div>
    {#if !release.deprecated}
      <button class="btn btn-sm btn-secondary" onclick={() => onDeprecate(release.version)}>
        Deprecate
      </button>
    {/if}
  </div>
</div>

<style>
  .release-card { margin-bottom: 12px; }
  .release-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
  .release-info { display: flex; align-items: center; gap: 8px; }
  .release-version { font-size: 16px; font-weight: 700; }
  .release-date { font-size: 12px; color: var(--text-tertiary); }
  .release-notes { font-size: 13px; color: var(--text-secondary); margin-bottom: 12px; line-height: 1.5; }
  .release-footer { display: flex; justify-content: space-between; align-items: center; }
  .platforms { display: flex; gap: 4px; flex-wrap: wrap; }
</style>
