<script lang="ts">
  interface Props {
    values: number[]
    width?: number
    height?: number
  }

  let { values, width = 72, height = 26 }: Props = $props()

  const pts = $derived.by(() => {
    const mn = Math.min(...values)
    const mx = Math.max(...values)
    const r = mx - mn || 1
    const pad = 3
    return values.map((v, i) => [
      pad + (i * (width - 2 * pad)) / (values.length - 1),
      height - pad - ((v - mn) / r) * (height - 2 * pad),
    ])
  })
  const line = $derived(pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' '))
  const area = $derived(
    pts.length ? `${line} L${pts.at(-1)![0].toFixed(1)} ${height} L${pts[0][0].toFixed(1)} ${height} Z` : '',
  )
  const end = $derived(pts.at(-1))
</script>

{#if values.length > 1 && end}
  <svg class="spark" viewBox="0 0 {width} {height}" {width} {height} aria-hidden="true">
    <path class="sa" d={area} />
    <path class="sl" d={line} />
    <circle class="se" cx={end[0]} cy={end[1]} r="2.5" />
  </svg>
{/if}

<style>
  .sa { fill: var(--accent); opacity: 0.12; }
  .sl {
    fill: none; stroke: var(--accent); stroke-width: 1.5; stroke-linejoin: round; stroke-linecap: round;
  }
  .se { fill: var(--accent); }
</style>
