export type LoadMetric = 'load' | 'e1rm'

const KEY = 'ironlog.loadMetric'

function read(): LoadMetric {
  try {
    return localStorage.getItem(KEY) === 'e1rm' ? 'e1rm' : 'load'
  } catch {
    return 'load'
  }
}

/** Préférences d'affichage, mémorisées sur l'appareil. */
class Prefs {
  #metric = $state<LoadMetric>(read())

  get metric(): LoadMetric {
    return this.#metric
  }

  set metric(m: LoadMetric) {
    this.#metric = m
    try {
      localStorage.setItem(KEY, m)
    } catch {
      // Stockage indisponible : la préférence vaut pour la session.
    }
  }
}

export const prefs = new Prefs()
