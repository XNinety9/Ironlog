import { prefs } from './prefs.svelte'

/**
 * Garde l'écran allumé pendant la séance (Screen Wake Lock API), si l'utilisateur l'a demandé.
 * Le navigateur relâche le verrou dès que la page est masquée : on le reprend à son retour.
 * Comme le service worker, l'API exige un contexte sécurisé (HTTPS ou localhost).
 */
class KeepAwake {
  readonly supported = typeof navigator !== 'undefined' && 'wakeLock' in navigator && globalThis.isSecureContext
  /** Le verrou est effectivement tenu (le navigateur peut le refuser, en mode économie d'énergie par exemple). */
  active = $state(false)
  #lock: WakeLockSentinel | null = null
  #pending = false

  get enabled(): boolean {
    return prefs.keepAwake
  }

  set enabled(v: boolean) {
    prefs.keepAwake = v
    void (v ? this.#acquire() : this.#release())
  }

  start(): () => void {
    const onVisible = () => {
      if (document.visibilityState === 'visible' && this.enabled) void this.#acquire()
    }
    document.addEventListener('visibilitychange', onVisible)
    onVisible()
    return () => document.removeEventListener('visibilitychange', onVisible)
  }

  async #acquire(): Promise<void> {
    if (!this.supported || this.#lock || this.#pending || document.visibilityState !== 'visible') return
    this.#pending = true
    try {
      const lock = await navigator.wakeLock.request('screen')
      // Désactivé pendant la demande : on rend le verrou aussitôt.
      if (!this.enabled) {
        await lock.release()
        return
      }
      this.#lock = lock
      this.active = true
      lock.addEventListener('release', () => {
        if (this.#lock === lock) this.#lock = null
        this.active = false
      })
    } catch (err) {
      console.warn('Wake lock refused', err)
      this.active = false
    } finally {
      this.#pending = false
    }
  }

  async #release(): Promise<void> {
    const lock = this.#lock
    this.#lock = null
    this.active = false
    await lock?.release().catch(() => {})
  }
}

export const keepAwake = new KeepAwake()
