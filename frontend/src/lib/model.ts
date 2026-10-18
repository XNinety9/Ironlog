import { idsFor, type Mode } from './body/muscles'

/** Date locale au format AAAA-MM-JJ. */
export type IsoDate = string

export interface LoadEntry {
  id: string
  date: IsoDate
  kg: number
  reps: number
}

export interface Exercise {
  id: string
  name: string
  /** Muscles ou groupes travaillés en principal. */
  primary: string[]
  /** Muscles ou groupes travaillés en secondaire. */
  secondary: string[]
  /** Entrées triées par date croissante. */
  log: LoadEntry[]
  createdAt: string
}

export interface MeasureEntry {
  id: string
  date: IsoDate
  value: number
}

export interface Measure {
  id: string
  name: string
  /** Position du point dans le repère de la figure de face (geo.json). */
  x: number
  y: number
  /** Hauteur voulue du centre de l'étiquette, dans le même repère. Absente : alignée sur le point. */
  labelY?: number
  /** Entrées triées par date croissante. */
  log: MeasureEntry[]
  createdAt: string
}

export type Role = 'p' | 's'

// crypto.randomUUID n'existe qu'en contexte sécurisé : le téléphone en HTTP sur le réseau local n'y a pas droit.
export const uid = (): string =>
  globalThis.crypto?.randomUUID?.() ?? Date.now().toString(36) + Math.random().toString(36).slice(2, 10)

export function today(): IsoDate {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Insère une entrée en gardant le journal trié par date (à date égale, la plus récente saisie en dernier). */
export function insertByDate<T extends { date: IsoDate }>(log: T[], entry: T): void {
  let i = log.length
  while (i > 0 && log[i - 1].date > entry.date) i--
  log.splice(i, 0, entry)
}

/** Exercices qui concernent une clé sélectionnée, principaux d'abord. */
export function exercisesFor(list: Exercise[], key: string, mode: Mode): { ex: Exercise; role: Role }[] {
  const ids = new Set(idsFor(key, mode))
  const out: { ex: Exercise; role: Role }[] = []
  for (const ex of list) {
    if (ex.primary.some((i) => ids.has(i))) out.push({ ex, role: 'p' })
    else if (ex.secondary.some((i) => ids.has(i))) out.push({ ex, role: 's' })
  }
  return out.sort((a, b) => (a.role === b.role ? a.ex.name.localeCompare(b.ex.name, 'fr') : a.role === 'p' ? -1 : 1))
}
