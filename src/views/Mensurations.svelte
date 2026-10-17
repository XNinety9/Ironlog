<script lang="ts">
  import BodyShapes from '../lib/body/BodyShapes.svelte'
  import { GEO } from '../lib/body/geo'
  import { fmt, signed, trunc } from '../lib/format'
  import type { Measure } from '../lib/model'
  import { store } from '../lib/store.svelte'
  import MeasurePanel from './MeasurePanel.svelte'

  // Repère d'affichage : un cadre de 440 de haut, le corps centré sur x = 100, les étiquettes dans les marges.
  // En écran étroit, le corps rétrécit et les étiquettes grossissent pour rester lisibles.
  const [bx, by, bw, bh] = GEO.front.bbox
  const GAP = 6

  let width = $state(0)
  const L = $derived.by(() => {
    const compact = width > 0 && width < 520
    const k = compact ? 0.82 : 1
    const FH = compact ? 390 : 440
    const S = (430 * k) / bh
    const half = (bw / 2) * S
    const LW = compact ? 118 : 100
    const LH = compact ? 44 : 36
    const leftX = 100 - half - 14 - LW
    const rightX = 100 + half + 14
    return {
      compact, S, LW, LH, leftX, rightX, FH,
      tx: 100 - (bx + bw / 2) * S,
      ty: (FH - bh * S) / 2 - by * S,
      fs: compact ? { t: 12, v: 16, d: 11, ty: 16, vy: 36, pad: 9 } : { t: 9, v: 13, d: 9, ty: 13, vy: 29, pad: 8 },
      viewBox: `${leftX - 6} 0 ${rightX + LW + 6 - (leftX - 6)} ${FH}`,
    }
  })

  let selId = $state<string | null>(null)
  let draft = $state<{ x: number; y: number } | null>(null)
  let svg: SVGSVGElement

  interface Placed {
    id: string
    name: string
    px: number
    py: number
    ly: number
    left: boolean
    last?: number
    delta: number | null
  }

  function place(items: { id: string; name: string; x: number; y: number; log: Measure['log'] }[]): Placed[] {
    const out: Placed[] = items.map((m) => {
      const last = m.log.at(-1)?.value
      const px = L.tx + m.x * L.S
      return {
        id: m.id,
        name: m.name,
        px,
        py: L.ty + m.y * L.S,
        ly: 0,
        left: px < 100,
        last,
        delta: m.log.length > 1 ? last! - m.log[0].value : null,
      }
    })
    // Empile les étiquettes de chaque côté sans chevauchement, au plus près de leur point.
    for (const left of [true, false]) {
      const side = out.filter((p) => p.left === left).sort((a, b) => a.py - b.py)
      let prev = -1e9
      for (const p of side) {
        p.ly = Math.max(p.py - L.LH / 2, prev + L.LH + GAP, 4)
        prev = p.ly
      }
      let max = L.FH - L.LH - 4
      for (let i = side.length - 1; i >= 0; i--) {
        side[i].ly = Math.min(side[i].ly, max)
        max = side[i].ly - L.LH - GAP
      }
    }
    return out
  }

  const placed = $derived(
    place(draft ? [...store.measures, { id: 'draft', name: 'Nouvelle mesure', ...draft, log: [] }] : store.measures),
  )

  function onclick(e: MouseEvent) {
    const hit = (e.target as Element).closest<SVGElement>('[data-id]')
    if (hit) {
      if (hit.dataset.id !== 'draft') {
        selId = hit.dataset.id!
        draft = null
      }
      return
    }
    if (!(e.target as Element).classList.contains('sil')) return
    const pt = new DOMPoint(e.clientX, e.clientY).matrixTransform(svg.getScreenCTM()!.inverse())
    draft = { x: Math.round((pt.x - L.tx) / L.S), y: Math.round((pt.y - L.ty) / L.S) }
    selId = null
  }

  function onkey(e: KeyboardEvent, id: string) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      selId = id
      draft = null
    }
  }
</script>

<div class="view">
  <div class="stage">
    <p class="hint">Touche le corps à l'endroit que tu veux suivre pour y placer une nouvelle mesure.</p>
    <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
    <svg bind:this={svg} bind:clientWidth={width} viewBox={L.viewBox} role="img" aria-label="Corps vu de face avec les points de mesure" {onclick}>
      <g transform="translate({L.tx} {L.ty}) scale({L.S})">
        <BodyShapes view="front" />
      </g>
      {#each placed as p (p.id)}
        <line
          class="lead"
          class:on={p.id === selId || p.id === 'draft'}
          x1={p.px}
          y1={p.py}
          x2={p.left ? L.leftX + L.LW : L.rightX}
          y2={p.ly + L.LH / 2}
        />
      {/each}
      {#each placed as p (p.id)}
        {@const bxl = p.left ? L.leftX : L.rightX}
        <g
          class="lbl"
          class:on={p.id === selId}
          class:draft={p.id === 'draft'}
          data-id={p.id}
          role="button"
          tabindex={p.id === 'draft' ? -1 : 0}
          aria-label="{p.name}{p.last !== undefined ? ` : ${fmt(p.last)} cm` : ''}"
          onkeydown={(e) => onkey(e, p.id)}
        >
          <rect x={bxl} y={p.ly} width={L.LW} height={L.LH} rx="6" />
          <text class="t" x={bxl + L.fs.pad} y={p.ly + L.fs.ty} font-size={L.fs.t}>{trunc(p.name, p.delta !== null ? 14 : 17)}</text>
          <text class="v" x={bxl + L.fs.pad} y={p.ly + L.fs.vy} font-size={L.fs.v}>{p.last !== undefined ? `${fmt(p.last)} cm` : '—'}</text>
          {#if p.delta !== null}
            <text class="d" x={bxl + L.LW - L.fs.pad} y={p.ly + L.fs.ty} font-size={L.fs.d} text-anchor="end">{signed(p.delta)}</text>
          {/if}
        </g>
      {/each}
      {#each placed as p (p.id)}
        <circle class="pin" class:on={p.id === selId} class:draft={p.id === 'draft'} data-id={p.id} cx={p.px} cy={p.py} r={p.id === selId ? 5.5 : 4} />
      {/each}
    </svg>
  </div>

  <MeasurePanel
    {selId}
    {draft}
    onselect={(id) => { selId = id; draft = null }}
    oncancel={() => (draft = null)}
  />
</div>

<style>
  .hint { color: var(--muted); margin: 0; font-size: 14px; }
  svg { width: 100%; max-width: 600px; height: auto; margin: 0 auto; display: block; touch-action: manipulation; }
  svg :global(.sil) { cursor: crosshair; }
  .pin { fill: var(--accent); stroke: var(--surface); stroke-width: 1.6; cursor: pointer; }
  .pin.draft { fill: var(--surface); stroke: var(--accent); stroke-dasharray: 2 1.6; }
  .lead { stroke: var(--muted); stroke-width: 0.6; }
  .lead.on { stroke: var(--accent); stroke-width: 1; }
  .lbl { cursor: pointer; outline: none; }
  .lbl rect { fill: var(--surface); stroke: var(--line); stroke-width: 0.8; }
  .lbl:focus-visible rect { stroke: var(--accent); stroke-width: 2; }
  .lbl.on rect { stroke: var(--accent); stroke-width: 1.6; }
  .lbl.draft rect { stroke: var(--accent); stroke-dasharray: 3 2; }
  .t { font-family: var(--f-body); fill: var(--muted); }
  .v { font-family: var(--f-mono); font-weight: 500; fill: var(--ink); }
  .d { font-family: var(--f-mono); fill: var(--muted); }
</style>
