import { db, type StoreName } from './db'
import { insertByDate, today, uid, type Exercise, type IsoDate, type Measure } from './model'
import { sampleData } from './samples'

type Status = 'loading' | 'ready' | 'memory'

/**
 * État de l'app, persisté dans IndexedDB.
 * Si le stockage est indisponible (navigation privée…), l'app continue en mémoire et le signale.
 */
class Store {
  exercises = $state<Exercise[]>([])
  measures = $state<Measure[]>([])
  status = $state<Status>('loading')

  async load(): Promise<void> {
    try {
      const d = await db()
      const [ex, ms] = await Promise.all([d.getAll('exercises'), d.getAll('measures')])
      this.exercises = ex.sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      this.measures = ms.sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      this.status = 'ready'
    } catch (err) {
      console.error('IndexedDB indisponible', err)
      this.status = 'memory'
    }
  }

  private async put(store: StoreName, value: Exercise | Measure): Promise<void> {
    if (this.status !== 'ready') return
    try {
      const d = await db()
      // IndexedDB ne sait pas cloner les proxys de Svelte : on enregistre un instantané.
      if (store === 'exercises') await d.put(store, $state.snapshot(value) as Exercise)
      else await d.put(store, $state.snapshot(value) as Measure)
    } catch (err) {
      console.error('Échec de l’enregistrement', err)
      this.status = 'memory'
    }
  }

  private async del(store: StoreName, id: string): Promise<void> {
    if (this.status !== 'ready') return
    try {
      await (await db()).delete(store, id)
    } catch (err) {
      console.error('Échec de la suppression', err)
      this.status = 'memory'
    }
  }

  // ----- Exercices -----

  exercise(id: string): Exercise | undefined {
    return this.exercises.find((e) => e.id === id)
  }

  addExercise(name: string, primary: string[], secondary: string[] = [], first?: { kg: number; reps: number }): Exercise {
    const ex: Exercise = {
      id: uid(),
      name,
      primary,
      secondary,
      log: first ? [{ id: uid(), date: today(), ...first }] : [],
      createdAt: new Date().toISOString(),
    }
    this.exercises.push(ex)
    void this.put('exercises', ex)
    return ex
  }

  logLoad(id: string, kg: number, reps: number, date: IsoDate = today()): void {
    const ex = this.exercise(id)
    if (!ex) return
    insertByDate(ex.log, { id: uid(), date, kg, reps })
    void this.put('exercises', ex)
  }

  deleteLoad(id: string, entryId: string): void {
    const ex = this.exercise(id)
    if (!ex) return
    ex.log = ex.log.filter((l) => l.id !== entryId)
    void this.put('exercises', ex)
  }

  deleteExercise(id: string): void {
    this.exercises = this.exercises.filter((e) => e.id !== id)
    void this.del('exercises', id)
  }

  // ----- Mensurations -----

  measure(id: string): Measure | undefined {
    return this.measures.find((m) => m.id === id)
  }

  addMeasure(name: string, x: number, y: number, first?: number): Measure {
    const m: Measure = {
      id: uid(),
      name,
      x,
      y,
      log: first !== undefined ? [{ id: uid(), date: today(), value: first }] : [],
      createdAt: new Date().toISOString(),
    }
    this.measures.push(m)
    void this.put('measures', m)
    return m
  }

  logMeasure(id: string, value: number, date: IsoDate = today()): void {
    const m = this.measure(id)
    if (!m) return
    insertByDate(m.log, { id: uid(), date, value })
    void this.put('measures', m)
  }

  deleteMeasureEntry(id: string, entryId: string): void {
    const m = this.measure(id)
    if (!m) return
    m.log = m.log.filter((l) => l.id !== entryId)
    void this.put('measures', m)
  }

  deleteMeasure(id: string): void {
    this.measures = this.measures.filter((m) => m.id !== id)
    void this.del('measures', id)
  }

  // ----- Exemples -----

  get isEmpty(): boolean {
    return this.exercises.length === 0 && this.measures.length === 0
  }

  loadSamples(): void {
    const { exercises, measures } = sampleData()
    for (const e of exercises) {
      this.exercises.push(e)
      void this.put('exercises', e)
    }
    for (const m of measures) {
      this.measures.push(m)
      void this.put('measures', m)
    }
  }
}

export const store = new Store()
