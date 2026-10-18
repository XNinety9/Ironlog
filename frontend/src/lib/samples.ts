import { t } from './i18n.svelte'
import { uid, type Exercise, type Measure } from './model'

/** Données d'exemple, datées en remontant depuis aujourd'hui, nommées dans la langue courante. */
export function sampleData(): { exercises: Exercise[]; measures: Measure[] } {
  const now = new Date()
  const daysAgo = (d: number) => {
    const x = new Date(now)
    x.setDate(x.getDate() - d)
    return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`
  }
  const created = (i: number) => new Date(now.getTime() - (1000 - i) * 1000).toISOString()

  let i = 0
  const ex = (name: string, primary: string[], secondary: string[], kgs: number[], reps: number): Exercise => ({
    id: uid(),
    name,
    primary,
    secondary,
    log: kgs.map((kg, k) => ({ id: uid(), date: daysAgo((kgs.length - 1 - k) * 14), kg, reps })),
    createdAt: created(i++),
  })
  // x, y : coordonnées dans la figure de face (geo.json).
  const ms = (name: string, x: number, y: number, vals: number[]): Measure => ({
    id: uid(),
    name,
    x,
    y,
    log: vals.map((value, k) => ({ id: uid(), date: daysAgo((vals.length - 1 - k) * 28), value })),
    createdAt: created(i++),
  })

  return {
    exercises: [
      ex(t('sample.bench'), ['pec-bas'], ['pec-haut', 'triceps', 'delt-ant'], [75, 77.5, 77.5, 80, 82.5, 82.5, 85], 5),
      ex(t('sample.inclineDb'), ['pec-haut'], ['delt-ant', 'triceps'], [26, 26, 28, 28, 30, 30], 8),
      ex(t('sample.flyCable'), ['pec-bas'], [], [15, 15, 17.5, 17.5, 20], 12),
      ex(t('sample.ohp'), ['delt-ant'], ['delt-lat', 'triceps'], [45, 47.5, 47.5, 50, 52.5], 6),
      ex(t('sample.lateralRaise'), ['delt-lat'], [], [10, 10, 12, 12, 12, 14], 12),
      ex(t('sample.reversePec'), ['delt-post'], ['trapezes'], [35, 40, 40, 45], 12),
      ex(t('sample.ezCurl'), ['biceps'], ['avantbras'], [30, 32.5, 32.5, 35, 35, 37.5], 8),
      ex(t('sample.hammer'), ['avantbras'], ['biceps'], [14, 16, 16, 18], 10),
      ex(t('sample.skull'), ['triceps'], [], [30, 32.5, 35, 35, 37.5], 8),
      ex(t('sample.pushdown'), ['triceps'], [], [25, 27.5, 30, 30], 12),
      ex(t('sample.weightedPullup'), ['grand-dorsal'], ['biceps', 'delt-post'], [0, 5, 5, 7.5, 10, 12.5], 6),
      ex(t('sample.row'), ['grand-dorsal'], ['trapezes', 'grand-rond', 'delt-post', 'biceps'], [60, 65, 65, 70, 72.5], 8),
      ex(t('sample.shrug'), ['trapezes'], ['avantbras'], [30, 32, 34, 36], 12),
      ex(t('sample.deadlift'), ['lombaires', 'grand-fessier'], ['biceps-femoral', 'semi-tendineux', 'trapezes', 'avantbras'], [120, 130, 135, 140, 145, 150], 3),
      ex(t('sample.squat'), ['droit-femoral', 'vaste-ext', 'vaste-int'], ['grand-fessier', 'adducteurs', 'lombaires'], [100, 105, 110, 110, 115, 120], 5),
      ex(t('sample.legPress'), ['vaste-ext', 'vaste-int'], ['grand-fessier'], [180, 200, 200, 220], 10),
      ex(t('sample.legCurl'), ['biceps-femoral', 'semi-tendineux'], ['gastrocnemien'], [45, 50, 50, 55], 10),
      ex(t('sample.hipThrust'), ['grand-fessier'], ['biceps-femoral', 'semi-tendineux', 'moyen-fessier'], [100, 110, 120, 130, 140], 8),
      ex(t('sample.abduction'), ['moyen-fessier'], [], [50, 55, 60], 15),
      ex(t('sample.calfRaise'), ['gastrocnemien'], ['soleaire'], [80, 90, 90, 100, 100], 12),
      ex(t('sample.cableCrunch'), ['grand-droit'], ['obliques'], [40, 45, 45, 50], 12),
    ],
    measures: [
      ms(t('sample.neck'), 488, 405, [39, 39.5, 39.5, 40]),
      ms(t('sample.shoulders'), 262, 520, [118, 119, 120, 121.5]),
      ms(t('sample.chest'), 420, 600, [104, 105, 105.5, 106.5, 107]),
      ms(t('sample.rightBiceps'), 268, 715, [37, 37.5, 38, 38, 38.5]),
      ms(t('sample.waist'), 650, 880, [86, 85, 85, 84.5, 84]),
      ms(t('sample.leftForearm'), 805, 880, [30, 30.5, 31, 31]),
      ms(t('sample.leftThigh'), 640, 1250, [60, 60.5, 61, 61.5, 62]),
      ms(t('sample.leftCalf'), 650, 1700, [38, 38.5, 38.5, 39]),
    ],
  }
}
