<script lang="ts">
  import { t } from '../i18n.svelte'
  import { GROUP_IDS, ZONES, groupName, zoneName, type GroupId } from './muscles'

  interface Props {
    primary: string[]
    secondary: string[]
  }

  let { primary = $bindable(), secondary = $bindable() }: Props = $props()

  const groups: GroupId[] = [...GROUP_IDS]
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

  const label = (r: 'p' | 's' | null) => t(r === 'p' ? 'role.primary' : r === 's' ? 'role.secondary' : 'role.none')
</script>

<div class="picker">
  <p class="sub">
    {t('role.pickerExplainA')} <b class="kp">{t('role.primary')}</b>, {t('role.pickerExplainB')} <b class="ks">{t('role.secondary')}</b>, {t('role.pickerExplainC')}
  </p>
  {#each groups as g (g)}
    {@const zs = zonesOf(g)}
    {@const name = groupName(g)}
    <div class="grp">
      <span class="gname">{name}</span>
      <div class="opts">
        {#if zs.length > 1}
          <button type="button" class="opt {roleOf(g) ?? ''}" aria-label={t('picker.ariaGroup', { name, label: label(roleOf(g)) })} onclick={() => cycle(g)}>
            {t('picker.wholeGroup')}
          </button>
        {/if}
        {#each zs as z (z.id)}
          <button type="button" class="opt {roleOf(z.id) ?? ''}" aria-label={t('picker.ariaZone', { name: zoneName(z.id), label: label(roleOf(z.id)) })} onclick={() => cycle(z.id)}>
            {zs.length > 1 ? zoneName(z.id) : t('picker.wholeGroup')}
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
