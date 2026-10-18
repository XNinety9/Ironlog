<script lang="ts">
  import type { ChartPoint } from './chart'
  import { fdate, fmt } from './format'
  import { bcp47 } from './i18n.svelte'

  interface Props {
    points: ChartPoint[]
    unit: string
    /** Résumé lu par les lecteurs d'écran. */
    title: string
    height?: number
  }

  let { points, unit, title, height = 180 }: Props = $props()

  let width = $state(0)
  let active = $state<number | null>(null)

  const PAD = { top: 22, right: 14, bottom: 24, left: 38 }
  const DAY = 864e5

  const ts = (d: string) => new Date(d + 'T12:00:00').getTime()

  /** Pas « rond » (1, 2, 2,5, 5 × 10ⁿ) pour environ `n` intervalles. */
  function niceStep(range: number, n: number): number {
    const raw = range / n
    const mag = 10 ** Math.floor(Math.log10(raw))
    const f = raw / mag
    return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * mag
  }

  const geom = $derived.by(() => {
    const vals = points.map((p) => p.value)
    let lo = Math.min(...vals)
    let hi = Math.max(...vals)
    if (hi - lo < 1e-9) {
      const pad = Math.max(Math.abs(hi) * 0.05, 1)
      lo -= pad
      hi += pad
    }
    const step = niceStep(hi - lo, 3)
    const y0 = Math.floor(lo / step) * step
    const y1 = Math.ceil(hi / step) * step
    const yTicks: number[] = []
    for (let v = y0; v <= y1 + step / 2; v += step) yTicks.push(Math.round(v * 1000) / 1000)

    let t0 = ts(points[0].date)
    let t1 = ts(points.at(-1)!.date)
    if (t1 - t0 < DAY) {
      t0 -= 7 * DAY
      t1 += 7 * DAY
    }

    const iw = Math.max(width - PAD.left - PAD.right, 10)
    const ih = height - PAD.top - PAD.bottom
    const x = (t: number) => PAD.left + ((t - t0) / (t1 - t0)) * iw
    const y = (v: number) => PAD.top + ih - ((v - y0) / (y1 - y0)) * ih

    const xy = points.map((p) => [x(ts(p.date)), y(p.value)] as const)
    const line = xy.map(([px, py], i) => `${i ? 'L' : 'M'}${px.toFixed(1)} ${py.toFixed(1)}`).join(' ')
    const base = PAD.top + ih
    const area = xy.length > 1 ? `${line} L${xy.at(-1)![0].toFixed(1)} ${base} L${xy[0][0].toFixed(1)} ${base} Z` : ''

    // Repères de mois : un sur deux, trois, … pour en garder 4 au plus.
    const months: { t: number; label: string }[] = []
    const d = new Date(t0)
    d.setDate(1)
    d.setHours(12, 0, 0, 0)
    if (d.getTime() < t0) d.setMonth(d.getMonth() + 1)
    while (d.getTime() <= t1) {
      months.push({
        t: d.getTime(),
        label: d.toLocaleDateString(bcp47(), d.getMonth() === 0 ? { month: 'short', year: '2-digit' } : { month: 'short' }),
      })
      d.setMonth(d.getMonth() + 1)
    }
    const every = Math.ceil(months.length / Math.max(1, Math.min(4, Math.floor(iw / 70))))
    const xTicks = months.filter((_, i) => i % every === 0).map((m) => ({ x: x(m.t), label: m.label }))

    return { xy, line, area, yTicks: yTicks.map((v) => ({ v, y: y(v) })), xTicks, base, iw }
  })

  const showMarkers = $derived(points.length <= 40)
  const last = $derived(geom.xy.at(-1)!)

  function nearest(clientX: number, el: Element): number {
    const r = el.getBoundingClientRect()
    const px = clientX - r.left
    let best = 0
    for (let i = 1; i < geom.xy.length; i++) {
      if (Math.abs(geom.xy[i][0] - px) < Math.abs(geom.xy[best][0] - px)) best = i
    }
    return best
  }

  function onmove(e: PointerEvent) {
    active = nearest(e.clientX, e.currentTarget as Element)
  }

  function onleave(e: PointerEvent) {
    if (e.pointerType === 'mouse') active = null
  }

  function onkey(e: KeyboardEvent) {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault()
      const d = e.key === 'ArrowRight' ? 1 : -1
      active = Math.min(points.length - 1, Math.max(0, (active ?? (d > 0 ? -1 : points.length)) + d))
    } else if (e.key === 'Escape') active = null
  }

  const tip = $derived(active !== null ? points[active] : null)
  const tipX = $derived(active !== null ? geom.xy[active][0] : 0)
