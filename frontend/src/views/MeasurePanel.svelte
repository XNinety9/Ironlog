<script lang="ts">
  import DateField from '../lib/DateField.svelte'
  import LineChart from '../lib/LineChart.svelte'
  import Sparkline from '../lib/Sparkline.svelte'
  import { fdate, fmt, parseNum, signed } from '../lib/format'
  import { t } from '../lib/i18n.svelte'
  import { today, type MeasureEntry } from '../lib/model'
  import { store } from '../lib/store.svelte'

  interface Props {
    selId: string | null
    draft: { x: number; y: number } | null
    onselect: (id: string | null) => void
    oncancel: () => void
  }

  let { selId, draft, onselect, oncancel }: Props = $props()

  const m = $derived(selId ? store.measure(selId) : undefined)
  const last = $derived(m?.log.at(-1))
  const first = $derived(m?.log[0])

  let newName = $state('')
  let newVal = $state('')
  let entry = $state('')
  let date = $state(today())
  let confirmDel = $state(false)
  let nameInput = $state<HTMLInputElement>()

  // Le nom saisi est conservé si on déplace le point avant de valider.
  $effect(() => {
    if (draft) nameInput?.focus({ preventScroll: true })
  })
  $effect(() => {
    void selId
    confirmDel = renaming = showAll = false
    entryId = null
    entry = ''
    date = today()
  })

  const HIST = 6
  let showAll = $state(false)
  const shown = $derived(m ? (showAll ? m.log : m.log.slice(-HIST)).toReversed() : [])

  // Correction d'une entrée de l'historique, une à la fois.
  let entryId = $state<string | null>(null)
  let xVal = $state('')
  let xDate = $state(today())

  function startEntry(l: MeasureEntry) {
    entryId = l.id
    xVal = String(l.value).replace('.', ',')
    xDate = l.date
  }

  function saveEntry(e: SubmitEvent) {
    e.preventDefault()
    const v = parseNum(xVal)
    if (!entryId || Number.isNaN(v) || !xDate || xDate > today()) return
    store.updateMeasureEntry(entryId, { date: xDate, value: v })
    entryId = null
  }

  let renaming = $state(false)
  let rName = $state('')

  function startRename() {
    rName = m?.name ?? ''
    renaming = true
  }

  function saveRename(e: SubmitEvent) {
    e.preventDefault()
    const n = rName.trim()
    if (!m || !n) return
    store.renameMeasure(m.id, n)
    renaming = false
  }

  function create(e: SubmitEvent) {
    e.preventDefault()
    const n = newName.trim()
    if (!n || !draft) return
    const v = parseNum(newVal)
    const created = store.addMeasure(n, draft.x, draft.y, Number.isNaN(v) ? undefined : v)
    newName = newVal = ''
    onselect(created.id)
  }

  function log(e: SubmitEvent) {
    e.preventDefault()
    const v = parseNum(entry)
    if (!m || Number.isNaN(v) || !date || date > today()) return
    store.logMeasure(m.id, v, date)
    entry = ''
  }
</script>

