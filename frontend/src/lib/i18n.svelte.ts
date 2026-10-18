import { en } from './i18n/en'
import { fr, type Key } from './i18n/fr'

export type Locale = 'fr' | 'en'

const dicts: Record<Locale, Record<Key, string>> = { fr, en }
const KEY = 'ironlog.locale'

/** Langue choisie par l'utilisateur, sinon celle du navigateur (français si fr*, anglais sinon). */
function detect(): Locale {
  try {
    const saved = localStorage.getItem(KEY)
    if (saved === 'fr' || saved === 'en') return saved
  } catch {
    // Stockage indisponible : on suit le navigateur.
  }
  return typeof navigator !== 'undefined' && navigator.language?.toLowerCase().startsWith('fr') ? 'fr' : 'en'
}

class I18n {
  locale = $state<Locale>(detect())

  set(locale: Locale): void {
    this.locale = locale
    try {
      localStorage.setItem(KEY, locale)
    } catch {
      // Sans stockage, le choix vaut pour la session.
    }
  }
}

export const i18n = new I18n()

/** Texte traduit. Lit la langue courante : appelé dans un template, il se met à jour au changement de langue. */
export function t(key: Key, params?: Record<string, string | number>): string {
  let s = dicts[i18n.locale][key]
  if (params) for (const [k, v] of Object.entries(params)) s = s.replaceAll(`{${k}}`, String(v))
  return s
}

/** Locale BCP 47 pour formater nombres et dates. */
export const bcp47 = (): string => (i18n.locale === 'fr' ? 'fr-FR' : 'en-US')
