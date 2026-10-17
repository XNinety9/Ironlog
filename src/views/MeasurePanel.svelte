<script lang="ts">
  import Sparkline from '../lib/Sparkline.svelte'
  import { fdate, fmt, parseNum, signed } from '../lib/format'
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
  let confirmDel = $state(false)
  let nameInput = $state<HTMLInputElement>()

  // Le nom saisi est conservé si on déplace le point avant de valider.
  $effect(() => {
    if (draft) nameInput?.focus({ preventScroll: true })
  })
  $effect(() => {
    void selId
    confirmDel = false
    entry = ''
  })

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
    if (!m || Number.isNaN(v)) return
    store.logMeasure(m.id, v)
    entry = ''
  }
</script>

<aside class="panel" aria-live="polite">
  {#if draft}
    <div>
      <div class="eyebrow">Nouveau point</div>
      <h2 class="ptitle">Nouvelle mesure</h2>
    </div>
    <p class="sub">Point placé. Touche ailleurs sur le corps pour le déplacer.</p>
    <form onsubmit={create} autocomplete="off">
      <label>Nom de la mesure<input id="m-name" bind:this={nameInput} bind:value={newName} required placeholder="ex. Biceps gauche" /></label>
      <label>Première mesure (cm)<input id="m-val" bind:value={newVal} inputmode="decimal" placeholder="38,5" /></label>
      <div class="btns">
        <button class="btn" type="submit">Créer le point</button>
        <button class="btn ghost" type="button" onclick={oncancel}>Annuler</button>
      </div>
    </form>
  {:else if m}
    <div>
      <div class="eyebrow">Mensuration</div>
      <h2 class="ptitle">{m.name}</h2>
    </div>
    <div class="big">
      <span class="val">{last ? fmt(last.value) : '—'}</span><span class="unit">cm</span>
      {#if last && first && m.log.length > 1}
        <span class="delta">{signed(last.value - first.value)} cm depuis le {fdate(first.date)}</span>
      {/if}
    </div>
    <Sparkline values={m.log.map((l) => l.value)} width={300} height={72} fluid />

    <form onsubmit={log} autocomplete="off">
      <h3>Nouvelle entrée</h3>
      <div class="row2">
        <input id="m-entry" bind:value={entry} inputmode="decimal" placeholder="cm" aria-label="Mesure en centimètres" required />
        <button class="btn" type="submit">Enregistrer</button>
      </div>
    </form>

    {#if m.log.length}
      <div>
        <h3>Historique</h3>
        <ul class="hist spaced">
          {#each m.log.slice(-6).reverse() as l (l.id)}
            <li>
              <span class="meta">{fdate(l.date)}</span>
              <span class="meta val">{fmt(l.value)} cm</span>
              <button class="x" aria-label="Supprimer l'entrée du {fdate(l.date)}" onclick={() => store.deleteMeasureEntry(m.id, l.id)}>×</button>
            </li>
          {/each}
        </ul>
      </div>
    {/if}

    <button class="linkish" onclick={() => onselect(null)}>Toutes les mesures</button>
    {#if confirmDel}
      <div class="btns">
        <button class="btn danger" onclick={() => { store.deleteMeasure(m.id); onselect(null) }}>Supprimer {m.name} et son historique</button>
        <button class="btn ghost" onclick={() => (confirmDel = false)}>Garder</button>
      </div>
    {:else}
      <button class="linkish" onclick={() => (confirmDel = true)}>Supprimer ce point</button>
    {/if}
  {:else}
    <div>
      <div class="eyebrow">Mensurations</div>
      <h2 class="ptitle">Tes mesures</h2>
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
                {lv ? `${fmt(lv.value)} cm` : '—'}{#if x.log.length > 1} · {signed(lv!.value - x.log[0].value)} cm{/if}
              </div>
            </button>
          </li>
        {/each}
      </ul>
    {:else}
      <p class="empty">Aucun point de mesure. Touche le schéma pour placer le premier.</p>
    {/if}
  {/if}
</aside>

