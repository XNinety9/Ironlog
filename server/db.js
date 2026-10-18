// @ts-check
import { DatabaseSync } from 'node:sqlite'

/**
 * @typedef {'exercise' | 'load' | 'measure' | 'mentry'} Kind
 * @typedef {{ id: string, kind: Kind, updatedAt: number, deleted: boolean, data: Record<string, unknown> }} SyncRecord
 */

/**
 * Base SQLite. Une ligne par enregistrement et par utilisateur ; `rev` croît à chaque écriture
 * et sert de curseur : un appareil demande « tout ce qui a changé depuis la révision N ».
 * @param {string} path chemin du fichier, ou ':memory:' pour les tests
 */
export function openDb(path) {
  const db = new DatabaseSync(path)
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA synchronous = NORMAL;
    PRAGMA busy_timeout = 5000;

    CREATE TABLE IF NOT EXISTS records (
      user       TEXT    NOT NULL,
      id         TEXT    NOT NULL,
      kind       TEXT    NOT NULL,
      data       TEXT    NOT NULL,
      updated_at INTEGER NOT NULL,
      deleted    INTEGER NOT NULL DEFAULT 0,
      rev        INTEGER NOT NULL,
      PRIMARY KEY (user, id)
    );
    CREATE INDEX IF NOT EXISTS records_by_rev ON records (user, rev);

    CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value INTEGER NOT NULL);
    INSERT OR IGNORE INTO meta (key, value) VALUES ('rev', 0);
  `)

  const getRev = db.prepare(`SELECT value FROM meta WHERE key = 'rev'`)
  const setRev = db.prepare(`UPDATE meta SET value = ? WHERE key = 'rev'`)
  const getOne = db.prepare(`SELECT updated_at FROM records WHERE user = ? AND id = ?`)
  const upsert = db.prepare(`
    INSERT INTO records (user, id, kind, data, updated_at, deleted, rev) VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT (user, id) DO UPDATE SET
      kind = excluded.kind, data = excluded.data, updated_at = excluded.updated_at,
      deleted = excluded.deleted, rev = excluded.rev
  `)
  const since = db.prepare(`
    SELECT id, kind, data, updated_at, deleted FROM records WHERE user = ? AND rev > ? ORDER BY rev
  `)

  return {
    /**
     * Applique les modifications d'un appareil, puis renvoie tout ce qui a changé depuis son curseur.
     * Conflit : la modification la plus récente (updatedAt) l'emporte, quel que soit l'ordre d'arrivée.
     * @param {string} user
     * @param {number} cursor dernière révision vue par l'appareil
     * @param {SyncRecord[]} changes
     * @returns {{ cursor: number, changes: SyncRecord[], applied: number }}
     */
    sync(user, cursor, changes) {
      let rev = Number(/** @type {{ value: number }} */ (getRev.get()).value)
      let applied = 0
      db.exec('BEGIN IMMEDIATE')
      try {
        for (const c of changes) {
          const existing = /** @type {{ updated_at: number } | undefined} */ (getOne.get(user, c.id))
          if (existing && c.updatedAt < Number(existing.updated_at)) continue
          rev += 1
          upsert.run(user, c.id, c.kind, JSON.stringify(c.data), c.updatedAt, c.deleted ? 1 : 0, rev)
          applied += 1
        }
        setRev.run(rev)
        db.exec('COMMIT')
      } catch (err) {
        db.exec('ROLLBACK')
        throw err
      }
      // Curseur venu d'une base plus récente (restauration, réinitialisation) : on renvoie tout.
      const from = cursor > rev ? 0 : cursor
      const rows = /** @type {{ id: string, kind: Kind, data: string, updated_at: number, deleted: number }[]} */ (
        since.all(user, from)
      )
      return {
        cursor: rev,
        applied,
        changes: rows.map((r) => ({
          id: r.id,
          kind: r.kind,
          updatedAt: Number(r.updated_at),
          deleted: r.deleted === 1,
          data: JSON.parse(r.data),
        })),
      }
    },

    close() {
      db.close()
    },
  }
}
