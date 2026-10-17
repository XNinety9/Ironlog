export interface ChartPoint {
  date: string
  value: number
  /** Ligne forte de l'infobulle (ex. « 85 kg × 5 »). Par défaut : la valeur et l'unité. */
  label?: string
  /** Ligne secondaire de l'infobulle. */
  sub?: string
}

/** 1RM estimé, formule d'Epley. Une série à 1 rep vaut sa charge. */
export const epley = (kg: number, reps: number): number => (reps <= 1 ? kg : kg * (1 + reps / 30))

/** Au-delà, l'estimation du 1RM devient peu fiable. */
export const RELIABLE_REPS = 12
