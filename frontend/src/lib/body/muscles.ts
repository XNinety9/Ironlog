import { t } from '../i18n.svelte'
import type { Key } from '../i18n/fr'

export type View = 'front' | 'back'
export type Mode = 'simple' | 'detail'

export const GROUP_IDS = [
  'pectoraux',
  'epaules',
  'biceps',
  'triceps',
  'avantbras',
  'abdos',
  'dos',
  'quadriceps',
  'adducteurs',
  'fessiers',
  'ischios',
  'mollets',
] as const

export type GroupId = (typeof GROUP_IDS)[number]

export interface Zone {
  id: string
  g: GroupId
}

/** Muscles du mode détaillé. Les ids correspondent aux zones de geo.json ; les noms sont dans les dictionnaires. */
export const ZONES: Zone[] = [
  { id: 'pec-haut', g: 'pectoraux' },
  { id: 'pec-bas', g: 'pectoraux' },
  { id: 'delt-ant', g: 'epaules' },
  { id: 'delt-lat', g: 'epaules' },
  { id: 'delt-post', g: 'epaules' },
  { id: 'biceps', g: 'biceps' },
  { id: 'triceps', g: 'triceps' },
  { id: 'avantbras', g: 'avantbras' },
  { id: 'grand-droit', g: 'abdos' },
  { id: 'obliques', g: 'abdos' },
  { id: 'trapezes', g: 'dos' },
  { id: 'grand-rond', g: 'dos' },
  { id: 'grand-dorsal', g: 'dos' },
  { id: 'lombaires', g: 'dos' },
  { id: 'droit-femoral', g: 'quadriceps' },
  { id: 'vaste-ext', g: 'quadriceps' },
  { id: 'vaste-int', g: 'quadriceps' },
  { id: 'adducteurs', g: 'adducteurs' },
  { id: 'moyen-fessier', g: 'fessiers' },
  { id: 'grand-fessier', g: 'fessiers' },
  { id: 'biceps-femoral', g: 'ischios' },
  { id: 'semi-tendineux', g: 'ischios' },
  { id: 'gastrocnemien', g: 'mollets' },
  { id: 'soleaire', g: 'mollets' },
  { id: 'tibial', g: 'mollets' },
]

export const zoneById = new Map(ZONES.map((z) => [z.id, z]))

const isGroup = (k: string): k is GroupId => (GROUP_IDS as readonly string[]).includes(k)

export const groupName = (g: GroupId): string => t(`group.${g}` as Key)
export const zoneName = (id: string): string => t(`zone.${id}` as Key)

/** Clés sélectionnables dans un mode : groupes en simple, muscles en détaillé. */
export const keysFor = (mode: Mode): string[] => (mode === 'simple' ? [...GROUP_IDS] : ZONES.map((z) => z.id))

/** Nom lisible d'une clé (groupe ou muscle), dans la langue courante. */
export function nameOf(key: string): string {
  if (isGroup(key)) return groupName(key)
  return zoneName(key)
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
