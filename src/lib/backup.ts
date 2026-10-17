import { today, type Exercise, type Measure } from './model'

export interface Backup {
  app: 'ironlog'
  format: 1
  exportedAt: string
  exercises: Exercise[]
  measures: Measure[]
}

export function makeBackup(exercises: Exercise[], measures: Measure[]): Backup {
  return { app: 'ironlog', format: 1, exportedAt: new Date().toISOString(), exercises, measures }
}

export const backupFileName = () => `ironlog-${today()}.json`

const DATE = /^\d{4}-\d{2}-\d{2}$/
const isStr = (v: unknown): v is string => typeof v === 'string'
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)
const isStrArr = (v: unknown): v is string[] => Array.isArray(v) && v.every(isStr)
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null

class BackupError extends Error {}

function check(cond: boolean, msg: string): asserts cond {
  if (!cond) throw new BackupError(msg)
}

function exercise(v: unknown, i: number): Exercise {
  const where = `exercice n° ${i + 1}`
  check(isObj(v), `L'${where} est illisible.`)
  check(isStr(v.id) && isStr(v.name) && isStrArr(v.primary) && isStrArr(v.secondary) && Array.isArray(v.log), `L'${where} est incomplet.`)
  const log = v.log.map((l, j) => {
    check(isObj(l) && isStr(l.id) && isStr(l.date) && DATE.test(l.date) && isNum(l.kg) && isNum(l.reps), `L'entrée ${j + 1} de « ${v.name} » est invalide.`)
    return { id: l.id, date: l.date, kg: l.kg, reps: l.reps }
  })
  log.sort((a, b) => a.date.localeCompare(b.date))
  return { id: v.id, name: v.name, primary: v.primary, secondary: v.secondary, log, createdAt: isStr(v.createdAt) ? v.createdAt : new Date().toISOString() }
}

function measure(v: unknown, i: number): Measure {
  const where = `La mensuration n° ${i + 1}`
  check(isObj(v), `${where} est illisible.`)
  check(isStr(v.id) && isStr(v.name) && isNum(v.x) && isNum(v.y) && Array.isArray(v.log), `${where} est incomplète.`)
  const log = v.log.map((l, j) => {
    check(isObj(l) && isStr(l.id) && isStr(l.date) && DATE.test(l.date) && isNum(l.value), `L'entrée ${j + 1} de « ${v.name} » est invalide.`)
    return { id: l.id, date: l.date, value: l.value }
  })
  log.sort((a, b) => a.date.localeCompare(b.date))
  return { id: v.id, name: v.name, x: v.x, y: v.y, log, createdAt: isStr(v.createdAt) ? v.createdAt : new Date().toISOString() }
}

/** Lit un fichier de sauvegarde. Lève une erreur au message lisible si le fichier n'en est pas un. */
export function parseBackup(text: string): Backup {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    throw new BackupError("Ce fichier n'est pas une sauvegarde Ironlog (JSON illisible).")
  }
  check(isObj(data) && data.app === 'ironlog', "Ce fichier n'est pas une sauvegarde Ironlog.")
  check(data.format === 1, 'Cette sauvegarde vient d’une version plus récente d’Ironlog.')
  check(Array.isArray(data.exercises) && Array.isArray(data.measures), 'La sauvegarde est incomplète.')
  return {
    app: 'ironlog',
    format: 1,
    exportedAt: isStr(data.exportedAt) ? data.exportedAt : '',
    exercises: data.exercises.map(exercise),
    measures: data.measures.map(measure),
  }
}

export const isBackupError = (e: unknown): e is Error => e instanceof BackupError
