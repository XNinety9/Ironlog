import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { Exercise, Measure } from './model'
import { toRecords, type LocalRecord } from './records'

interface IronlogDB extends DBSchema {
  records: { key: string; value: LocalRecord }
  /** Curseur de synchronisation, date de dernière synchro… */
  meta: { key: string; value: unknown }
}

/** Version 1 : un objet par exercice ou mensuration, historique compris (avant la synchronisation). */
interface LegacyDB extends DBSchema {
  exercises: { key: string; value: Exercise }
  measures: { key: string; value: Measure }
}

let dbp: Promise<IDBPDatabase<IronlogDB>> | null = null

export function db(): Promise<IDBPDatabase<IronlogDB>> {
  dbp ??= openDB<IronlogDB>('ironlog', 2, {
    async upgrade(d, oldVersion, _newVersion, tx) {
      if (oldVersion >= 2) return
      d.createObjectStore('records', { keyPath: 'id' })
      d.createObjectStore('meta')
      if (oldVersion < 1) return
      // Migration v1 → v2 : les données existantes deviennent des enregistrements à envoyer au serveur.
      const legacy = tx as unknown as import('idb').IDBPTransaction<LegacyDB, ('exercises' | 'measures')[], 'versionchange'>
      const [exercises, measures] = await Promise.all([
        legacy.objectStore('exercises').getAll(),
        legacy.objectStore('measures').getAll(),
      ])
      const records = tx.objectStore('records')
      for (const r of toRecords(exercises, measures)) await records.put(r)
      const raw = d as unknown as IDBPDatabase<LegacyDB>
      raw.deleteObjectStore('exercises')
      raw.deleteObjectStore('measures')
    },
  })
  return dbp
}
