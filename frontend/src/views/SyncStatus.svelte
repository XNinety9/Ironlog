<script lang="ts">
  import { t } from '../lib/i18n.svelte'
  import { store } from '../lib/store.svelte'
  import { sync } from '../lib/sync.svelte'

  // Rafraîchit le « il y a 2 min » sans attendre la prochaine synchro.
  let now = $state(Date.now())
  $effect(() => {
    const timer = setInterval(() => (now = Date.now()), 30_000)
    return () => clearInterval(timer)
  })

  function ago(when: number): string {
    const s = Math.max(0, Math.round((now - when) / 1000))
    if (s < 60) return t('sync.justNow')
    const m = Math.round(s / 60)
    if (m < 60) return t('sync.minAgo', { n: m })
    const h = Math.round(m / 60)
    if (h < 24) return t('sync.hAgo', { n: h })
    return t('sync.dAgo', { n: Math.round(h / 24) })
  }

  const n = $derived(store.pendingCount)
  const waiting = $derived(n === 1 ? t('sync.waitingOne') : t('sync.waitingMany', { n }))

  const view = $derived.by((): { tone: 'ok' | 'busy' | 'warn' | 'bad'; text: string } | null => {
    switch (sync.state) {
      case 'starting':
      case 'unavailable':
        return null
      case 'syncing':
        return { tone: 'busy', text: t('sync.syncing') }
      case 'offline':
        return { tone: 'warn', text: n ? t('sync.offlinePending', { waiting }) : t('sync.offline') }
      case 'auth':
        return { tone: 'bad', text: n ? t('sync.sessionPending', { waiting }) : t('sync.sessionExpired') }
      case 'error':
        return { tone: 'bad', text: n ? t('sync.failedPending', { waiting }) : t('sync.failed') }
      case 'idle':
        if (n) return { tone: 'busy', text: waiting }
        return { tone: 'ok', text: sync.lastSync ? t('sync.syncedAgo', { ago: ago(sync.lastSync) }) : t('sync.synced') }
    }
  })
</script>

{#if view}
  <div class="sync {view.tone}" role="status" title={sync.state === 'error' ? sync.error : undefined}>
    <span class="dot" aria-hidden="true"></span>
    <span>{view.text}</span>
    {#if sync.state === 'auth'}
      <!-- Recharger repasse par le reverse proxy, qui redirige vers la page de connexion. -->
      <button class="linkish" onclick={() => location.reload()}>{t('sync.reconnect')}</button>
    {:else if sync.state === 'error'}
      <button class="linkish" onclick={() => sync.run()}>{t('sync.retry')}</button>
    {/if}
  </div>
{/if}

<style>
  .sync {
    display: inline-flex; align-items: center; gap: 6px; flex-wrap: wrap;
    font-family: var(--f-mono); font-size: 11px; color: var(--muted);
  }
  .sync .linkish { font-family: var(--f-body); font-size: 12px; }
  .dot { width: 7px; height: 7px; border-radius: 50%; background: var(--muted); flex: none; }
  .ok .dot { background: var(--good); }
  .busy .dot { background: var(--accent); animation: pulse 1.2s ease-in-out infinite; }
  .warn .dot { background: var(--warn); }
  .bad .dot { background: var(--danger); }
  .bad { color: var(--danger); }
  @keyframes pulse { 50% { opacity: 0.35; } }
  @media (prefers-reduced-motion: reduce) { .busy .dot { animation: none; } }
</style>
