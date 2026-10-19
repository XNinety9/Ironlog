import { SvelteMap } from 'svelte/reactivity'
import { db } from './db'
import { t } from './i18n.svelte'
import { today, uid, type Exercise, type Goal, type IsoDate, type Measure } from './model'
import { buildView, nextStamp, toRecords, toWire, type LocalRecord, type SyncRecord } from './records'
import { sampleData } from './samples'

type Status = 'loading' | 'ready' | 'memory'

/**
 * État de l'app : des enregistrements persistés dans IndexedDB, d'où l'on reconstruit exercices et mensurations.
 * Chaque modification locale est marquée « à envoyer » ; la synchronisation (sync.svelte.ts) s'occupe du reste.
 * Si le stockage est indisponible (navigation privée…), l'app continue en mémoire et le signale.
 */
class Store {
  #records = new SvelteMap<string, LocalRecord>()
  status = $state<Status>('loading')

  #view = $derived(buildView(this.#records.values()))
  /** Nombre de modifications pas encore envoyées au serveur. */
  pendingCount = $derived([...this.#records.values()].filter((r) => r.dirty).length)

  /** Appelé après chaque modification locale (la synchronisation s'y abonne). */
  onLocalChange: () => void = () => {}

  get exercises(): Exercise[] {
    return this.#view.exercises
  }

  get measures(): Measure[] {
    return this.#view.measures
  }

  get isEmpty(): boolean {
    return this.exercises.length === 0 && this.measures.length === 0
  }

  async load(): Promise<void> {
    try {
      const all = await (await db()).getAll('records')
      for (const r of all) this.#records.set(r.id, r)
      this.status = 'ready'
    } catch (err) {
      console.error('IndexedDB unavailable', err)
      this.status = 'memory'
    }
  }

  // ----- Persistance -----

  /** Écrit des enregistrements en mémoire et dans IndexedDB, en une transaction. */
  async #persist(records: LocalRecord[]): Promise<void> {
    for (const r of records) this.#records.set(r.id, r)
    if (this.status !== 'ready' || !records.length) return
    try {
      const tx = (await db()).transaction('records', 'readwrite')
      await Promise.all([...records.map((r) => tx.store.put(r)), tx.done])
    } catch (err) {
      console.error('Failed to save', err)
      this.status = 'memory'
    }
  }

  /** Modification locale : nouvelle version marquée « à envoyer ». */
  #write(records: LocalRecord[]): void {
    void this.#persist(records)
    this.onLocalChange()
  }

