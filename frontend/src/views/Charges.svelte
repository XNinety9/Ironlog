<script lang="ts">
  import BodyShapes from '../lib/body/BodyShapes.svelte'
  import { viewBoxOf } from '../lib/body/geo'
  import { convertKey, groupName, groupOf, keysFor, nameOf, type Mode } from '../lib/body/muscles'
  import { t } from '../lib/i18n.svelte'
  import { exercisesFor } from '../lib/model'
  import { store } from '../lib/store.svelte'
  import ExercisePanel from './ExercisePanel.svelte'

  let mode = $state<Mode>('simple')
  let sel = $state<string | null>(null)
  let hov = $state<string | null>(null)

  const keys = $derived(keysFor(mode))
  const status = $derived(
    Object.fromEntries(keys.map((k) => [k, exercisesFor(store.exercises, k, mode)[0]?.role ?? null])),
  )
  const counts = $derived(
    Object.fromEntries(keys.map((k) => [k, exercisesFor(store.exercises, k, mode).filter((x) => x.role === 'p').length])),
  )

  const keyOf = (zoneId: string, groupId: string) => (mode === 'simple' ? groupId : zoneId)

  function zoneClass(zoneId: string, groupId: string): string {
    const k = keyOf(zoneId, groupId)
    let c = 'z'
    if (status[k] === 'p') c += ' has-p'
    else if (status[k] === 's') c += ' has-s'
    if (k === sel) c += ' sel'
    else if (k === hov) c += ' hov'
    return c
  }

  function zoneAt(e: Event): string | null {
    const el = (e.target as Element).closest<SVGElement>('[data-zone]')
    return el ? keyOf(el.dataset.zone!, el.dataset.group!) : null
  }

  function toggle(k: string) {
    sel = sel === k ? null : k
  }

  function setMode(m: Mode) {
    if (m === mode) return
    if (sel) sel = convertKey(sel, m)
    mode = m
    hov = null
  }

  const focus = $derived(hov ?? sel)
</script>

<div class="view">
  <div class="stage">
    <div class="toolbar">
      <div class="seg" role="group" aria-label={t('charges.detailLevel')}>
        <button aria-pressed={mode === 'simple'} onclick={() => setMode('simple')}>{t('charges.simple')}</button>
        <button aria-pressed={mode === 'detail'} onclick={() => setMode('detail')}>{t('charges.detailed')}</button>
      </div>
      <div class="legend">
        <span><i class="sw p"></i>{t('charges.legendPrimary')}</span>
        <span><i class="sw s"></i>{t('charges.legendSecondary')}</span>
      </div>
    </div>

    <!-- Les muscles restent accessibles au clavier via la liste de boutons sous le schéma. -->
    <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
    <div
      class="figs"
      onclick={(e) => { const k = zoneAt(e); if (k) toggle(k) }}
      onpointerover={(e) => (hov = zoneAt(e))}
      onpointerleave={() => (hov = null)}
    >
      <figure>
        <svg class="fig" viewBox={viewBoxOf('front')} role="img" aria-label={t('charges.ariaFront')}>
          <BodyShapes view="front" {zoneClass} />
        </svg>
        <figcaption>{t('charges.front')}</figcaption>
      </figure>
      <figure>
        <svg class="fig" viewBox={viewBoxOf('back')} role="img" aria-label={t('charges.ariaBack')}>
          <BodyShapes view="back" {zoneClass} />
        </svg>
        <figcaption>{t('charges.back')}</figcaption>
      </figure>
    </div>

    <div class="readout">
      {#if focus}
        <b>{nameOf(focus)}</b>{#if mode === 'detail'} · {groupName(groupOf(focus)!)}{/if}
      {:else}
        {t('charges.hover')}
      {/if}
    </div>

    <div class="chips">
      {#each keys as k (k)}
        <button class="chip" aria-pressed={k === sel} onclick={() => toggle(k)}>
          {nameOf(k)}<span class="n">{counts[k]}</span>
        </button>
      {/each}
    </div>
  </div>

  <ExercisePanel {sel} {mode} />
</div>

<style>
  .toolbar { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; }
  .legend { display: flex; gap: 14px; font-size: 12px; color: var(--muted); flex-wrap: wrap; }
  .sw { display: inline-block; width: 10px; height: 10px; border-radius: 3px; margin-right: 6px; vertical-align: -1px; }
  .sw.p { background: var(--m-p); }
  .sw.s { background: var(--m-s); }

  .figs { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  figure { margin: 0; display: flex; flex-direction: column; align-items: center; gap: 4px; }
  figcaption {
    font-family: var(--f-display); font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase;
    font-size: 14px; color: var(--muted);
  }
  .fig { width: 100%; max-width: 300px; height: auto; display: block; touch-action: manipulation; }

  .readout { text-align: center; font-family: var(--f-mono); font-size: 12px; color: var(--muted); min-height: 18px; }
  .readout b { color: var(--ink); font-weight: 500; }

  .chips { display: flex; flex-wrap: wrap; gap: 6px; }
  .chip {
    cursor: pointer; font-size: 13px; padding: 5px 11px; border-radius: 999px;
    border: 1px solid var(--line); background: var(--surface); color: var(--ink);
  }
  .chip .n { font-family: var(--f-mono); font-size: 11px; color: var(--muted); margin-left: 6px; }
  .chip[aria-pressed='true'] { background: var(--accent); border-color: var(--accent); color: var(--accent-ink); }
  .chip[aria-pressed='true'] .n { color: var(--accent-ink); }
</style>
