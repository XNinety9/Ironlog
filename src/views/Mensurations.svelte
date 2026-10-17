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

  // ----- Déplacement (glisser-déposer) -----
  // Le point bouge librement mais reste sur la silhouette ; l'étiquette ne bouge qu'à la verticale.
  interface Drag {
    id: string
    kind: 'pin' | 'label'
    pointerId: number
    startClientX: number
    startClientY: number
    startGeoY: number
    startLabelY: number
    moved: boolean
    x: number
    y: number
    labelY: number
  }
  let drag = $state<Drag | null>(null)
  let suppressClick = false
  const DRAG_THRESHOLD = 5

  function toGeo(clientX: number, clientY: number) {
    const pt = new DOMPoint(clientX, clientY).matrixTransform(svg.getScreenCTM()!.inverse())
    return { x: (pt.x - L.tx) / L.S, y: (pt.y - L.ty) / L.S }
  }

  /** Le point est-il sur le corps ? Les tracés potrace ont l'axe y inversé. */
  function onBody(x: number, y: number): boolean {
    const sil = svg.querySelector<SVGPathElement>('.sil')
    if (!sil) return true
    return sil.isPointInFill(new DOMPoint(x, GEO.front.h - y))
  }

  /** Bornes de l'étiquette : son centre reste dans le cadre. */
  function clampLabel(labelY: number): number {
    const min = (L.LH / 2 + 4 - L.ty) / L.S
    const max = (L.FH - L.LH / 2 - 4 - L.ty) / L.S
    return Math.min(max, Math.max(min, labelY))
  }

  function labelCenterGeo(id: string): number {
    const p = placed.find((q) => q.id === id)
    return p ? (p.ly + L.LH / 2 - L.ty) / L.S : 0
  }

  function ondown(e: PointerEvent) {
    if (e.button !== 0) return
    const el = (e.target as Element).closest<SVGElement>('[data-drag]')
    if (!el) return
    const id = el.dataset.id!
    const kind = el.dataset.drag as 'pin' | 'label'
    const m = id === 'draft' ? draft : store.measure(id)
    if (!m) return
    const g = toGeo(e.clientX, e.clientY)
    const labelY = labelCenterGeo(id)
    drag = {
      id, kind, pointerId: e.pointerId,
      startClientX: e.clientX, startClientY: e.clientY, startGeoY: g.y, startLabelY: labelY,
      moved: false, x: m.x, y: m.y, labelY,
    }
  }

  function onmove(e: PointerEvent) {
    if (!drag || e.pointerId !== drag.pointerId) return
    if (!drag.moved && Math.hypot(e.clientX - drag.startClientX, e.clientY - drag.startClientY) < DRAG_THRESHOLD) return
    if (!drag.moved) {
      // Capture seulement une fois le déplacement commencé : un simple toucher garde sa cible et sélectionne.
      drag.moved = true
      svg.setPointerCapture(e.pointerId)
    }
    const g = toGeo(e.clientX, e.clientY)
    if (drag.kind === 'pin') {
      // Hors du corps, le point reste à sa dernière position valide.
      if (onBody(g.x, g.y)) {
        drag.x = g.x
        drag.y = g.y
      }
    } else {
      drag.labelY = clampLabel(drag.startLabelY + (g.y - drag.startGeoY))
    }
  }

  function onup(e: PointerEvent) {
    if (!drag || e.pointerId !== drag.pointerId) return
    const d = drag
    drag = null
    if (!d.moved) return
    // Le clic qui suit le relâchement ne doit pas créer de point ni changer la sélection.
    suppressClick = true
    setTimeout(() => (suppressClick = false), 0)
    if (d.id === 'draft') {
      draft = { x: Math.round(d.x), y: Math.round(d.y) }
      return
    }
    if (d.kind === 'pin') store.moveMeasure(d.id, Math.round(d.x), Math.round(d.y))
    else store.moveLabel(d.id, Math.round(d.labelY))
    selId = d.id
  }

  function oncancel(e: PointerEvent) {
    if (drag && e.pointerId === drag.pointerId) drag = null
  }

  // Sur écran tactile, glisser un point ou une étiquette ne doit pas faire défiler la page.
  $effect(() => {
    const stop = (e: TouchEvent) => {
      if ((e.target as Element).closest('[data-drag]')) e.preventDefault()
    }
    svg.addEventListener('touchstart', stop, { passive: false })
    return () => svg.removeEventListener('touchstart', stop)
  })

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

  type Item = Pick<Measure, 'id' | 'name' | 'x' | 'y' | 'labelY' | 'log'>

  function place(items: Item[]): (Placed & { want: number })[] {
    const out = items.map((m) => {
      const last = m.log.at(-1)?.value
      const px = L.tx + m.x * L.S
      const py = L.ty + m.y * L.S
      return {
        id: m.id,
        name: m.name,
        px,
        py,
        // Centre voulu de l'étiquette : sa hauteur choisie, sinon celle du point.
        want: m.labelY !== undefined ? L.ty + m.labelY * L.S : py,
        ly: 0,
        left: px < 100,
        last,
        delta: m.log.length > 1 ? last! - m.log[0].value : null,
      }
    })
    // Empile les étiquettes de chaque côté sans chevauchement, au plus près de leur hauteur voulue.
    for (const left of [true, false]) {
      const side = out.filter((p) => p.left === left).sort((a, b) => a.want - b.want)
      let prev = -1e9
      for (const p of side) {
        p.ly = Math.max(p.want - L.LH / 2, prev + L.LH + GAP, 4)
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

  const placed = $derived.by(() => {
    const items: Item[] = draft ? [...store.measures, { id: 'draft', name: 'Nouvelle mesure', ...draft, log: [] }] : [...store.measures]
    // Pendant un déplacement, la position en cours remplace celle enregistrée.
    const d = drag
    return place(
      d?.moved
        ? items.map((m) => (m.id !== d.id ? m : d.kind === 'pin' ? { ...m, x: d.x, y: d.y } : { ...m, labelY: d.labelY }))
        : items,
    )
  })

  function onclick(e: MouseEvent) {
    if (suppressClick) return
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

  // Pas des flèches, dans le repère de la figure (environ 4 unités d'affichage).
  const KEY_STEP = 20

  function onkey(e: KeyboardEvent, id: string, kind: 'pin' | 'label') {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      selId = id
      draft = null
      return
    }
    const dy = e.key === 'ArrowUp' ? -1 : e.key === 'ArrowDown' ? 1 : 0
    const dx = kind === 'pin' ? (e.key === 'ArrowLeft' ? -1 : e.key === 'ArrowRight' ? 1 : 0) : 0
    if (!dx && !dy) return
    e.preventDefault()
    const m = store.measure(id)
    if (!m) return
    if (kind === 'label') {
      store.moveLabel(id, Math.round(clampLabel(labelCenterGeo(id) + dy * KEY_STEP)))
    } else {
      const x = m.x + dx * KEY_STEP
      const y = m.y + dy * KEY_STEP
      if (onBody(x, y)) store.moveMeasure(id, x, y)
    }
    selId = id
  }
</script>

<div class="view">
  <div class="stage">
    <p class="hint">
      Touche le corps pour placer une nouvelle mesure. Fais glisser un point pour le déplacer, ou une étiquette pour la monter ou la descendre.
    </p>
    <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
    <svg
      bind:this={svg}
      bind:clientWidth={width}
      class:dragging={drag?.moved}
      viewBox={L.viewBox}
      role="img"
      aria-label="Corps vu de face avec les points de mesure"
      {onclick}
      onpointerdown={ondown}
      onpointermove={onmove}
      onpointerup={onup}
      onpointercancel={oncancel}
    >
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
          data-drag={p.id === 'draft' ? undefined : 'label'}
          role="button"
          tabindex={p.id === 'draft' ? -1 : 0}
          aria-label="{p.name}{p.last !== undefined ? ` : ${fmt(p.last)} cm` : ''}. Flèches haut et bas pour déplacer l'étiquette."
          onkeydown={(e) => onkey(e, p.id, 'label')}
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
        <circle class="pin" class:on={p.id === selId} class:draft={p.id === 'draft'} cx={p.px} cy={p.py} r={p.id === selId ? 5.5 : 4} />
        <!-- Zone de prise invisible, bien plus grande que le point, pour le doigt. -->
        <circle
          class="hit"
          data-id={p.id}
          data-drag="pin"
          cx={p.px}
          cy={p.py}
          r={L.compact ? 14 : 10}
          role="button"
          tabindex={p.id === 'draft' ? -1 : 0}
          aria-label="Point {p.name}. Flèches pour le déplacer."
          onkeydown={(e) => onkey(e, p.id, 'pin')}
        />
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
  .pin { fill: var(--accent); stroke: var(--surface); stroke-width: 1.6; pointer-events: none; }
  .hit { fill: transparent; cursor: grab; outline: none; touch-action: none; }
  .hit:focus-visible { stroke: var(--accent); stroke-width: 1.5; stroke-dasharray: 2 2; }
  .pin.draft { fill: var(--surface); stroke: var(--accent); stroke-dasharray: 2 1.6; }
  .lead { stroke: var(--muted); stroke-width: 0.6; }
  .lead.on { stroke: var(--accent); stroke-width: 1; }
  .lbl { cursor: ns-resize; outline: none; touch-action: none; }
  .lbl.draft { cursor: default; }
  svg.dragging, svg.dragging * { cursor: grabbing !important; }
  .lbl rect { fill: var(--surface); stroke: var(--line); stroke-width: 0.8; }
  .lbl:focus-visible rect { stroke: var(--accent); stroke-width: 2; }
  .lbl.on rect { stroke: var(--accent); stroke-width: 1.6; }
  .lbl.draft rect { stroke: var(--accent); stroke-dasharray: 3 2; }
  .t { font-family: var(--f-body); fill: var(--muted); }
  .v { font-family: var(--f-mono); font-weight: 500; fill: var(--ink); }
  .d { font-family: var(--f-mono); fill: var(--muted); }
</style>
