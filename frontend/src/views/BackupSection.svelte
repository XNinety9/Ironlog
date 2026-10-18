<script lang="ts">
  import { backupFileName, isBackupError, makeBackup, parseBackup, type Backup } from '../lib/backup'
  import { fdate } from '../lib/format'
  import { t } from '../lib/i18n.svelte'
  import { store } from '../lib/store.svelte'
  import { sync } from '../lib/sync.svelte'

  const KEY = 'ironlog.lastExport'

  function readLast(): string | null {
    try {
      return localStorage.getItem(KEY)
    } catch {
      return null
    }
  }

  let lastExport = $state(readLast())
  let pending = $state.raw<Backup | null>(null)
  let message = $state<{ kind: 'ok' | 'err'; text: string } | null>(null)
  let fileInput = $state<HTMLInputElement>()

  const plural = (n: number, one: string, many: string) => `${n} ${n > 1 ? many : one}`
  // Le serveur de synchronisation existe sur ce déploiement (même s'il est momentanément injoignable).
  const synced = $derived(sync.state !== 'unavailable' && sync.state !== 'starting')

  const summary = (ex: number, ms: number) =>
    `${plural(ex, t('count.exerciseOne'), t('count.exerciseMany'))} ${t('common.and')} ${plural(ms, t('count.measureOne'), t('count.measureMany'))}`

  function exportData() {
    const data = makeBackup($state.snapshot(store.exercises), $state.snapshot(store.measures))
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }))
    const a = document.createElement('a')
    a.href = url
    a.download = backupFileName()
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    lastExport = new Date().toISOString().slice(0, 10)
    try {
      localStorage.setItem(KEY, lastExport)
    } catch {
      // Sans stockage, on ne retient simplement pas la date.
    }
    message = { kind: 'ok', text: t('backup.downloaded', { file: backupFileName() }) }
  }

  async function pick(e: Event) {
    const file = (e.currentTarget as HTMLInputElement).files?.[0]
    if (fileInput) fileInput.value = ''
    if (!file) return
    message = null
    try {
      pending = parseBackup(await file.text())
    } catch (err) {
      pending = null
      message = { kind: 'err', text: isBackupError(err) ? err.message : t('backup.readFail') }
    }
  }

  async function confirmImport() {
    if (!pending) return
    try {
      await store.replaceAll(pending)
      message = { kind: 'ok', text: t('backup.importDone', { summary: summary(pending.exercises.length, pending.measures.length) }) }
    } catch (err) {
      message = { kind: 'err', text: (err as Error).message }
    }
    pending = null
  }
</script>

<section class="backup" aria-labelledby="backup-title">
  <div class="head">
    <h2 id="backup-title">{t('backup.title')}</h2>
    <p class="sub">
      {synced ? t('backup.synced') : t('backup.local')}
      {lastExport ? t('backup.lastExport', { date: fdate(lastExport) }) : t('backup.noExport')}
    </p>
  </div>

  {#if pending}
    <div class="confirm" role="alertdialog" aria-labelledby="import-q">
      <p id="import-q">
        {t('backup.replaceQ', {
          current: summary(store.exercises.length, store.measures.length),
          file: summary(pending.exercises.length, pending.measures.length),
          exported: pending.exportedAt ? t('backup.exportedOn', { date: fdate(pending.exportedAt.slice(0, 10)) }) : '',
        })}
        {#if synced}{t('backup.replaceSynced')}{/if}
      </p>
      <div class="btns">
        <button class="btn danger" onclick={confirmImport}>{t('backup.replaceBtn')}</button>
        <button class="btn ghost" onclick={() => (pending = null)}>{t('action.cancel')}</button>
      </div>
    </div>
  {:else}
    <div class="btns">
      <button class="btn ghost" onclick={exportData} disabled={store.isEmpty}>{t('backup.export')}</button>
      <button class="btn ghost" onclick={() => fileInput?.click()}>{t('backup.import')}</button>
      <input bind:this={fileInput} id="import-file" type="file" accept="application/json,.json" hidden onchange={pick} />
    </div>
  {/if}

  {#if message}
    <p class={message.kind === 'err' ? 'err' : 'ok'} role="status">{message.text}</p>
  {/if}
</section>

<style>
  .backup { border-top: 1px solid var(--line); padding-top: 18px; display: grid; gap: 12px; }
  .head { display: grid; gap: 4px; }
  h2 { margin: 0; font-family: var(--f-display); font-weight: 700; font-size: 22px; letter-spacing: 0.04em; text-transform: uppercase; }
  .confirm { display: grid; gap: 10px; padding: 12px 14px; border: 1px solid var(--danger); border-radius: 10px; max-width: 65ch; }
  .confirm p { margin: 0; }
  .ok { margin: 0; color: var(--good); font-size: 13px; }
  button:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
