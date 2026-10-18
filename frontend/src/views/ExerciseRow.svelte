<script lang="ts">
  import DateField from '../lib/DateField.svelte'
  import LineChart from '../lib/LineChart.svelte'
  import Sparkline from '../lib/Sparkline.svelte'
  import { RELIABLE_REPS, epley, type ChartPoint } from '../lib/chart'
  import MusclePicker from '../lib/body/MusclePicker.svelte'
  import { nameOf } from '../lib/body/muscles'
  import { fdate, fmt, parseNum, signed, weeksBetween } from '../lib/format'
  import { t } from '../lib/i18n.svelte'
  import { today, type Exercise, type Role } from '../lib/model'
  import { prefs } from '../lib/prefs.svelte'
  import { store } from '../lib/store.svelte'

  interface Props {
    ex: Exercise
    role: Role
    open: boolean
    ontoggle: () => void
  }

  let { ex, role, open, ontoggle }: Props = $props()

  const last = $derived(ex.log.at(-1))
  const first = $derived(ex.log[0])
  const gain = $derived(last && first ? last.kg - first.kg : 0)

  const round1 = (v: number) => Math.round(v * 10) / 10

  const chart = $derived.by((): ChartPoint[] =>
    ex.log.map((l) => {
      const e1 = round1(epley(l.kg, l.reps))
      const set = `${fmt(l.kg)} kg × ${l.reps}`
      return prefs.metric === 'load'
        ? { date: l.date, value: l.kg, label: set, sub: t('row.sub1rm', { v: fmt(e1) }) }
        : { date: l.date, value: e1, label: t('row.estimated', { v: fmt(e1) }), sub: set }
    }),
  )
  const best = $derived(chart.length ? Math.max(...chart.map((p) => p.value)) : 0)
  const highReps = $derived(prefs.metric === 'e1rm' && ex.log.some((l) => l.reps > RELIABLE_REPS))

  let kg = $state('')
  let reps = $state('')
  let date = $state(today())
  let confirmDel = $state(false)

  let editing = $state(false)
  let eName = $state('')
  let ePrimary = $state<string[]>([])
  let eSecondary = $state<string[]>([])
  let eError = $state('')

  function startEdit() {
    eName = ex.name
    ePrimary = [...ex.primary]
    eSecondary = [...ex.secondary]
    eError = ''
    editing = true
  }

  function saveEdit(e: SubmitEvent) {
    e.preventDefault()
    const name = eName.trim()
    if (!name) return
    if (!ePrimary.length) {
      eError = t('panel.errPrimary')
      return
    }
    store.updateExercise(ex.id, { name, primary: ePrimary, secondary: eSecondary })
    editing = false
  }

  // Pré-remplit avec la dernière perf : le cas courant est de la reprendre ou de l'ajuster.
  $effect(() => {
    if (open) {
      kg = last ? String(last.kg).replace('.', ',') : ''
      reps = last ? String(last.reps) : ''
      confirmDel = false
    } else editing = false
  })

  function log(e: SubmitEvent) {
    e.preventDefault()
    const k = parseNum(kg)
    const r = parseInt(reps, 10)
    if (Number.isNaN(k) || Number.isNaN(r) || r < 1 || !date || date > today()) return
    store.logLoad(ex.id, k, r, date)
  }
</script>

