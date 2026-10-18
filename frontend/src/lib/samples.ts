import { uid, type Exercise, type Measure } from './model'

/** Données d'exemple, datées en remontant depuis aujourd'hui. */
export function sampleData(): { exercises: Exercise[]; measures: Measure[] } {
  const now = new Date()
  const daysAgo = (d: number) => {
    const t = new Date(now)
    t.setDate(t.getDate() - d)
    return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`
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
      ex('Développé couché', ['pec-bas'], ['pec-haut', 'triceps', 'delt-ant'], [75, 77.5, 77.5, 80, 82.5, 82.5, 85], 5),
      ex('Développé incliné haltères', ['pec-haut'], ['delt-ant', 'triceps'], [26, 26, 28, 28, 30, 30], 8),
      ex('Écarté poulie vis-à-vis', ['pec-bas'], [], [15, 15, 17.5, 17.5, 20], 12),
      ex('Développé militaire', ['delt-ant'], ['delt-lat', 'triceps'], [45, 47.5, 47.5, 50, 52.5], 6),
      ex('Élévations latérales', ['delt-lat'], [], [10, 10, 12, 12, 12, 14], 12),
      ex('Oiseau à la machine', ['delt-post'], ['trapezes'], [35, 40, 40, 45], 12),
      ex('Curl barre EZ', ['biceps'], ['avantbras'], [30, 32.5, 32.5, 35, 35, 37.5], 8),
      ex('Curl marteau', ['avantbras'], ['biceps'], [14, 16, 16, 18], 10),
      ex('Barre au front', ['triceps'], [], [30, 32.5, 35, 35, 37.5], 8),
      ex('Extension poulie haute', ['triceps'], [], [25, 27.5, 30, 30], 12),
      ex('Tractions lestées', ['grand-dorsal'], ['biceps', 'delt-post'], [0, 5, 5, 7.5, 10, 12.5], 6),
      ex('Rowing barre', ['grand-dorsal'], ['trapezes', 'grand-rond', 'delt-post', 'biceps'], [60, 65, 65, 70, 72.5], 8),
      ex('Shrugs haltères', ['trapezes'], ['avantbras'], [30, 32, 34, 36], 12),
      ex('Soulevé de terre', ['lombaires', 'grand-fessier'], ['biceps-femoral', 'semi-tendineux', 'trapezes', 'avantbras'], [120, 130, 135, 140, 145, 150], 3),
      ex('Squat', ['droit-femoral', 'vaste-ext', 'vaste-int'], ['grand-fessier', 'adducteurs', 'lombaires'], [100, 105, 110, 110, 115, 120], 5),
      ex('Presse à cuisses', ['vaste-ext', 'vaste-int'], ['grand-fessier'], [180, 200, 200, 220], 10),
      ex('Leg curl assis', ['biceps-femoral', 'semi-tendineux'], ['gastrocnemien'], [45, 50, 50, 55], 10),
      ex('Hip thrust', ['grand-fessier'], ['biceps-femoral', 'semi-tendineux', 'moyen-fessier'], [100, 110, 120, 130, 140], 8),
      ex('Abducteurs machine', ['moyen-fessier'], [], [50, 55, 60], 15),
      ex('Mollets debout machine', ['gastrocnemien'], ['soleaire'], [80, 90, 90, 100, 100], 12),
      ex('Crunch poulie', ['grand-droit'], ['obliques'], [40, 45, 45, 50], 12),
    ],
    measures: [
      ms('Cou', 488, 405, [39, 39.5, 39.5, 40]),
      ms('Épaules', 262, 520, [118, 119, 120, 121.5]),
      ms('Poitrine', 420, 600, [104, 105, 105.5, 106.5, 107]),
      ms('Biceps droit', 268, 715, [37, 37.5, 38, 38, 38.5]),
      ms('Taille', 650, 880, [86, 85, 85, 84.5, 84]),
      ms('Avant-bras gauche', 805, 880, [30, 30.5, 31, 31]),
      ms('Cuisse gauche', 640, 1250, [60, 60.5, 61, 61.5, 62]),
      ms('Mollet gauche', 650, 1700, [38, 38.5, 38.5, 39]),
    ],
  }
}
