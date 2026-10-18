<script lang="ts">
  import { onMount } from 'svelte'
  import { prefs } from './lib/prefs.svelte'
  import { pwa, requestPersistence } from './lib/pwa.svelte'
  import { store } from './lib/store.svelte'
  import { sync } from './lib/sync.svelte'
  import BackupSection from './views/BackupSection.svelte'
  import SyncStatus from './views/SyncStatus.svelte'
  import Charges from './views/Charges.svelte'
  import Mensurations from './views/Mensurations.svelte'
  import { i18n, t, type Locale } from './lib/i18n.svelte'

  type Tab = 'charges' | 'mensurations'
  const fromHash = (): Tab => (location.hash === '#mensurations' ? 'mensurations' : 'charges')

  let tab = $state<Tab>(fromHash())

  function go(to: Tab) {
    tab = to
    history.replaceState(null, '', '#' + to)
  }

  // La langue du document suit le choix de l'utilisateur (lecteurs d'écran, correction orthographique).
  $effect(() => {
    document.documentElement.lang = i18n.locale
  })
  const locales: Locale[] = ['fr', 'en']

  onMount(() => {
    void store.load().then(() => sync.start())
    void pwa.register()
    void requestPersistence()
    const onHash = () => (tab = fromHash())
    addEventListener('hashchange', onHash)
    return () => removeEventListener('hashchange', onHash)
  })
</script>

<div class="app">
  <header class="top">
    <div class="brand">
      <span class="mark">IRONLOG</span>
      <SyncStatus />
    </div>
    <div class="nav">
      <div class="seg" role="tablist" aria-label={t('app.sections')}>
        <button role="tab" id="tab-charges" aria-selected={tab === 'charges'} aria-controls="v-charges" onclick={() => go('charges')}>{t('tab.charges')}</button>
        <button role="tab" id="tab-mensurations" aria-selected={tab === 'mensurations'} aria-controls="v-mensurations" onclick={() => go('mensurations')}>{t('tab.measurements')}</button>
      </div>
      <div class="seg small" role="group" aria-label={t('app.language')}>
        {#each locales as l (l)}
          <button aria-pressed={i18n.locale === l} lang={l} onclick={() => i18n.set(l)}>{l.toUpperCase()}</button>
        {/each}
      </div>
    </div>
  </header>

  {#if pwa.updateReady}
    <div class="update" role="status">
      <span>{t('app.updateReady')}</span>
      <button class="btn" onclick={() => pwa.applyUpdate()}>{t('app.reload')}</button>
    </div>
  {/if}

  {#if store.status === 'memory'}
    <p class="warn" role="status">
      {t('app.storageUnavailable')}
    </p>
  {/if}

  {#if store.status !== 'loading'}
    {#if store.isEmpty && !prefs.samplesHidden}
      <div class="onboard">
        <p>{t('app.onboard')}</p>
        <div class="btns">
          <button class="btn ghost" onclick={() => store.loadSamples()}>{t('app.loadSamples')}</button>
          <button class="btn ghost" onclick={() => (prefs.samplesHidden = true)}>{t('app.hide')}</button>
        </div>
      </div>
    {/if}
    <div id="v-charges" role="tabpanel" aria-labelledby="tab-charges" hidden={tab !== 'charges'}>
      <Charges />
    </div>
    <div id="v-mensurations" role="tabpanel" aria-labelledby="tab-mensurations" hidden={tab !== 'mensurations'}>
      <Mensurations />
    </div>
    <BackupSection />
  {/if}

  <footer class="foot">{t('app.footer', { version: __APP_VERSION__ })}</footer>
</div>

<style>
  .app {
    max-width: 1180px;
    margin: 0 auto;
    padding-left: max(16px, env(safe-area-inset-left, 0px));
    padding-right: max(16px, env(safe-area-inset-right, 0px));
    padding-top: calc(16px + env(safe-area-inset-top, 0px));
    padding-bottom: calc(48px + env(safe-area-inset-bottom, 0px));
    display: flex;
    flex-direction: column;
    gap: 18px;
  }
  .top { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
  .nav { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
  .seg.small button { padding: 5px 9px; font-size: 12px; }
  .brand { display: flex; align-items: baseline; gap: 6px 14px; flex-wrap: wrap; }
  .mark { font-family: var(--f-display); font-weight: 800; font-size: 32px; letter-spacing: 0.05em; line-height: 1; }
  .update {
    display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap;
    padding: 10px 14px; border: 1px solid var(--accent); border-radius: 10px; font-size: 14px;
  }
  .foot { font-family: var(--f-mono); font-size: 11px; color: var(--muted); text-align: center; padding-top: 8px; }
  .warn { margin: 0; padding: 10px 14px; border: 1px solid var(--danger); color: var(--danger); border-radius: 10px; font-size: 14px; }
  .onboard {
    display: flex; gap: 12px 16px; align-items: center; justify-content: space-between; flex-wrap: wrap;
    padding: 12px 16px; border: 1px dashed var(--line); border-radius: 12px; color: var(--muted); font-size: 14px;
  }
  .onboard p { margin: 0; max-width: 65ch; }
</style>
