<script lang="ts">
  import { getContext } from 'svelte';
  import { api } from '$lib/api';

  const app: any = getContext('app');

  // Public key section
  let publicKey = $state('');
  let pubKeyLoading = $state(false);
  let pubKeyMsg = $state('');

  // API key rotation
  let rotateLoading = $state(false);
  let newKey = $state('');
  let showRotateConfirm = $state(false);

  async function updatePublicKey() {
    if (!publicKey.trim()) return;
    pubKeyLoading = true;
    pubKeyMsg = '';
    try {
      await api.updatePublicKey(publicKey.trim());
      pubKeyMsg = 'Public key updated successfully.';
    } catch (e: any) {
      pubKeyMsg = `Error: ${e.message}`;
    } finally {
      pubKeyLoading = false;
    }
  }

  async function rotateApiKey() {
    rotateLoading = true;
    newKey = '';
    try {
      const result = await api.rotateKey();
      newKey = result.newKey;
      showRotateConfirm = false;
    } catch (e: any) {
      app.error = e.message;
    } finally {
      rotateLoading = false;
    }
  }

  function copyKey() {
    navigator.clipboard.writeText(newKey);
  }
</script>

<div class="page-header">
  <h1>Settings</h1>
  <p>Manage server configuration and security</p>
</div>

<section class="card settings-section">
  <h2 class="section-title">Ed25519 Public Key</h2>
  <p class="section-desc">The public key used to verify release signatures. Must match the private key used by <code>lightshell release</code>.</p>

  <textarea
    bind:value={publicKey}
    placeholder="Paste your Ed25519 public key (base64)"
    rows="3"
    style="width: 100%; font-family: monospace; font-size: 12px; margin: 12px 0;"
  ></textarea>

  {#if pubKeyMsg}
    <div class="msg" class:error={pubKeyMsg.startsWith('Error')} class:success={!pubKeyMsg.startsWith('Error')}>
      {pubKeyMsg}
    </div>
  {/if}

  <button class="btn btn-primary" onclick={updatePublicKey} disabled={pubKeyLoading}>
    {pubKeyLoading ? 'Saving...' : 'Update Public Key'}
  </button>
</section>

<section class="card settings-section" style="margin-top: 16px;">
  <h2 class="section-title">API Key</h2>
  <p class="section-desc">Rotate the API key used to authenticate with this dashboard and the upload API. The old key will stop working immediately.</p>

  {#if newKey}
    <div class="new-key-box">
      <div class="new-key-header">
        <strong>New API Key</strong>
        <span class="new-key-warning">Save this key now. It will not be shown again.</span>
      </div>
      <div class="new-key-value">
        <code>{newKey}</code>
        <button class="btn btn-sm btn-secondary" onclick={copyKey}>Copy</button>
      </div>
      <p class="new-key-hint">Update your <code>API_KEY</code> environment variable with this new key, then re-login.</p>
    </div>
  {:else if showRotateConfirm}
    <div class="confirm-box">
      <p><strong>Are you sure?</strong> This will invalidate the current API key immediately. You will need to update the <code>API_KEY</code> env var on your server.</p>
      <div style="display: flex; gap: 8px; margin-top: 12px;">
        <button class="btn btn-danger" onclick={rotateApiKey} disabled={rotateLoading}>
          {rotateLoading ? 'Rotating...' : 'Yes, Rotate Key'}
        </button>
        <button class="btn btn-secondary" onclick={() => showRotateConfirm = false}>Cancel</button>
      </div>
    </div>
  {:else}
    <button class="btn btn-secondary" onclick={() => showRotateConfirm = true}>
      Rotate API Key
    </button>
  {/if}
</section>

<section class="card settings-section" style="margin-top: 16px;">
  <h2 class="section-title">Server Info</h2>
  <div class="info-grid">
    <div class="info-row">
      <span class="info-label">Dashboard</span>
      <span class="info-value">LightShell Release Server v1.0.0</span>
    </div>
    <div class="info-row">
      <span class="info-label">Docs</span>
      <a href="https://lightshell.dev/docs/guides/auto-updates/release-server" target="_blank">Release Server Guide</a>
    </div>
  </div>
</section>

<style>
  .settings-section { margin-bottom: 0; }
  .section-title { font-size: 15px; font-weight: 600; margin-bottom: 4px; }
  .section-desc { font-size: 13px; color: var(--text-secondary); line-height: 1.5; }
  .section-desc code { background: var(--bg); padding: 1px 5px; border-radius: 4px; font-size: 12px; }

  .msg {
    padding: 8px 12px;
    border-radius: var(--radius-sm);
    font-size: 13px;
    margin-bottom: 12px;
  }
  .msg.success { background: var(--success-bg); color: #16A34A; }
  .msg.error { background: var(--error-bg); color: var(--error); }

  .new-key-box {
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    padding: 16px;
    margin: 12px 0;
  }
  .new-key-header { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
  .new-key-warning { font-size: 12px; color: var(--warning); font-weight: 500; }
  .new-key-value { display: flex; align-items: center; gap: 8px; background: var(--card); border: 1px solid var(--border); border-radius: 6px; padding: 8px 12px; margin-bottom: 8px; }
  .new-key-value code { flex: 1; font-size: 12px; word-break: break-all; }
  .new-key-hint { font-size: 12px; color: var(--text-secondary); }
  .new-key-hint code { background: var(--card); padding: 1px 4px; border-radius: 3px; }

  .confirm-box {
    background: var(--error-bg);
    border: 1px solid #FECACA;
    border-radius: var(--radius-sm);
    padding: 16px;
    margin-top: 12px;
    font-size: 13px;
  }

  .info-grid { margin-top: 12px; }
  .info-row { display: flex; padding: 8px 0; border-bottom: 1px solid var(--border); font-size: 13px; }
  .info-row:last-child { border-bottom: none; }
  .info-label { width: 120px; color: var(--text-secondary); font-weight: 500; }
  .info-value { color: var(--text); }
</style>
