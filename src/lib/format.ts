export const fmt = (v: number): string => v.toLocaleString('fr-FR', { maximumFractionDigits: 1 })

/** Écart signé : « +2,5 », « −1 », « ±0 ». */
export const signed = (v: number): string => (v > 0 ? '+' : v < 0 ? '−' : '±') + fmt(Math.abs(v))

export const fdate = (d: string): string =>
  new Date(d + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: '2-digit' })

export const weeksBetween = (a: string, b: string): number =>
  Math.round((new Date(b + 'T12:00:00').getTime() - new Date(a + 'T12:00:00').getTime()) / 6048e5)

export const trunc = (s: string, n: number): string => (s.length > n ? s.slice(0, n - 1) + '…' : s)

/** Lit un nombre saisi au clavier français (« 82,5 ») ou anglais (« 82.5 »). */
export function parseNum(s: string): number {
  const v = parseFloat(s.replace(',', '.').trim())
  return Number.isFinite(v) ? v : NaN
}
