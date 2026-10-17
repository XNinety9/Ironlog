import raw from './geo.json'
import type { View } from './muscles'

export interface FigureGeo {
  /** Boîte englobante du corps : x, y, largeur, hauteur. */
  bbox: [number, number, number, number]
  /** Hauteur de l'image source : les tracés potrace ont l'axe y inversé. */
  h: number
  sil: string
  line: string
  zones: Record<string, string>
}

export const GEO = raw as unknown as Record<View, FigureGeo>

export function viewBoxOf(view: View, pad = 12): string {
  const [x, y, w, h] = GEO[view].bbox
  return `${x - pad} ${y - pad} ${w + 2 * pad} ${h + 2 * pad}`
}
