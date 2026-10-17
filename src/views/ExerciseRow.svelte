<script lang="ts">
  import LineChart from '../lib/LineChart.svelte'
  import Sparkline from '../lib/Sparkline.svelte'
  import { RELIABLE_REPS, epley, type ChartPoint } from '../lib/chart'
  import { nameOf } from '../lib/body/muscles'
  import { fdate, fmt, parseNum, signed, weeksBetween } from '../lib/format'
  import type { Exercise, Role } from '../lib/model'
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
        ? { date: l.date, value: l.kg, label: set, sub: `1RM estimé : ${fmt(e1)} kg` }
        : { date: l.date, value: e1, label: `${fmt(e1)} kg estimé`, sub: set }
    }),
  )
  const best = $derived(chart.length ? Math.max(...chart.map((p) => p.value)) : 0)
  const highReps = $derived(prefs.metric === 'e1rm' && ex.log.some((l) => l.reps > RELIABLE_REPS))

  let kg = $state('')
  let reps = $state('')
  let confirmDel = $state(false)

  // Pré-remplit avec la dernière perf : le cas courant est de la reprendre ou de l'ajuster.
  $effect(() => {
    if (open) {
      kg = last ? String(last.kg).replace('.', ',') : ''
      reps = last ? String(last.reps) : ''
      confirmDel = false
    }
  })

  function log(e: SubmitEvent) {
    e.preventDefault()
    const k = parseNum(kg)
    const r = parseInt(reps, 10)
    if (Number.isNaN(k) || Number.isNaN(r) || r < 1) return
    store.logLoad(ex.id, k, r)
  }
</script>

<li>
  <button class="row-btn" aria-expanded={open} onclick={ontoggle}>
    <div class="name">{ex.name}<span class="badge {role}">{role === 'p' ? 'principal' : 'secondaire'}</span></div>
    <Sparkline values={ex.log.map((l) => l.kg)} />
    <div class="meta">
      {#if last}
        {fmt(last.kg)} kg × {last.reps}
        {#if ex.log.length > 1}
          · <span class:up={gain > 0}>{signed(gain)} kg</span> en {weeksBetween(first.date, last.date)} sem.
        {/if}
      {:else}
        Aucune charge enregistrée
      {/if}
    </div>
  </button>

  {#if open}
    <div class="detail">
      {#if chart.length}
        <div class="chart-head">
          <div class="seg small" role="group" aria-label="Valeur affichée">
            <button aria-pressed={prefs.metric === 'load'} onclick={() => (prefs.metric = 'load')}>Charge</button>
            <button aria-pressed={prefs.metric === 'e1rm'} onclick={() => (prefs.metric = 'e1rm')}>1RM estimé</button>
          </div>
          <span class="meta">Record : {fmt(best)} kg</span>
        </div>
        <LineChart
          points={chart}
          unit="kg"
          title="{ex.name}, {prefs.metric === 'load' ? 'charge' : '1RM estimé'} : {fmt(chart.at(-1)!.value)} kg au dernier relevé"
        />
        {#if highReps}
          <p class="sub">Au-delà de {RELIABLE_REPS} répétitions, le 1RM estimé n'est qu'une approximation.</p>
        {/if}
      {/if}

      <form onsubmit={log} autocomplete="off">
        <div class="row3">
          <label>Charge (kg)<input id="log-kg-{ex.id}" bind:value={kg} inputmode="decimal" required /></label>
          <label>Répétitions<input id="log-reps-{ex.id}" bind:value={reps} inputmode="numeric" required /></label>
          <button class="btn" type="submit">Enregistrer</button>
        </div>
      </form>

      {#if ex.log.length}
        <ul class="hist">
          {#each ex.log.slice(-6).reverse() as l (l.id)}
            <li>
              <span class="meta">{fdate(l.date)}</span>
              <span class="meta val">{fmt(l.kg)} kg × {l.reps}</span>
              <button class="x" aria-label="Supprimer l'entrée du {fdate(l.date)}" onclick={() => store.deleteLoad(ex.id, l.id)}>×</button>
            </li>
          {/each}
        </ul>
      {/if}

      <p class="sub">
        Principal : {ex.primary.map(nameOf).join(', ')}{#if ex.secondary.length}{' · '}Secondaire : {ex.secondary.map(nameOf).join(', ')}{/if}
      </p>

      {#if confirmDel}
        <div class="btns">
          <button class="btn danger" onclick={() => store.deleteExercise(ex.id)}>Supprimer {ex.name} et son historique</button>
          <button class="btn ghost" onclick={() => (confirmDel = false)}>Garder</button>
        </div>
      {:else}
        <button class="linkish" onclick={() => (confirmDel = true)}>Supprimer cet exercice</button>
      {/if}
    </div>
  {/if}
</li>

<style>
  .detail { display: grid; gap: 12px; padding: 4px 0 14px; min-width: 0; }
  .chart-head { display: flex; justify-content: space-between; align-items: center; gap: 8px; flex-wrap: wrap; }
</style>
