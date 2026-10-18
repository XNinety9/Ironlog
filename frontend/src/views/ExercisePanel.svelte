<script lang="ts">
  import MusclePicker from '../lib/body/MusclePicker.svelte'
  import { GROUPS, ZONES, groupOf, keysFor, nameOf, type Mode } from '../lib/body/muscles'
  import { parseNum } from '../lib/format'
  import { exercisesFor } from '../lib/model'
  import { store } from '../lib/store.svelte'
  import ExerciseRow from './ExerciseRow.svelte'

  let { sel, mode }: { sel: string | null; mode: Mode } = $props()

  const list = $derived(sel ? exercisesFor(store.exercises, sel, mode) : [])
  const parts = $derived(sel && mode === 'simple' ? ZONES.filter((z) => z.g === sel) : [])
  const covered = $derived(
    keysFor(mode).filter((k) => exercisesFor(store.exercises, k, mode).some((x) => x.role === 'p')).length,
  )

  let open = $state<string | null>(null)
  let name = $state('')
  let kg = $state('')
  let reps = $state('')
  let picking = $state(false)
  let primary = $state<string[]>([])
  let secondary = $state<string[]>([])
  let error = $state('')

  // Un nouvel exercice part du muscle sélectionné ; le sélecteur permet d'en ajouter d'autres.
  $effect(() => {
    primary = sel ? [sel] : []
    secondary = []
    picking = false
    error = ''
  })

  function add(e: SubmitEvent) {
    e.preventDefault()
    const n = name.trim()
    if (!n || !sel) return
    if (!primary.length) {
      error = 'Choisis au moins un muscle principal.'
      return
    }
    const k = parseNum(kg)
    const r = parseInt(reps, 10)
    const ex = store.addExercise(n, primary, secondary, Number.isNaN(k) ? undefined : { kg: k, reps: Number.isNaN(r) ? 1 : r })
    open = ex.id
    name = kg = reps = error = ''
    primary = [sel]
    secondary = []
    picking = false
  }
</script>

<aside class="panel" aria-live="polite">
  {#if !sel}
    <div>
      <div class="eyebrow">Charges</div>
      <h2 class="ptitle">Choisis un muscle</h2>
    </div>
    <p class="empty">Touche une zone du schéma ou un nom dans la liste. Les zones colorées ont déjà des exercices.</p>
    <div class="big"><span class="val">{store.exercises.length}</span><span class="unit">exercices suivis</span></div>
    <p class="sub">
      {covered} {mode === 'simple' ? 'groupes' : 'muscles'} sur {keysFor(mode).length} travaillés en principal.
    </p>
  {:else}
    <div>
      <div class="eyebrow">{mode === 'simple' ? 'Groupe musculaire' : GROUPS[groupOf(sel)!]}</div>
      <h2 class="ptitle">{nameOf(sel)}</h2>
    </div>
    {#if parts.length > 1}
      <p class="sub">Regroupe : {parts.map((z) => z.n).join(', ')}. Passe en mode détaillé pour les séparer.</p>
    {/if}

    {#if list.length}
      <ul class="list">
        {#each list as { ex, role } (ex.id)}
          <ExerciseRow {ex} {role} open={open === ex.id} ontoggle={() => (open = open === ex.id ? null : ex.id)} />
        {/each}
      </ul>
    {:else}
      <p class="empty">Aucun exercice pour l'instant.</p>
    {/if}

    <form onsubmit={add} autocomplete="off">
      <h3>Ajouter un exercice</h3>
      <label>Exercice ou machine<input id="ex-name" bind:value={name} required placeholder="ex. Pec deck" /></label>
      <div class="row2">
        <label>Charge (kg)<input id="ex-kg" bind:value={kg} inputmode="decimal" placeholder="60" /></label>
        <label>Répétitions<input id="ex-reps" bind:value={reps} inputmode="numeric" placeholder="8" /></label>
      </div>
      {#if picking}
        <MusclePicker bind:primary bind:secondary />
      {:else}
        <p class="sub">
          Principal : {primary.map(nameOf).join(', ')}{#if secondary.length}{' · '}Secondaire : {secondary.map(nameOf).join(', ')}{/if}.
          <button class="linkish" type="button" onclick={() => (picking = true)}>Choisir d'autres muscles</button>
        </p>
      {/if}
      {#if error}<p class="err" role="alert">{error}</p>{/if}
      <div class="btns"><button class="btn" type="submit">Ajouter l'exercice</button></div>
    </form>
  {/if}
</aside>

