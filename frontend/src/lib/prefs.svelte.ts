export type LoadMetric = 'load' | 'e1rm'

const KEYS = {
  metric: 'ironlog.loadMetric',
  samplesHidden: 'ironlog.samplesHidden',
  keepAwake: 'ironlog.keepAwake',
}

function read(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function write(key: string, value: string): void {
  try {
    localStorage.setItem(key, value)
  } catch {
    // Stockage indisponible : la préférence vaut pour la session.
  }
}

/** Préférences d'affichage, mémorisées sur l'appareil. */
class Prefs {
  #metric = $state<LoadMetric>(read(KEYS.metric) === 'e1rm' ? 'e1rm' : 'load')
  #samplesHidden = $state(read(KEYS.samplesHidden) === '1')
  #keepAwake = $state(read(KEYS.keepAwake) === '1')

  get metric(): LoadMetric {
    return this.#metric
  }

  set metric(m: LoadMetric) {
    this.#metric = m
    write(KEYS.metric, m)
  }

  /** Le message proposant de charger des exemples a été masqué. */
  get samplesHidden(): boolean {
    return this.#samplesHidden
  }

  set samplesHidden(v: boolean) {
    this.#samplesHidden = v
    write(KEYS.samplesHidden, v ? '1' : '0')
  }

  /** Empêcher l'écran de se mettre en veille quand l'app est affichée. */
  get keepAwake(): boolean {
    return this.#keepAwake
  }

  set keepAwake(v: boolean) {
    this.#keepAwake = v
    write(KEYS.keepAwake, v ? '1' : '0')
  }
}

export const prefs = new Prefs()