</script>

<div class="chart" bind:clientWidth={width} style:height="{height}px">
  {#if width > 0 && points.length}
    <!-- Graphe navigable au clavier (flèches) : il reste une image pour les lecteurs d'écran. -->
    <!-- svelte-ignore a11y_no_noninteractive_tabindex, a11y_no_noninteractive_element_interactions -->
    <svg
      {width}
      {height}
      role="img"
      aria-label={title}
      tabindex="0"
      onpointermove={onmove}
      onpointerdown={onmove}
      onpointerleave={onleave}
      onkeydown={onkey}
      onblur={() => (active = null)}
    >
      {#each geom.yTicks as t (t.v)}
        <line class="grid" x1={PAD.left} x2={width - PAD.right} y1={t.y} y2={t.y} />
        <text class="axis" x={PAD.left - 6} y={t.y} text-anchor="end" dominant-baseline="middle">{fmt(t.v)}</text>
      {/each}
      {#each geom.xTicks as t (t.x)}
        <text class="axis" x={t.x} y={height - 6} text-anchor="middle">{t.label}</text>
      {/each}

      {#if geom.area}<path class="area" d={geom.area} />{/if}
      {#if geom.xy.length > 1}<path class="line" d={geom.line} />{/if}

      {#if showMarkers}
        {#each geom.xy as [px, py], i (i)}
          <circle class="dot" cx={px} cy={py} r="4" />
        {/each}
      {:else}
        <circle class="dot" cx={last[0]} cy={last[1]} r="4" />
      {/if}

      {#if active === null}
        <text class="end" x={Math.min(last[0], width - PAD.right)} y={last[1] - 10} text-anchor={last[0] > width - 40 ? 'end' : 'middle'}>
          {fmt(points.at(-1)!.value)}
        </text>
      {:else}
        <line class="cross" x1={tipX} x2={tipX} y1={PAD.top - 6} y2={geom.base} />
        <circle class="dot on" cx={tipX} cy={geom.xy[active][1]} r="5.5" />
      {/if}
    </svg>

    {#if tip}
      <div class="tip" class:flip={tipX > width / 2} style:left="{tipX}px">
        <strong>{tip.label ?? `${fmt(tip.value)} ${unit}`}</strong>
        {#if tip.sub}<span>{tip.sub}</span>{/if}
        <span>{fdate(tip.date)}</span>
      </div>
    {/if}
  {/if}
</div>

<style>
  .chart { position: relative; width: 100%; min-width: 0; }
  svg { display: block; overflow: visible; touch-action: pan-y; outline: none; border-radius: 6px; }
  svg:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
  .grid { stroke: var(--line); stroke-width: 1; }
  .axis { font-family: var(--f-mono); font-size: 10px; fill: var(--muted); font-variant-numeric: tabular-nums; }
  .area { fill: var(--accent); opacity: 0.1; }
  .line { fill: none; stroke: var(--accent); stroke-width: 2; stroke-linejoin: round; stroke-linecap: round; }
  .dot { fill: var(--accent); stroke: var(--surface); stroke-width: 2; }
  .dot.on { stroke-width: 2.5; }
  .cross { stroke: var(--muted); stroke-width: 1; stroke-dasharray: 3 3; }
  .end { font-family: var(--f-mono); font-size: 11px; font-weight: 500; fill: var(--ink); font-variant-numeric: tabular-nums; }
  .tip {
    position: absolute; top: 0; transform: translateX(10px); pointer-events: none;
    background: var(--surface); border: 1px solid var(--line); border-radius: 8px; padding: 6px 9px;
    display: grid; gap: 1px; white-space: nowrap; box-shadow: 0 4px 14px rgb(0 0 0 / 0.12);
    font-size: 12px; color: var(--muted); z-index: 2;
  }
  .tip.flip { transform: translateX(calc(-100% - 10px)); }
  .tip strong { font-family: var(--f-mono); font-size: 13px; font-weight: 500; color: var(--ink); }
</style>