<aside class="panel" aria-live="polite">
  {#if draft}
    <div>
      <div class="eyebrow">{t('mp.newPoint')}</div>
      <h2 class="ptitle">{t('meas.newName')}</h2>
    </div>
    <p class="sub">{t('mp.placed')}</p>
    <form onsubmit={create} autocomplete="off">
      <label>{t('mp.nameLabel')}<input id="m-name" bind:this={nameInput} bind:value={newName} required placeholder={t('mp.namePlaceholder')} /></label>
      <label>{t('mp.firstLabel')}<input id="m-val" bind:value={newVal} inputmode="decimal" placeholder="38,5" /></label>
      <div class="btns">
        <button class="btn" type="submit">{t('mp.create')}</button>
        <button class="btn ghost" type="button" onclick={oncancel}>{t('action.cancel')}</button>
      </div>
    </form>
  {:else if m}
    {#if renaming}
      <form onsubmit={saveRename} autocomplete="off">
        <label>{t('mp.nameLabel')}<input id="m-rename" bind:value={rName} required /></label>
        <div class="btns">
          <button class="btn" type="submit">{t('action.save')}</button>
          <button class="btn ghost" type="button" onclick={() => (renaming = false)}>{t('action.cancel')}</button>
        </div>
      </form>
    {:else}
      <div>
        <div class="eyebrow">{t('mp.eyebrow')}</div>
        <h2 class="ptitle">{m.name}</h2>
      </div>
    {/if}
    <div class="big">
      <span class="val">{last ? fmt(last.value) : '—'}</span><span class="unit">cm</span>
      {#if last && first && m.log.length > 1}
        <span class="delta">{t('mp.sinceDate', { delta: signed(last.value - first.value), date: fdate(first.date) })}</span>
      {/if}
    </div>
    {#if m.log.length}
      <LineChart
        points={m.log.map((l) => ({ date: l.date, value: l.value }))}
        unit="cm"
        title={t('mp.chartTitle', { name: m.name, v: fmt(last!.value) })}
      />
    {/if}

    <form onsubmit={log} autocomplete="off">
      <h3>{t('mp.newEntry')}</h3>
      <div class="row2">
        <input id="m-entry" bind:value={entry} inputmode="decimal" placeholder="cm" aria-label={t('mp.ariaEntry')} required />
        <button class="btn" type="submit">{t('action.save')}</button>
      </div>
      <DateField id="m-date" bind:value={date} />
    </form>

    {#if m.log.length}
      <div>
        <h3>{t('mp.history')}</h3>
        <ul class="hist spaced">
          {#each shown as l (l.id)}
            {#if entryId === l.id}
              <li class="editing">
                <form onsubmit={saveEntry} autocomplete="off">
                  <div class="row2">
                    <label>{t('mp.valueLabel')}<input id="m-entry-val-{l.id}" bind:value={xVal} inputmode="decimal" required /></label>
                    <label>{t('date.label')}<input id="m-entry-date-{l.id}" type="date" bind:value={xDate} max={today()} required /></label>
                  </div>
                  <div class="btns">
                    <button class="btn" type="submit">{t('action.save')}</button>
                    <button class="btn ghost" type="button" onclick={() => (entryId = null)}>{t('action.cancel')}</button>
                  </div>
                </form>
              </li>
            {:else}
              <li>
                <button class="entry" aria-label={t('entry.edit', { date: fdate(l.date) })} onclick={() => startEntry(l)}>
                  <span class="meta">{fdate(l.date)}</span>
                  <span class="meta val">{fmt(l.value)} cm</span>
                </button>
                <button class="x" aria-label={t('entry.delete', { date: fdate(l.date) })} onclick={() => store.deleteMeasureEntry(m.id, l.id)}>×</button>
              </li>
            {/if}
          {/each}
        </ul>
        {#if m.log.length > HIST}
          <button class="linkish" onclick={() => (showAll = !showAll)}>
            {showAll ? t('hist.showLess') : t('hist.showAll', { n: m.log.length })}
          </button>
        {/if}
      </div>
    {/if}

    {#if m.labelY !== undefined}
      <button class="linkish" onclick={() => store.moveLabel(m.id, undefined)}>{t('mp.resetLabel')}</button>
    {/if}
    {#if !renaming}
      <button class="linkish" onclick={startRename}>{t('mp.rename')}</button>
    {/if}
    <button class="linkish" onclick={() => onselect(null)}>{t('mp.allMeasures')}</button>
    {#if confirmDel}
      <div class="btns">
        <button class="btn danger" onclick={() => { store.deleteMeasure(m.id); onselect(null) }}>{t('action.deleteWithHistory', { name: m.name })}</button>
        <button class="btn ghost" onclick={() => (confirmDel = false)}>{t('action.keep')}</button>
      </div>
    {:else}
      <button class="linkish" onclick={() => (confirmDel = true)}>{t('mp.deleteThis')}</button>
    {/if}
  {:else}
    <div>
      <div class="eyebrow">{t('mp.listEyebrow')}</div>
      <h2 class="ptitle">{t('mp.listTitle')}</h2>
    </div>
    {#if store.measures.length}
      <ul class="list">
        {#each store.measures as x (x.id)}
          {@const lv = x.log.at(-1)}
          <li>
            <button class="row-btn" onclick={() => onselect(x.id)}>
              <div class="name">{x.name}</div>
              <Sparkline values={x.log.map((l) => l.value)} width={64} height={24} />
              <div class="meta">
                {lv ? `${fmt(lv.value)} cm` : '—'}{#if x.log.length > 1}{' · '}{signed(lv!.value - x.log[0].value)} cm{/if}
              </div>
            </button>
          </li>
        {/each}
      </ul>
    {:else}
      <p class="empty">{t('mp.empty')}</p>
    {/if}
  {/if}
</aside>

