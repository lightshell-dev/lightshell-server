<script lang="ts">
  import '../app.css';
  import Sidebar from '$lib/components/Sidebar.svelte';
  import { createAppState } from '$lib/stores';
  import { page } from '$app/stores';
  import { setContext } from 'svelte';

  let { children } = $props();
  const app = createAppState();
  setContext('app', app);

  let apiKey = $state('');
  let loginError = $state('');
  let loginLoading = $state(false);

  async function handleLogin() {
    if (!apiKey.trim()) return;
    loginLoading = true;
    loginError = '';
    const ok = await app.login(apiKey.trim());
    if (!ok) {
      loginError = 'Invalid API key. Check your key and try again.';
    }
    loginLoading = false;
  }

  function handleLogout() {
    app.logout();
    apiKey = '';
  }

  let currentPath = $derived($page.url.pathname);
</script>

{#if !app.authenticated}
  <div class="login-page">
    <div class="login-card card">
      <div class="login-header">
        <h1>LightShell</h1>
        <p>Release Server Dashboard</p>
      </div>

      <form onsubmit={(e) => { e.preventDefault(); handleLogin(); }}>
        <label class="login-label" for="api-key">API Key</label>
        <input
          id="api-key"
          type="password"
          placeholder="Enter your API key"
          bind:value={apiKey}
          autocomplete="off"
          style="width: 100%; margin-bottom: 12px;"
        />

        {#if loginError}
          <div class="login-error">{loginError}</div>
        {/if}

        <button type="submit" class="btn btn-primary" style="width: 100%; justify-content: center;" disabled={loginLoading}>
          {loginLoading ? 'Connecting...' : 'Connect'}
        </button>
      </form>

      <p class="login-hint">
        Your API key is set via the <code>API_KEY</code> environment variable on the server.
      </p>
    </div>
  </div>
{:else}
  <Sidebar {currentPath} onLogout={handleLogout} />
  <main class="main-content">
    {#if app.error}
      <div class="error-banner">
        <span>{app.error}</span>
        <button onclick={() => app.error = null}>Dismiss</button>
      </div>
    {/if}
    {@render children()}
  </main>
{/if}

<style>
  .login-page {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    padding: 24px;
  }

  .login-card {
    width: 100%;
    max-width: 380px;
    padding: 32px;
  }

  .login-header {
    text-align: center;
    margin-bottom: 24px;
  }

  .login-header h1 {
    font-size: 22px;
    font-weight: 700;
    margin-bottom: 4px;
  }

  .login-header p {
    color: var(--text-secondary);
    font-size: 13px;
  }

  .login-label {
    display: block;
    font-size: 12px;
    font-weight: 600;
    color: var(--text-secondary);
    margin-bottom: 6px;
  }

  .login-error {
    background: var(--error-bg);
    color: var(--error);
    padding: 8px 12px;
    border-radius: var(--radius-sm);
    font-size: 13px;
    margin-bottom: 12px;
  }

  .login-hint {
    text-align: center;
    font-size: 12px;
    color: var(--text-tertiary);
    margin-top: 16px;
  }

  .login-hint code {
    background: var(--bg);
    padding: 2px 5px;
    border-radius: 4px;
    font-size: 11px;
  }

  .main-content {
    margin-left: var(--sidebar-width);
    padding: 28px 32px;
    min-height: 100vh;
    transition: margin-left 0.2s ease;
  }

  .error-banner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: var(--error-bg);
    color: var(--error);
    padding: 10px 16px;
    border-radius: var(--radius-sm);
    margin-bottom: 20px;
    font-size: 13px;
  }

  .error-banner button {
    color: var(--error);
    font-size: 12px;
    font-weight: 600;
    text-decoration: underline;
  }

  @media (max-width: 768px) {
    .main-content { margin-left: 0; padding: 20px 16px; }
  }
</style>
