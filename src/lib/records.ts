import type { Exercise, IsoDate, Measure } from './model'

/**
 * Unité de synchronisation. Chaque exercice, série, point de mensuration et mesure est un enregistrement
 * indépendant : deux appareils qui ajoutent chacun une série au même exercice ne se marchent pas dessus.
 */
export type Kind = 'exercise' | 'load' | 'measure' | 'mentry'

export interface ExerciseData {
  name: string
  primary: string[]
  secondary: string[]
  createdAt: string
}
export interface LoadData {
  exerciseId: string
  date: IsoDate
  kg: number
  reps: number
}
export interface MeasureData {
  name: string
  x: number
  y: number
  labelY?: number
  createdAt: string
}
export interface MeasureEntryData {
  measureId: string
  date: IsoDate
  value: number
}

interface DataOf {
  exercise: ExerciseData
  load: LoadData
  measure: MeasureData
  mentry: MeasureEntryData
}

/** Format échangé avec le serveur. */
export type SyncRecord = {
  [K in Kind]: { id: string; kind: K; updatedAt: number; deleted: boolean; data: DataOf[K] }
}[Kind]

/** Format local : en plus, un drapeau indique une modification pas encore envoyée au serveur. */
export type LocalRecord = SyncRecord & { dirty: boolean }

export const toWire = ({ id, kind, updatedAt, deleted, data }: LocalRecord): SyncRecord =>
  ({ id, kind, updatedAt, deleted, data }) as SyncRecord

/**
 * Date de modification d'une nouvelle version : jamais antérieure à la précédente,
 * pour qu'une modification locale l'emporte sur la version dont elle part, même si l'horloge a reculé.
 */
export const nextStamp = (prev?: { updatedAt: number }) => Math.max(Date.now(), (prev?.updatedAt ?? 0) + 1)

/** Reconstruit la vue utilisée par l'interface : exercices et mensurations avec leur historique. */
export function buildView(records: Iterable<LocalRecord>): { exercises: Exercise[]; measures: Measure[] } {
  const exercises = new Map<string, Exercise>()
  const measures = new Map<string, Measure>()
  const loads: { r: LocalRecord & { kind: 'load' } }[] = []
  const entries: { r: LocalRecord & { kind: 'mentry' } }[] = []

  for (const r of records) {
    if (r.deleted) continue
    switch (r.kind) {
      case 'exercise':
        exercises.set(r.id, { id: r.id, ...r.data, primary: [...r.data.primary], secondary: [...r.data.secondary], log: [] })
        break
      case 'measure':
        measures.set(r.id, { id: r.id, ...r.data, log: [] })
        break
      case 'load':
        loads.push({ r })
        break
      case 'mentry':
        entries.push({ r })
        break
    }
  }

  // Une série dont l'exercice a été supprimé sur un autre appareil est simplement ignorée.
  const byDate = <T extends { r: { updatedAt: number; data: { date: string } } }>(a: T, b: T) =>
    a.r.data.date.localeCompare(b.r.data.date) || a.r.updatedAt - b.r.updatedAt
  for (const { r } of loads.sort(byDate)) {
    exercises.get(r.data.exerciseId)?.log.push({ id: r.id, date: r.data.date, kg: r.data.kg, reps: r.data.reps })
  }
  for (const { r } of entries.sort(byDate)) {
    measures.get(r.data.measureId)?.log.push({ id: r.id, date: r.data.date, value: r.data.value })
  }

  const byCreation = (a: { createdAt: string }, b: { createdAt: string }) => a.createdAt.localeCompare(b.createdAt)
  return { exercises: [...exercises.values()].sort(byCreation), measures: [...measures.values()].sort(byCreation) }
}

/** Découpe des exercices et mensurations (exemples, import, ancienne base) en enregistrements à envoyer. */
export function toRecords(exercises: Exercise[], measures: Measure[], stamp = Date.now()): LocalRecord[] {
  const out: LocalRecord[] = []
  const rec = <K extends Kind>(id: string, kind: K, data: DataOf[K]) =>
    out.push({ id, kind, updatedAt: stamp, deleted: false, data, dirty: true } as LocalRecord)

  for (const e of exercises) {
    rec(e.id, 'exercise', { name: e.name, primary: [...e.primary], secondary: [...e.secondary], createdAt: e.createdAt })
    for (const l of e.log) rec(l.id, 'load', { exerciseId: e.id, date: l.date, kg: l.kg, reps: l.reps })
  }
  for (const m of measures) {
    rec(m.id, 'measure', {
      name: m.name,
      x: m.x,
      y: m.y,
      ...(m.labelY !== undefined ? { labelY: m.labelY } : {}),
      createdAt: m.createdAt,
    })
    for (const l of m.log) rec(l.id, 'mentry', { measureId: m.id, date: l.date, value: l.value })
  }
  return out
}
