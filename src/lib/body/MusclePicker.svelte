<script lang="ts">
  import { GROUPS, ZONES, type GroupId } from './muscles'

  interface Props {
    primary: string[]
    secondary: string[]
  }

  let { primary = $bindable(), secondary = $bindable() }: Props = $props()

  const groups = Object.entries(GROUPS) as [GroupId, string][]
  const zonesOf = (g: GroupId) => ZONES.filter((z) => z.g === g)

  const roleOf = (id: string): 'p' | 's' | null =>
    primary.includes(id) ? 'p' : secondary.includes(id) ? 's' : null

  /** Un toucher fait défiler : rien → principal → secondaire → rien. */
  function cycle(id: string) {
    const r = roleOf(id)
    if (r === null) primary = [...primary, id]
    else if (r === 'p') {
      primary = primary.filter((x) => x !== id)
      secondary = [...secondary, id]
    } else secondary = secondary.filter((x) => x !== id)
  }

  const label = (r: 'p' | 's' | null) => (r === 'p' ? 'principal' : r === 's' ? 'secondaire' : 'non travaillé')
</script>

<div class="picker">
  <p class="sub">Touche un muscle pour le passer en <b class="kp">principal</b>, puis en <b class="ks">secondaire</b>, puis le retirer.</p>
  {#each groups as [g, name] (g)}
    {@const zs = zonesOf(g)}
    <div class="grp">
      <span class="gname">{name}</span>
      <div class="opts">
        {#if zs.length > 1}
          <button type="button" class="opt {roleOf(g) ?? ''}" aria-label="{name} (tout le groupe) : {label(roleOf(g))}" onclick={() => cycle(g)}>
            Tout le groupe
          </button>
        {/if}
        {#each zs as z (z.id)}
          <button type="button" class="opt {roleOf(z.id) ?? ''}" aria-label="{z.n} : {label(roleOf(z.id))}" onclick={() => cycle(z.id)}>
            {zs.length > 1 ? z.n : 'Tout le groupe'}
          </button>
        {/each}
      </div>
    </div>
  {/each}
</div>

<style>
  .picker { display: grid; gap: 10px; }
  .kp, .ks { font-weight: 600; color: var(--ink); }
  .kp { background: var(--m-p); padding: 0 4px; border-radius: 3px; }
  .ks { border: 1px dashed var(--muted); padding: 0 3px; border-radius: 3px; }
  .grp { display: grid; gap: 4px; }
  .gname { font-family: var(--f-mono); font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--muted); }
  .opts { display: flex; flex-wrap: wrap; gap: 5px; }
  .opt {
    cursor: pointer; font-size: 13px; padding: 4px 10px; border-radius: 999px;
    border: 1px solid var(--line); background: var(--surface); color: var(--muted);
  }
  .opt.p { background: var(--m-p); border-color: var(--m-p); color: var(--ink); font-weight: 600; }
  .opt.s { border-style: dashed; border-color: var(--muted); color: var(--ink); }
</style>
