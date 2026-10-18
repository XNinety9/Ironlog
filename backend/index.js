// @ts-check
import { mkdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { createApp } from './app.js'
import { openDb } from './db.js'

const PORT = Number(process.env.PORT ?? 3000)
const DATA_DIR = process.env.DATA_DIR ?? '/data'
// Développement local sans SSO : toutes les requêtes sont attribuées à cet utilisateur.
const DEV_USER = process.env.IRONLOG_DEV_USER || undefined

const version = process.env.IRONLOG_VERSION ?? readVersion()

function readVersion() {
  try {
    return JSON.parse(readFileSync(new URL('./version.json', import.meta.url), 'utf8')).version
  } catch {
    return 'dev'
  }
}

mkdirSync(DATA_DIR, { recursive: true })
const db = openDb(join(DATA_DIR, 'ironlog.db'))
const server = createApp({ db, version, devUser: DEV_USER })

server.listen(PORT, '0.0.0.0', () => {
  console.log(`ironlog-api ${version}: port ${PORT}, database ${join(DATA_DIR, 'ironlog.db')}${DEV_USER ? `, dev user “${DEV_USER}”` : ''}`)
})

// Arrêt propre (docker stop) : on termine les requêtes en cours puis on ferme la base.
function stop() {
  server.close(() => {
    db.close()
    process.exit(0)
  })
  setTimeout(() => process.exit(0), 5000).unref()
}
process.on('SIGTERM', stop)
process.on('SIGINT', stop)
