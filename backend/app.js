// @ts-check
import { createServer } from 'node:http'
import { LIMITS, ValidationError, parseSyncBody } from './validate.js'

/**
 * @typedef {ReturnType<typeof import('./db.js').openDb>} Db
 * @typedef {{ db: Db, version: string, devUser?: string, log?: (msg: string) => void }} Options
 */

class HttpError extends Error {
  /** @param {number} status @param {string} message */
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

/**
 * Identité de l'utilisateur. En production, le reverse proxy (Caddy + oauth2-proxy) l'authentifie
 * et transmet X-Auth-Request-User ; l'API ne doit donc être joignable qu'à travers lui.
 * @param {import('node:http').IncomingMessage} req
 * @param {string | undefined} devUser utilisateur fixe pour le développement local, sans SSO
 */
function userOf(req, devUser) {
  const h = req.headers['x-auth-request-user'] ?? req.headers['x-auth-request-email']
  const user = (Array.isArray(h) ? h[0] : h)?.trim()
  if (user) return user.slice(0, 200)
  if (devUser) return devUser
  throw new HttpError(401, 'Non authentifié.')
}

/** @param {import('node:http').IncomingMessage} req */
async function readJson(req) {
  const type = req.headers['content-type'] ?? ''
  if (!type.startsWith('application/json')) throw new HttpError(415, 'Content-Type application/json attendu.')
  const chunks = []
  let size = 0
  for await (const chunk of req) {
    size += chunk.length
    if (size > LIMITS.bodyBytes) throw new HttpError(413, 'Requête trop volumineuse.')
    chunks.push(chunk)
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'))
  } catch {
    throw new HttpError(400, 'JSON illisible.')
  }
}

/**
 * @param {import('node:http').ServerResponse} res
 * @param {number} status
 * @param {unknown} body
 */
function send(res, status, body) {
  const json = JSON.stringify(body)
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(json),
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  })
  res.end(json)
}

/** @param {Options} opts */
export function createApp({ db, version, devUser, log = console.log }) {
  return createServer(async (req, res) => {
    const url = new URL(req.url ?? '/', 'http://localhost')
    try {
      if (url.pathname === '/api/health' && req.method === 'GET') {
        return send(res, 200, { ok: true, version })
      }
      if (url.pathname === '/api/me' && req.method === 'GET') {
        return send(res, 200, { user: userOf(req, devUser) })
      }
      if (url.pathname === '/api/sync' && req.method === 'POST') {
        const user = userOf(req, devUser)
        const { cursor, changes } = parseSyncBody(await readJson(req))
        const result = db.sync(user, cursor, changes)
        if (result.applied) log(`sync ${user} : ${result.applied} modification(s) enregistrée(s), révision ${result.cursor}`)
        return send(res, 200, { cursor: result.cursor, changes: result.changes })
      }
      if (url.pathname.startsWith('/api/')) throw new HttpError(404, 'Route inconnue.')
      throw new HttpError(404, 'Introuvable.')
    } catch (err) {
      if (err instanceof HttpError) return send(res, err.status, { error: err.message })
      if (err instanceof ValidationError) return send(res, 400, { error: err.message })
      log(`erreur ${req.method} ${url.pathname} : ${err instanceof Error ? err.stack : err}`)
      return send(res, 500, { error: 'Erreur interne.' })
    }
  })
}
