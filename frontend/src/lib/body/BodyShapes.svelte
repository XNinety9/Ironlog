<svelte:options namespace="svg" />

<script lang="ts">
  import { GEO } from './geo'
  import { ZONES, type View } from './muscles'

  interface Props {
    view: View
    /** Classe de chaque zone musculaire. Sans elle, seuls la silhouette et les traits sont dessinés. */
    zoneClass?: (zoneId: string, groupId: string) => string
  }

  let { view, zoneClass }: Props = $props()

  const g = $derived(GEO[view])
  const zones = $derived(zoneClass ? ZONES.filter((z) => g.zones[z.id]) : [])
</script>

<g transform="translate(0 {g.h}) scale(1 -1)">
  <path class="sil" d={g.sil} />
  {#each zones as z (z.id)}
    <path class={zoneClass?.(z.id, z.g)} d={g.zones[z.id]} data-zone={z.id} data-group={z.g} />
  {/each}
  <path class="ink" d={g.line} />
</g>
