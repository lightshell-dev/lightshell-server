<script lang="ts">
  let { label = '', value = '', subtext = '', variant = 'default' }:
    { label: string; value: string | number; subtext?: string; variant?: string } = $props();
</script>

<div class="stat-card card">
  <div class="stat-label">{label}</div>
  <div class="stat-value" class:success={variant === 'success'} class:warning={variant === 'warning'}>
    {value}
  </div>
  {#if subtext}
    <div class="stat-subtext">{subtext}</div>
  {/if}
</div>

<style>
  .stat-card { text-align: center; }
  .stat-label { font-size: 12px; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; margin-bottom: 8px; }
  .stat-value { font-size: 28px; font-weight: 700; line-height: 1; }
  .stat-value.success { color: var(--success); }
  .stat-value.warning { color: var(--warning); }
  .stat-subtext { font-size: 12px; color: var(--text-tertiary); margin-top: 6px; }
</style>
