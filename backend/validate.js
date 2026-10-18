// @ts-check

/** @typedef {import('./db.js').SyncRecord} SyncRecord */

export const LIMITS = {
  bodyBytes: 5 * 1024 * 1024,
  changes: 10000,
  idLength: 100,
  textLength: 200,
  listLength: 50,
}

export class ValidationError extends Error {}

const DATE = /^\d{4}-\d{2}-\d{2}$/
const isStr = (/** @type {unknown} */ v, max = LIMITS.textLength) => typeof v === 'string' && v.length > 0 && v.length <= max
const isNum = (/** @type {unknown} */ v) => typeof v === 'number' && Number.isFinite(v)
const isStrList = (/** @type {unknown} */ v) =>
  Array.isArray(v) && v.length <= LIMITS.listLength && v.every((x) => isStr(x, LIMITS.idLength))
const isObj = (/** @type {unknown} */ v) => typeof v === 'object' && v !== null && !Array.isArray(v)

/** Champs attendus pour chaque type d'enregistrement : on refuse ce qui ne ressemble pas à des données Ironlog. */
const SHAPES = {
  exercise: (/** @type {any} */ d) => isStr(d.name) && isStrList(d.primary) && isStrList(d.secondary) && isStr(d.createdAt),
  load: (/** @type {any} */ d) =>
    isStr(d.exerciseId, LIMITS.idLength) && typeof d.date === 'string' && DATE.test(d.date) && isNum(d.kg) && isNum(d.reps),
  measure: (/** @type {any} */ d) =>
    isStr(d.name) && isNum(d.x) && isNum(d.y) && (d.labelY === undefined || isNum(d.labelY)) && isStr(d.createdAt),
  mentry: (/** @type {any} */ d) =>
    isStr(d.measureId, LIMITS.idLength) && typeof d.date === 'string' && DATE.test(d.date) && isNum(d.value),
}

/**
 * Valide le corps d'une requête de synchronisation.
 * @param {unknown} body
 * @returns {{ cursor: number, changes: SyncRecord[] }}
 */
export function parseSyncBody(body) {
  if (!isObj(body)) throw new ValidationError('JSON body expected.')
  const b = /** @type {Record<string, unknown>} */ (body)
  const cursor = b.cursor ?? 0
  if (!isNum(cursor) || /** @type {number} */ (cursor) < 0) throw new ValidationError('Invalid cursor.')
  const raw = b.changes ?? []
  if (!Array.isArray(raw)) throw new ValidationError('"changes" must be a list.')
  if (raw.length > LIMITS.changes) throw new ValidationError(`Too many changes at once (max ${LIMITS.changes}).`)

  const changes = raw.map((c, i) => {
    const where = `Change #${i + 1}`
    if (!isObj(c)) throw new ValidationError(`${where}: object expected.`)
    if (!isStr(c.id, LIMITS.idLength)) throw new ValidationError(`${where}: invalid id.`)
    // hasOwn et pas « in » : « toString » ou « constructor » ne doivent pas passer pour des types.
    if (typeof c.kind !== 'string' || !Object.hasOwn(SHAPES, c.kind)) throw new ValidationError(`${where}: unknown type.`)
    if (!isNum(c.updatedAt) || c.updatedAt <= 0) throw new ValidationError(`${where}: invalid modification date.`)
    const deleted = c.deleted === true
    // Un enregistrement supprimé n'a plus besoin de ses données : on n'en garde que la trace.
    const data = deleted ? {} : c.data
    if (!deleted && !(isObj(data) && SHAPES[/** @type {keyof typeof SHAPES} */ (c.kind)](data))) {
      throw new ValidationError(`${where} (${c.kind}): incomplete or invalid data.`)
    }
    return /** @type {SyncRecord} */ ({ id: c.id, kind: c.kind, updatedAt: Math.round(c.updatedAt), deleted, data })
  })
  return { cursor: Math.floor(/** @type {number} */ (cursor)), changes }
}