  #upsert<R extends SyncRecord>(id: string, kind: R['kind'], data: R['data']): LocalRecord {
    const prev = this.#records.get(id)
    // Copie simple : les tableaux venus des formulaires sont des proxys Svelte, qu'IndexedDB ne sait pas cloner.
    return { id, kind, updatedAt: nextStamp(prev), deleted: false, data: $state.snapshot(data), dirty: true } as LocalRecord
  }

  #tombstone(id: string): LocalRecord | null {
    const prev = this.#records.get(id)
    if (!prev || prev.deleted) return null
    return { ...prev, updatedAt: nextStamp(prev), deleted: true, dirty: true }
  }

  #live<K extends LocalRecord['kind']>(kind: K, id: string): (LocalRecord & { kind: K }) | undefined {
    const r = this.#records.get(id)
    return r && r.kind === kind && !r.deleted ? (r as LocalRecord & { kind: K }) : undefined
  }

  // ----- Exercices -----

  exercise(id: string): Exercise | undefined {
    return this.exercises.find((e) => e.id === id)
  }

  addExercise(name: string, primary: string[], secondary: string[] = [], first?: { kg: number; reps: number }): { id: string } {
    const id = uid()
    const recs = [this.#upsert(id, 'exercise', { name, primary, secondary, createdAt: new Date().toISOString() })]
    if (first) recs.push(this.#upsert(uid(), 'load', { exerciseId: id, date: today(), ...first }))
    this.#write(recs)
    return { id }
  }

  updateExercise(id: string, patch: Pick<Exercise, 'name' | 'primary' | 'secondary'>): void {
    const r = this.#live('exercise', id)
    if (!r) return
    this.#write([this.#upsert(id, 'exercise', { ...r.data, ...patch })])
  }

  logLoad(id: string, kg: number, reps: number, date: IsoDate = today()): void {
    if (!this.#live('exercise', id)) return
    this.#write([this.#upsert(uid(), 'load', { exerciseId: id, date, kg, reps })])
  }

  updateLoad(entryId: string, patch: { date: IsoDate; kg: number; reps: number }): void {
    const r = this.#live('load', entryId)
    if (!r) return
    this.#write([this.#upsert(entryId, 'load', { ...r.data, ...patch })])
  }

  /** Fixe l'objectif de l'exercice, ou le retire (undefined). */
  setGoal(id: string, goal: Goal | undefined): void {
    const r = this.#live('exercise', id)
    if (!r) return
    const { goal: _old, ...rest } = r.data
    this.#write([this.#upsert(id, 'exercise', goal ? { ...rest, goal } : rest)])
  }

  deleteLoad(_exerciseId: string, entryId: string): void {
    const t = this.#tombstone(entryId)
    if (t) this.#write([t])
  }

  /** Supprime l'exercice et ses séries (chacune laisse une trace, pour que la suppression se propage). */
  deleteExercise(id: string): void {
    const ids = [id, ...[...this.#records.values()].filter((r) => r.kind === 'load' && r.data.exerciseId === id).map((r) => r.id)]
    this.#write(ids.map((i) => this.#tombstone(i)).filter((t): t is LocalRecord => t !== null))
  }

  // ----- Mensurations -----

  measure(id: string): Measure | undefined {
    return this.measures.find((m) => m.id === id)
  }

  addMeasure(name: string, x: number, y: number, first?: number): { id: string } {
    const id = uid()
    const recs = [this.#upsert(id, 'measure', { name, x, y, createdAt: new Date().toISOString() })]
    if (first !== undefined) recs.push(this.#upsert(uid(), 'mentry', { measureId: id, date: today(), value: first }))
    this.#write(recs)
    return { id }
  }

  moveMeasure(id: string, x: number, y: number): void {
    const r = this.#live('measure', id)
    if (!r) return
    this.#write([this.#upsert(id, 'measure', { ...r.data, x, y })])
  }

  /** Fixe la hauteur de l'étiquette, ou la remet en placement automatique (undefined). */
  moveLabel(id: string, labelY: number | undefined): void {
    const r = this.#live('measure', id)
    if (!r) return
    const { labelY: _old, ...rest } = r.data
    this.#write([this.#upsert(id, 'measure', labelY === undefined ? rest : { ...rest, labelY })])
  }

  logMeasure(id: string, value: number, date: IsoDate = today()): void {
    if (!this.#live('measure', id)) return
    this.#write([this.#upsert(uid(), 'mentry', { measureId: id, date, value })])
  }

  renameMeasure(id: string, name: string): void {
    const r = this.#live('measure', id)
    if (!r) return
    this.#write([this.#upsert(id, 'measure', { ...r.data, name })])
  }

  updateMeasureEntry(entryId: string, patch: { date: IsoDate; value: number }): void {
    const r = this.#live('mentry', entryId)
    if (!r) return
    this.#write([this.#upsert(entryId, 'mentry', { ...r.data, ...patch })])
  }

  deleteMeasureEntry(_measureId: string, entryId: string): void {
    const t = this.#tombstone(entryId)
    if (t) this.#write([t])
  }

  deleteMeasure(id: string): void {
    const ids = [id, ...[...this.#records.values()].filter((r) => r.kind === 'mentry' && r.data.measureId === id).map((r) => r.id)]
    this.#write(ids.map((i) => this.#tombstone(i)).filter((t): t is LocalRecord => t !== null))
  }

  // ----- Synchronisation -----

  /** Modifications locales à envoyer. */
  pending(): SyncRecord[] {
    return [...this.#records.values()].filter((r) => r.dirty).map(toWire)
  }

  /**
   * Résultat d'une synchronisation : ce qui a été envoyé n'est plus « à envoyer » (sauf si l'enregistrement
   * a encore changé pendant la requête), puis les versions du serveur remplacent les locales plus anciennes.
   */
  async applySync(sent: SyncRecord[], received: SyncRecord[]): Promise<void> {
    const changed = new Map<string, LocalRecord>()
    for (const s of sent) {
      const local = this.#records.get(s.id)
      if (local?.dirty && local.updatedAt === s.updatedAt) changed.set(s.id, { ...local, dirty: false })
    }
    for (const remote of received) {
      const local = changed.get(remote.id) ?? this.#records.get(remote.id)
      // Une modification locale plus récente, pas encore envoyée, garde la main : elle partira au prochain tour.
      if (local?.dirty && local.updatedAt > remote.updatedAt) continue
      if (local && !local.dirty && local.updatedAt === remote.updatedAt && local.deleted === remote.deleted) continue
      changed.set(remote.id, { ...remote, dirty: false } as LocalRecord)
    }
    await this.#persist([...changed.values()])
  }

  async getMeta<T>(key: string): Promise<T | undefined> {
    if (this.status !== 'ready') return undefined
    try {
      return (await (await db()).get('meta', key)) as T | undefined
    } catch {
      return undefined
    }
  }

  async setMeta(key: string, value: unknown): Promise<void> {
    if (this.status !== 'ready') return
    try {
      await (await db()).put('meta', value, key)
    } catch (err) {
      console.error('Failed to save', err)
    }
  }

  // ----- Sauvegarde et exemples -----

  /**
   * Remplace toutes les données (import d'une sauvegarde) : ce qui n'est pas dans le fichier est supprimé,
   * le reste est écrit, en une seule transaction. Les autres appareils reçoivent le résultat à leur prochaine synchro.
   */
  async replaceAll(input: { exercises: Exercise[]; measures: Measure[] }): Promise<void> {
    const { exercises, measures } = $state.snapshot(input) as { exercises: Exercise[]; measures: Measure[] }
    const stamp = Math.max(Date.now(), ...[...this.#records.values()].map((r) => r.updatedAt + 1))
    const incoming = toRecords(exercises, measures, stamp)
    const keep = new Set(incoming.map((r) => r.id))
    const removed = [...this.#records.values()]
      .filter((r) => !r.deleted && !keep.has(r.id))
      .map((r) => ({ ...r, updatedAt: stamp, deleted: true, dirty: true }))
    const all = [...incoming, ...removed]

    if (this.status === 'ready') {
      const tx = (await db()).transaction('records', 'readwrite')
      try {
        // Une seule transaction : en cas d'échec, l'annulation restaure les anciennes données.
        const ops: Promise<unknown>[] = all.map((r) => tx.store.put(r))
        ops.push(tx.done)
        // Après une annulation, toutes les requêtes rejettent : seule la première erreur compte.
        for (const op of ops) op.catch(() => {})
        await Promise.all(ops)
      } catch (err) {
        console.error('Import failed', err)
        try {
          tx.abort()
        } catch {
          // Déjà annulée par l'erreur.
        }
        throw new Error(t('store.importFailed'))
      }
    }
    for (const r of all) this.#records.set(r.id, r)
    this.onLocalChange()
  }

  loadSamples(): void {
    const { exercises, measures } = sampleData()
    this.#write(toRecords(exercises, measures))
  }
}

export const store = new Store()
