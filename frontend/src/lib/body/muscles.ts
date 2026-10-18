export type View = 'front' | 'back'
export type Mode = 'simple' | 'detail'

export const GROUPS = {
  pectoraux: 'Pectoraux',
  epaules: 'Épaules',
  biceps: 'Biceps',
  triceps: 'Triceps',
  avantbras: 'Avant-bras',
  abdos: 'Abdominaux',
  dos: 'Dos',
  quadriceps: 'Quadriceps',
  adducteurs: 'Adducteurs',
  fessiers: 'Fessiers',
  ischios: 'Ischio-jambiers',
  mollets: 'Mollets',
} as const

export type GroupId = keyof typeof GROUPS

export interface Zone {
  id: string
  g: GroupId
  n: string
}

/** Muscles du mode détaillé. Les ids correspondent aux zones de geo.json. */
export const ZONES: Zone[] = [
  { id: 'pec-haut', g: 'pectoraux', n: 'Haut des pectoraux' },
  { id: 'pec-bas', g: 'pectoraux', n: 'Bas des pectoraux' },
  { id: 'delt-ant', g: 'epaules', n: 'Deltoïde antérieur' },
  { id: 'delt-lat', g: 'epaules', n: 'Deltoïde latéral' },
  { id: 'delt-post', g: 'epaules', n: 'Deltoïde postérieur' },
  { id: 'biceps', g: 'biceps', n: 'Biceps' },
  { id: 'triceps', g: 'triceps', n: 'Triceps' },
  { id: 'avantbras', g: 'avantbras', n: 'Avant-bras' },
  { id: 'grand-droit', g: 'abdos', n: 'Grand droit' },
  { id: 'obliques', g: 'abdos', n: 'Obliques et dentelés' },
  { id: 'trapezes', g: 'dos', n: 'Trapèzes' },
  { id: 'grand-rond', g: 'dos', n: 'Grand rond et infra-épineux' },
  { id: 'grand-dorsal', g: 'dos', n: 'Grand dorsal' },
  { id: 'lombaires', g: 'dos', n: 'Lombaires' },
  { id: 'droit-femoral', g: 'quadriceps', n: 'Droit fémoral' },
  { id: 'vaste-ext', g: 'quadriceps', n: 'Vaste externe' },
  { id: 'vaste-int', g: 'quadriceps', n: 'Vaste interne' },
  { id: 'adducteurs', g: 'adducteurs', n: 'Adducteurs' },
  { id: 'moyen-fessier', g: 'fessiers', n: 'Moyen fessier' },
  { id: 'grand-fessier', g: 'fessiers', n: 'Grand fessier' },
  { id: 'biceps-femoral', g: 'ischios', n: 'Biceps fémoral' },
  { id: 'semi-tendineux', g: 'ischios', n: 'Semi-tendineux' },
  { id: 'gastrocnemien', g: 'mollets', n: 'Gastrocnémiens' },
  { id: 'soleaire', g: 'mollets', n: 'Soléaire' },
  { id: 'tibial', g: 'mollets', n: 'Jambier antérieur' },
]

export const zoneById = new Map(ZONES.map((z) => [z.id, z]))

const isGroup = (k: string): k is GroupId => k in GROUPS

/** Clés sélectionnables dans un mode : groupes en simple, muscles en détaillé. */
export const keysFor = (mode: Mode): string[] =>
  mode === 'simple' ? Object.keys(GROUPS) : ZONES.map((z) => z.id)

/** Nom lisible d'une clé (groupe ou muscle). */
export function nameOf(key: string): string {
  if (isGroup(key)) return GROUPS[key]
  return zoneById.get(key)?.n ?? key
}

/** Groupe d'une clé : elle-même si c'est un groupe, sinon le groupe du muscle. */
export function groupOf(key: string): GroupId | undefined {
  return isGroup(key) ? key : zoneById.get(key)?.g
}

/**
 * Ids rattachés à une clé sélectionnée :
 * en simple, le groupe et tous ses muscles ; en détaillé, le muscle et son groupe
 * (un exercice rattaché au groupe entier concerne aussi chacun de ses muscles).
 */
export function idsFor(key: string, mode: Mode): string[] {
  if (mode === 'simple') return [key, ...ZONES.filter((z) => z.g === key).map((z) => z.id)]
  const g = groupOf(key)
  return g ? [key, g] : [key]
}

/** Convertit une sélection quand on change de mode. */
export function convertKey(key: string, to: Mode): string | null {
  if (to === 'simple') return groupOf(key) ?? null
  return isGroup(key) ? (ZONES.find((z) => z.g === key)?.id ?? null) : key
}
