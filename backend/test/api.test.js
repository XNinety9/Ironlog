// @ts-check
import assert from 'node:assert/strict'
import { after, before, describe, it } from 'node:test'
import { createApp } from '../app.js'
import { openDb } from '../db.js'

/** @type {ReturnType<typeof openDb>} */
let db
/** @type {import('node:http').Server} */
let server
let base = ''

function startWith(devUser) {
  db = openDb(':memory:')
  server = createApp({ db, version: 'test', devUser, log: () => {} })
  return new Promise((resolve) =>
    server.listen(0, '127.0.0.1', () => {
      const addr = /** @type {import('node:net').AddressInfo} */ (server.address())
      base = `http://127.0.0.1:${addr.port}`
      resolve(undefined)
    }),
  )
}

function stop() {
  return new Promise((resolve) => server.close(() => (db.close(), resolve(undefined))))
}

/** @param {string} user @param {unknown} body */
async function sync(user, body) {
  const res = await fetch(`${base}/api/sync`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Auth-Request-User': user },
    body: JSON.stringify(body),
  })
  return { status: res.status, body: await res.json() }
}

const exercise = (id, updatedAt, name = 'Squat') => ({
  id,
  kind: 'exercise',
  updatedAt,
  data: { name, primary: ['droit-femoral'], secondary: [], createdAt: '2026-10-18T10:00:00.000Z' },
})
const load = (id, updatedAt, exerciseId, kg = 100) => ({
  id,
  kind: 'load',
  updatedAt,
  data: { exerciseId, date: '2026-10-18', kg, reps: 5 },
})

describe('API Ironlog (SSO)', () => {
  before(() => startWith(undefined))
  after(stop)

  it('répond à la sonde de santé sans authentification', async () => {
    const res = await fetch(`${base}/api/health`)
    assert.equal(res.status, 200)
    assert.deepEqual(await res.json(), { ok: true, version: 'test' })
  })

  it('refuse la synchronisation sans utilisateur', async () => {
    const res = await fetch(`${base}/api/sync`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
    assert.equal(res.status, 401)
  })

  it('renvoie l’utilisateur transmis par le proxy', async () => {
    const res = await fetch(`${base}/api/me`, { headers: { 'X-Auth-Request-User': 'pierre' } })
    assert.deepEqual(await res.json(), { user: 'pierre' })
  })

  it('transmet les données d’un appareil à l’autre', async () => {
    const pc = await sync('alice', { cursor: 0, changes: [exercise('e1', 1000), load('l1', 1000, 'e1')] })
    assert.equal(pc.status, 200)
    assert.equal(pc.body.cursor, 2)

    const phone = await sync('alice', { cursor: 0, changes: [] })
    assert.deepEqual(phone.body.changes.map((c) => c.id).sort(), ['e1', 'l1'])
    assert.equal(phone.body.changes.find((c) => c.id === 'l1').data.kg, 100)

    // Plus rien de neuf pour un appareil à jour.
    const again = await sync('alice', { cursor: phone.body.cursor, changes: [] })
    assert.deepEqual(again.body.changes, [])
  })

  it('garde la modification la plus récente, quel que soit l’ordre d’arrivée', async () => {
    await sync('bob', { cursor: 0, changes: [exercise('e1', 2000, 'Récent')] })
    // Un appareil resté hors ligne envoie une version plus ancienne après coup : elle est ignorée.
    await sync('bob', { cursor: 0, changes: [exercise('e1', 1000, 'Ancien')] })
    const res = await sync('bob', { cursor: 0, changes: [] })
    assert.equal(res.body.changes.find((c) => c.id === 'e1').data.name, 'Récent')
  })

  it('propage les suppressions', async () => {
    const first = await sync('carol', { cursor: 0, changes: [load('l1', 1000, 'e1')] })
    await sync('carol', { cursor: first.body.cursor, changes: [{ id: 'l1', kind: 'load', updatedAt: 2000, deleted: true }] })
    const other = await sync('carol', { cursor: first.body.cursor, changes: [] })
    assert.equal(other.body.changes.length, 1)
    assert.equal(other.body.changes[0].deleted, true)
  })

  it('isole les données de chaque utilisateur', async () => {
    await sync('dave', { cursor: 0, changes: [exercise('secret', 1000)] })
    const res = await sync('eve', { cursor: 0, changes: [] })
    assert.ok(!res.body.changes.some((c) => c.id === 'secret'))
  })

  it('renvoie tout si le curseur vient d’une base plus récente', async () => {
    await sync('frank', { cursor: 0, changes: [exercise('e1', 1000)] })
    const res = await sync('frank', { cursor: 999999, changes: [] })
    assert.deepEqual(res.body.changes.map((c) => c.id), ['e1'])
  })

  it('rejette les données invalides sans rien enregistrer', async () => {
    const bad = await sync('gina', { cursor: 0, changes: [exercise('ok', 1000), { id: 'x', kind: 'load', updatedAt: 1, data: { kg: 'lourd' } }] })
    assert.equal(bad.status, 400)
    const res = await sync('gina', { cursor: 0, changes: [] })
    assert.deepEqual(res.body.changes, [])
  })

  it('accepte un objectif sur un exercice et refuse un objectif invalide', async () => {
    const withGoal = (id, goal) => {
      const e = exercise(id, 1000)
      return { ...e, data: { ...e.data, goal } }
    }
    const ok = await sync('julia', { cursor: 0, changes: [withGoal('e1', { kg: 100, reps: 5 })] })
    assert.equal(ok.status, 200)
    const res = await sync('julia', { cursor: 0, changes: [] })
    assert.deepEqual(res.body.changes[0].data.goal, { kg: 100, reps: 5 })

    const bad = await sync('julia', { cursor: 0, changes: [withGoal('e2', { kg: 'beaucoup' })] })
    assert.equal(bad.status, 400)
  })

  it('rejette les types qui ne sont pas des enregistrements Ironlog', async () => {
    for (const kind of ['toString', 'constructor', 'admin']) {
      const res = await sync('hugo', { cursor: 0, changes: [{ id: 'x', kind, updatedAt: 1, data: {} }] })
      assert.equal(res.status, 400, kind)
    }
  })

  it('rejette un corps qui n’est pas du JSON', async () => {
    const res = await fetch(`${base}/api/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Auth-Request-User': 'ivan' },
      body: '{pas du json',
    })
    assert.equal(res.status, 400)
  })
})

describe('API Ironlog (développement local)', () => {
  before(() => startWith('dev'))
  after(stop)

  it('attribue les requêtes sans en-tête à l’utilisateur de dev', async () => {
    const res = await fetch(`${base}/api/me`)
    assert.deepEqual(await res.json(), { user: 'dev' })
  })
})
