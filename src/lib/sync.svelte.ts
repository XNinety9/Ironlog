import { store } from './store.svelte'
import type { SyncRecord } from './records'

/**
 * - idle : à jour (ou en attente du prochain tour)
 * - syncing : échange en cours
 * - offline : pas de réseau, les modifications attendent
 * - auth : la session SSO a expiré, il faut se reconnecter
 * - unavailable : ce déploiement n'a pas de serveur de synchronisation (site statique seul)
 * - error : le serveur a répondu une erreur
 */
export type SyncState = 'starting' | 'idle' | 'syncing' | 'offline' | 'auth' | 'unavailable' | 'error'

const DEBOUNCE_MS = 800
const INTERVAL_MS = 60_000
const META_CURSOR = 'syncCursor'
const META_LAST = 'lastSync'

class Sync {
  state = $state<SyncState>('starting')
  /** Dernière synchronisation réussie (ms). */
  lastSync = $state<number | null>(null)
  error = $state('')

  #cursor = 0
  #timer: ReturnType<typeof setTimeout> | undefined
  #running = false
  #again = false

  async start(): Promise<void> {
    if (store.status !== 'ready') {
      // Sans stockage local, on ne peut pas garder de curseur ni de modifications en attente.
      this.state = 'unavailable'
      return
    }
    this.#cursor = (await store.getMeta<number>(META_CURSOR)) ?? 0
    this.lastSync = (await store.getMeta<number>(META_LAST)) ?? null

    store.onLocalChange = () => this.schedule(DEBOUNCE_MS)
    addEventListener('online', () => this.schedule(0))
    addEventListener('offline', () => (this.state = 'offline'))
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') this.schedule(0)
    })
    setInterval(() => {
      if (document.visibilityState === 'visible') this.schedule(0)
    }, INTERVAL_MS)

    await this.run()
  }

  schedule(ms: number): void {
    clearTimeout(this.#timer)
    this.#timer = setTimeout(() => void this.run(), ms)
  }

  async run(): Promise<void> {
    if (this.#running) {
      this.#again = true
      return
    }
    if (!navigator.onLine) {
      this.state = 'offline'
      return
    }
    this.#running = true
    this.state = 'syncing'
    try {
      const sent = store.pending()
      const res = await fetch('./api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cursor: this.#cursor, changes: sent }),
        credentials: 'same-origin',
        cache: 'no-store',
        // Une session expirée renvoie une redirection vers la page de connexion : on la détecte au lieu de la suivre.
        redirect: 'manual',
      })
      if (res.type === 'opaqueredirect' || res.status === 401) {
        this.state = 'auth'
        return
      }
      // Site servi sans API du tout (serveur statique) : la synchronisation n'existe pas ici.
      if (res.status === 404 || res.status === 405) {
        this.state = 'unavailable'
        return
      }
      // API arrêtée ou en redémarrage derrière le proxy : c'est une panne, pas une absence.
      if (res.status === 502 || res.status === 503 || res.status === 504) throw new Error('Serveur de synchronisation injoignable.')
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(body.error ?? `Le serveur a répondu ${res.status}.`)
      }
      const body = (await res.json()) as { cursor: number; changes: SyncRecord[] }
      await store.applySync(sent, body.changes)
      this.#cursor = body.cursor
      this.lastSync = Date.now()
      await Promise.all([store.setMeta(META_CURSOR, body.cursor), store.setMeta(META_LAST, this.lastSync)])
      this.error = ''
      this.state = 'idle'
      // Des modifications faites pendant l'échange partent au tour suivant.
      if (store.pendingCount > 0) this.#again = true
    } catch (err) {
      if (!navigator.onLine) this.state = 'offline'
      else {
        this.state = 'error'
        // fetch lève une TypeError quand la requête n'aboutit pas (serveur arrêté, DNS…).
        this.error = err instanceof TypeError ? 'Serveur injoignable.' : err instanceof Error ? err.message : String(err)
        console.error('Synchronisation impossible', err)
      }
    } finally {
      this.#running = false
      if (this.#again) {
        this.#again = false
        this.schedule(DEBOUNCE_MS)
      }
    }
  }
}

export const sync = new Sync()
