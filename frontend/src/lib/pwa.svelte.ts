/**
 * Enregistrement du service worker (build de production uniquement) et signalement des mises à jour.
 * Un service worker exige un contexte sécurisé : HTTPS, ou localhost.
 */
class Pwa {
  /** Une nouvelle version est installée et attend l'accord de l'utilisateur. */
  updateReady = $state(false)
  #waiting: ServiceWorker | null = null

  async register(): Promise<void> {
    if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return
    try {
      const reg = await navigator.serviceWorker.register('./sw.js')
      const track = (w: ServiceWorker | null) => {
        if (!w) return
        const check = () => {
          // S'il n'y a pas encore de contrôleur, c'est la première installation, pas une mise à jour.
          if (w.state === 'installed' && navigator.serviceWorker.controller) {
            this.#waiting = w
            this.updateReady = true
          }
        }
        check()
        w.addEventListener('statechange', check)
      }
      track(reg.waiting)
      reg.addEventListener('updatefound', () => track(reg.installing))
      let reloading = false
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (reloading) return
        reloading = true
        location.reload()
      })
    } catch (err) {
      console.error('Service worker not registered', err)
    }
  }

  applyUpdate(): void {
    this.#waiting?.postMessage('SKIP_WAITING')
  }
}

export const pwa = new Pwa()

/** Demande au navigateur de ne pas effacer les données pour faire de la place. */
export async function requestPersistence(): Promise<void> {
  try {
    if (navigator.storage?.persist && !(await navigator.storage.persisted())) await navigator.storage.persist()
  } catch {
    // Non supporté : sans conséquence.
  }
}
