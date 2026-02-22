<script lang="ts">
  import { getContext, onMount } from 'svelte';
  import ReleaseCard from '$lib/components/ReleaseCard.svelte';
  import { api } from '$lib/api';
  import type { Release } from '$lib/types';

  const app: any = getContext('app');

  let uploadExpanded = $state(false);
  let uploading = $state(false);
  let uploadError = $state('');
  let uploadSuccess = $state('');
  let dragOver = $state(false);

  let manifestJson = $state('');
  let artifactFile = $state<File | null>(null);

  onMount(() => { app.loadReleases(); });

  async function handleDeprecate(version: string) {
    if (!confirm(`Deprecate release v${version}? This will remove it from latest.json.`)) return;
    try {
      await api.deleteRelease(version);
      await app.loadReleases();
    } catch (e: any) {
      app.error = e.message;
    }
  }

  async function handleUpload() {
    if (!manifestJson.trim() || !artifactFile) {
      uploadError = 'Both manifest JSON and artifact file are required.';
      return;
    }

    uploading = true;
    uploadError = '';
    uploadSuccess = '';

    try {
      const formData = new FormData();
      formData.append('manifest', manifestJson);
      formData.append('artifact', artifactFile);

      const result = await api.uploadRelease(formData);
      uploadSuccess = `Uploaded v${result.version} successfully.`;
      manifestJson = '';
      artifactFile = null;
      await app.loadReleases();
    } catch (e: any) {
      uploadError = e.message;
    } finally {
      uploading = false;
    }
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    dragOver = false;
    const file = e.dataTransfer?.files[0];
    if (file) artifactFile = file;
  }

  function handleFileSelect(e: Event) {
    const input = e.target as HTMLInputElement;
    if (input.files?.[0]) artifactFile = input.files[0];
  }

  let activeReleases = $derived(app.releases.filter((r: Release) => !r.deprecated));
  let deprecatedReleases = $derived(app.releases.filter((r: Release) => r.deprecated));
</script>

<div class="page-header">
  <div style="display: flex; justify-content: space-between; align-items: center;">
    <div>
      <h1>Releases</h1>
      <p>{app.releases.length} total releases</p>
    </div>
    <button class="btn btn-primary" onclick={() => uploadExpanded = !uploadExpanded}>
      {uploadExpanded ? 'Cancel' : 'Upload Release'}
    </button>
  </div>
</div>

{#if uploadExpanded}
  <div class="card upload-form">
    <h3 style="margin-bottom: 16px; font-size: 15px;">Upload New Release</h3>

    <label class="form-label">Release Manifest (JSON)</label>
    <textarea
      bind:value={manifestJson}
      placeholder='{"version": "1.0.0", "notes": "Initial release", "platforms": {...}}'
      rows="6"
      style="width: 100%; font-family: monospace; font-size: 12px; margin-bottom: 12px;"
    ></textarea>

    <label class="form-label">Artifact File</label>
    <div
      class="dropzone"
      class:drag-over={dragOver}
      ondragover={(e) => { e.preventDefault(); dragOver = true; }}
      ondragleave={() => dragOver = false}
      ondrop={handleDrop}
    >
      {#if artifactFile}
        <p>{artifactFile.name} ({(artifactFile.size / 1024 / 1024).toFixed(1)} MB)</p>
        <button class="btn btn-sm btn-secondary" onclick={() => artifactFile = null}>Remove</button>
      {:else}
        <p>Drop a file here or <label class="file-label">browse<input type="file" onchange={handleFileSelect} hidden /></label></p>
        <p class="dropzone-hint">.tar.gz, .zip, .dmg, .AppImage, .deb, .rpm</p>
      {/if}
    </div>

    {#if uploadError}
      <div class="upload-error">{uploadError}</div>
    {/if}
    {#if uploadSuccess}
      <div class="upload-success">{uploadSuccess}</div>
    {/if}

    <button class="btn btn-primary" onclick={handleUpload} disabled={uploading} style="margin-top: 12px;">
      {uploading ? 'Uploading...' : 'Upload'}
    </button>
  </div>
{/if}

{#if app.loading}
  <div class="loading">Loading releases...</div>
{:else if app.releases.length === 0}
  <div class="card empty-state">
    <h3>No releases yet</h3>
    <p>Click "Upload Release" to publish your first release.</p>
  </div>
{:else}
  <section>
    <h2 class="section-title">Active ({activeReleases.length})</h2>
    {#each activeReleases as release}
      <ReleaseCard {release} onDeprecate={handleDeprecate} />
    {/each}
  </section>

  {#if deprecatedReleases.length > 0}
    <section style="margin-top: 24px;">
      <h2 class="section-title" style="color: var(--text-secondary);">Deprecated ({deprecatedReleases.length})</h2>
      {#each deprecatedReleases as release}
        <ReleaseCard {release} onDeprecate={handleDeprecate} />
      {/each}
    </section>
  {/if}
{/if}

<style>
  .upload-form { margin-bottom: 24px; }
  .form-label { display: block; font-size: 12px; font-weight: 600; color: var(--text-secondary); margin-bottom: 6px; }

  .dropzone {
    border: 2px dashed var(--border);
    border-radius: var(--radius-sm);
    padding: 24px;
    text-align: center;
    margin-bottom: 12px;
    transition: border-color 0.15s;
  }
  .dropzone.drag-over { border-color: var(--accent); background: rgba(28, 27, 25, 0.02); }
  .dropzone p { color: var(--text-secondary); font-size: 13px; }
  .dropzone-hint { font-size: 11px; color: var(--text-tertiary); margin-top: 4px; }
  .file-label { color: var(--accent); font-weight: 600; cursor: pointer; text-decoration: underline; }

  .upload-error { background: var(--error-bg); color: var(--error); padding: 8px 12px; border-radius: var(--radius-sm); font-size: 13px; margin-top: 8px; }
  .upload-success { background: var(--success-bg); color: #16A34A; padding: 8px 12px; border-radius: var(--radius-sm); font-size: 13px; margin-top: 8px; }

  .section-title { font-size: 14px; font-weight: 600; margin-bottom: 12px; }
</style>
