import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { Exercise, Measure } from './model'

interface IronlogDB extends DBSchema {
  exercises: { key: string; value: Exercise }
  measures: { key: string; value: Measure }
}

export type StoreName = 'exercises' | 'measures'

let dbp: Promise<IDBPDatabase<IronlogDB>> | null = null

export function db(): Promise<IDBPDatabase<IronlogDB>> {
  dbp ??= openDB<IronlogDB>('ironlog', 1, {
    upgrade(d) {
      d.createObjectStore('exercises', { keyPath: 'id' })
      d.createObjectStore('measures', { keyPath: 'id' })
    },
  })
  return dbp
}