<li>
  <button class="row-btn" aria-expanded={open} onclick={ontoggle}>
    <div class="name">{ex.name}<span class="badge {role}">{t(role === 'p' ? 'role.primary' : 'role.secondary')}</span></div>
    <Sparkline values={ex.log.map((l) => l.kg)} />
    <div class="meta">
      {#if last}
        {fmt(last.kg)} kg × {last.reps}
        {#if ex.log.length > 1}
          · <span class:up={gain > 0}>{signed(gain)} kg</span> {t('row.over', { weeks: weeksBetween(first.date, last.date) })}
        {/if}
      {:else}
        {t('row.noLoad')}
      {/if}
    </div>
  </button>

  {#if open}
    <div class="detail">
      {#if chart.length}
        <div class="chart-head">
          <div class="seg small" role="group" aria-label={t('row.ariaValue')}>
            <button aria-pressed={prefs.metric === 'load'} onclick={() => (prefs.metric = 'load')}>{t('row.load')}</button>
            <button aria-pressed={prefs.metric === 'e1rm'} onclick={() => (prefs.metric = 'e1rm')}>{t('row.oneRm')}</button>
          </div>
          <span class="meta">{t('row.record', { v: fmt(best) })}</span>
        </div>
        <LineChart
          points={chart}
          unit="kg"
          title={t('row.chartTitle', { name: ex.name, metric: t(prefs.metric === 'load' ? 'row.metricLoad' : 'row.metricOneRm'), v: fmt(chart.at(-1)!.value) })}
        />
        {#if highReps}
          <p class="sub">{t('row.repsWarning', { reps: RELIABLE_REPS })}</p>
        {/if}
      {/if}

      <form onsubmit={log} autocomplete="off">
        <div class="row3">
          <label>{t('panel.load')}<input id="log-kg-{ex.id}" bind:value={kg} inputmode="decimal" required /></label>
          <label>{t('panel.reps')}<input id="log-reps-{ex.id}" bind:value={reps} inputmode="numeric" required /></label>
          <button class="btn" type="submit">{t('action.save')}</button>
        </div>
        <DateField id="log-date-{ex.id}" bind:value={date} />
      </form>

      {#if ex.log.length}
        <ul class="hist">
          {#each ex.log.slice(-6).reverse() as l (l.id)}
            <li>
              <span class="meta">{fdate(l.date)}</span>
              <span class="meta val">{fmt(l.kg)} kg × {l.reps}</span>
              <button class="x" aria-label={t('entry.delete', { date: fdate(l.date) })} onclick={() => store.deleteLoad(ex.id, l.id)}>×</button>
            </li>
          {/each}
        </ul>
      {/if}

      {#if editing}
        <form class="edit" onsubmit={saveEdit} autocomplete="off">
          <h3>{t('row.editTitle')}</h3>
          <label>{t('row.nameLabel')}<input id="edit-name-{ex.id}" bind:value={eName} required /></label>
          <MusclePicker bind:primary={ePrimary} bind:secondary={eSecondary} />
          {#if eError}<p class="err" role="alert">{eError}</p>{/if}
          <div class="btns">
            <button class="btn" type="submit">{t('row.saveChanges')}</button>
            <button class="btn ghost" type="button" onclick={() => (editing = false)}>{t('action.cancel')}</button>
          </div>
        </form>
      {:else}
        <p class="sub">
          {t('muscles.primary')} {ex.primary.map(nameOf).join(', ')}{#if ex.secondary.length}{' · '}{t('muscles.secondary')} {ex.secondary.map(nameOf).join(', ')}{/if}
        </p>

        {#if confirmDel}
          <div class="btns">
            <button class="btn danger" onclick={() => store.deleteExercise(ex.id)}>{t('action.deleteWithHistory', { name: ex.name })}</button>
            <button class="btn ghost" onclick={() => (confirmDel = false)}>{t('action.keep')}</button>
          </div>
        {:else}
          <div class="btns gap">
            <button class="linkish" onclick={startEdit}>{t('row.editNameMuscles')}</button>
            <button class="linkish danger" onclick={() => (confirmDel = true)}>{t('action.delete')}</button>
          </div>
        {/if}
      {/if}
    </div>
  {/if}
</li>

<style>
  .detail { display: grid; gap: 12px; padding: 4px 0 14px; min-width: 0; }
  .edit { padding: 12px; border: 1px solid var(--line); border-radius: 10px; background: var(--bg); }
  .gap { gap: 16px; }
  .chart-head { display: flex; justify-content: space-between; align-items: center; gap: 8px; flex-wrap: wrap; }
</style>
