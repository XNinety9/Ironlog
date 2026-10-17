<script lang="ts">
  import { fdate } from './format'
  import { today, type IsoDate } from './model'

  interface Props {
    value: IsoDate
    id: string
  }

  let { value = $bindable(), id }: Props = $props()

  let open = $state(false)
  const isToday = $derived(value === today())
</script>

{#if open || !isToday}
  <div class="row">
    <label for={id}>Date</label>
    <input {id} type="date" bind:value max={today()} required />
    {#if !isToday}
      <button type="button" class="linkish" onclick={() => { value = today(); open = false }}>Revenir à aujourd'hui</button>
    {/if}
  </div>
{:else}
  <button type="button" class="linkish" onclick={() => (open = true)}>Aujourd'hui, {fdate(value)} · Changer la date</button>
{/if}

<style>
  .row { display: flex; align-items: center; gap: 8px 10px; flex-wrap: wrap; }
  label { display: inline; }
  input { width: auto; padding: 6px 8px; font-size: 15px; }
</style>
