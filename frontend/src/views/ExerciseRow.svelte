<script lang="ts">
  import { slide } from 'svelte/transition'
  import DateField from '../lib/DateField.svelte'
  import LineChart from '../lib/LineChart.svelte'
  import Sparkline from '../lib/Sparkline.svelte'
  import { RELIABLE_REPS, epley, type ChartPoint } from '../lib/chart'
  import MusclePicker from '../lib/body/MusclePicker.svelte'
  import { nameOf } from '../lib/body/muscles'
  import { fdate, fmt, parseNum, signed, weeksBetween } from '../lib/format'
  import { t } from '../lib/i18n.svelte'
  import { goalProgress, meetsGoal, today, type Exercise, type Goal, type LoadEntry, type Role } from '../lib/model'
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

  const progress = $derived(ex.goal ? goalProgress(ex.goal, ex.log) : null)
  const target = $derived(ex.goal && (prefs.metric === 'load' ? ex.goal.kg : round1(epley(ex.goal.kg, ex.goal.reps))))
  const fgoal = (g: Goal) => (g.reps > 1 ? `${fmt(g.kg)} kg × ${g.reps}` : `${fmt(g.kg)} kg`)

  const HIST = 6
  let showAll = $state(false)
  const shown = $derived((showAll ? ex.log : ex.log.slice(-HIST)).toReversed())

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

  const num = (v: number) => String(v).replace('.', ',')

  // Correction d'une entrée de l'historique, une à la fois.
  let entryId = $state<string | null>(null)
  let xKg = $state('')
  let xReps = $state('')
  let xDate = $state(today())

  function startEntry(l: LoadEntry) {
    entryId = l.id
    xKg = num(l.kg)
    xReps = String(l.reps)
    xDate = l.date
  }

  function saveEntry(e: SubmitEvent) {
    e.preventDefault()
    const k = parseNum(xKg)
    const r = parseInt(xReps, 10)
    if (!entryId || Number.isNaN(k) || Number.isNaN(r) || r < 1 || !xDate || xDate > today()) return
    store.updateLoad(entryId, { date: xDate, kg: k, reps: r })
    entryId = null
  }

  // Objectif : formulaire, et message quand une nouvelle entrée l'atteint pour la première fois.
  let goalEditing = $state(false)
  let gKg = $state('')
  let gReps = $state('')
  let celebrate = $state(false)

  function startGoal() {
    gKg = ex.goal ? num(ex.goal.kg) : ''
    gReps = ex.goal && ex.goal.reps > 1 ? String(ex.goal.reps) : ''
    celebrate = false
    goalEditing = true
  }

  function saveGoal(e: SubmitEvent) {
    e.preventDefault()
    const k = parseNum(gKg)
    const r = gReps.trim() ? parseInt(gReps, 10) : 1
    if (Number.isNaN(k) || k <= 0 || Number.isNaN(r) || r < 1) return
    store.setGoal(ex.id, { kg: k, reps: r })
    goalEditing = false
  }

  function removeGoal() {
    store.setGoal(ex.id, undefined)
    goalEditing = false
  }

  // Pré-remplit avec la dernière perf : le cas courant est de la reprendre ou de l'ajuster.
  $effect(() => {
    if (open) {
      kg = last ? num(last.kg) : ''
      reps = last ? String(last.reps) : ''
      confirmDel = false
    } else {
      editing = goalEditing = celebrate = showAll = false
      entryId = null
    }
  })

  function log(e: SubmitEvent) {
    e.preventDefault()
    const k = parseNum(kg)
    const r = parseInt(reps, 10)
    if (Number.isNaN(k) || Number.isNaN(r) || r < 1 || !date || date > today()) return
    const goal = ex.goal
    const reachedBefore = !goal || ex.log.some((l) => meetsGoal(goal, l))
    store.logLoad(ex.id, k, r, date)
    celebrate = !reachedBefore && meetsGoal(goal!, { kg: k, reps: r })
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
    <div class="detail" transition:slide={{ duration: 180 }}>
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
          {target}
          title={t('row.chartTitle', { name: ex.name, metric: t(prefs.metric === 'load' ? 'row.metricLoad' : 'row.metricOneRm'), v: fmt(chart.at(-1)!.value) })}
        />
        {#if highReps}
          <p class="sub">{t('row.repsWarning', { reps: RELIABLE_REPS })}</p>
        {/if}
      {/if}

      {#if celebrate && ex.goal}
        <p class="goal-hit" role="status">
          {t('goal.congrats', { goal: fgoal(ex.goal) })}
          <button class="linkish" onclick={startGoal}>{t('goal.next')}</button>
        </p>
      {/if}

      {#if goalEditing}
        <form class="edit" onsubmit={saveGoal} autocomplete="off">
          <h3>{t('goal.title')}</h3>
          <div class="row2">
            <label>{t('panel.load')}<input id="goal-kg-{ex.id}" bind:value={gKg} inputmode="decimal" required /></label>
            <label>{t('goal.minReps')}<input id="goal-reps-{ex.id}" bind:value={gReps} inputmode="numeric" placeholder="1" /></label>
          </div>
          <div class="btns">
            <button class="btn" type="submit">{t('action.save')}</button>
            <button class="btn ghost" type="button" onclick={() => (goalEditing = false)}>{t('action.cancel')}</button>
            {#if ex.goal}
              <button class="linkish danger" type="button" onclick={removeGoal}>{t('goal.remove')}</button>
            {/if}
          </div>
        </form>
      {:else if ex.goal && progress}
        <div class="goal" class:done={progress.reachedOn}>
          <div class="goal-head">
            <span>{t('goal.label', { goal: fgoal(ex.goal) })}</span>
            <span class="meta">
              {progress.reachedOn
                ? t('goal.reachedOn', { date: fdate(progress.reachedOn) })
                : t('goal.progress', { best: fmt(progress.best), pct: progress.pct })}
            </span>
          </div>
          <div class="bar" role="progressbar" aria-label={t('goal.title')} aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress.pct}>
            <span style:width="{progress.pct}%"></span>
          </div>
        </div>
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
          {#each shown as l (l.id)}
            {#if entryId === l.id}
              <li class="editing">
                <form onsubmit={saveEntry} autocomplete="off">
                  <div class="row2">
                    <label>{t('panel.load')}<input id="entry-kg-{l.id}" bind:value={xKg} inputmode="decimal" required /></label>
                    <label>{t('panel.reps')}<input id="entry-reps-{l.id}" bind:value={xReps} inputmode="numeric" required /></label>
                  </div>
                  <label>{t('date.label')}<input id="entry-date-{l.id}" type="date" bind:value={xDate} max={today()} required /></label>
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
                  <span class="meta val">{fmt(l.kg)} kg × {l.reps}</span>
                </button>
                <button class="x" aria-label={t('entry.delete', { date: fdate(l.date) })} onclick={() => store.deleteLoad(ex.id, l.id)}>×</button>
              </li>
            {/if}
          {/each}
        </ul>
        {#if ex.log.length > HIST}
          <button class="linkish" onclick={() => (showAll = !showAll)}>
            {showAll ? t('hist.showLess') : t('hist.showAll', { n: ex.log.length })}
          </button>
        {/if}
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
            {#if !goalEditing}
              <button class="linkish" onclick={startGoal}>{t(ex.goal ? 'goal.edit' : 'goal.set')}</button>
            {/if}
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
  .goal { display: grid; gap: 6px; }
  .goal-head { display: flex; justify-content: space-between; align-items: baseline; gap: 4px 10px; flex-wrap: wrap; font-size: 14px; font-weight: 600; }
  .bar { height: 8px; border-radius: 4px; background: var(--bg); border: 1px solid var(--line); overflow: hidden; }
  .bar span { display: block; height: 100%; background: var(--accent); border-radius: 4px; transition: width .3s; }
  .goal.done .bar span { background: var(--good); }
  .goal.done .meta { color: var(--good); }
  .goal-hit {
    margin: 0; padding: 10px 12px; border: 1px solid var(--good); border-radius: 10px; color: var(--good); font-weight: 600; font-size: 14px;
    display: flex; gap: 6px 12px; flex-wrap: wrap; align-items: baseline;
  }
  @media (prefers-reduced-motion: reduce) { .bar span { transition: none; } }
</style>
