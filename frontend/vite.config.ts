import { svelte } from '@sveltejs/vite-plugin-svelte'
import { createHash } from 'node:crypto'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, type Plugin } from 'vite'

// Chemins relatifs à ce fichier : le build marche qu'on le lance depuis frontend/ ou depuis la racine du dépôt.
const here = (p: string) => fileURLToPath(new URL(p, import.meta.url))

function listFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f)
    return statSync(p).isDirectory() ? listFiles(p) : [p]
  })
}

/**
 * Génère sw.js : le service worker reçoit la liste de tous les fichiers du build à mettre en cache,
 * et une version dérivée de leur contenu (une nouvelle version n'apparaît que si quelque chose change).
 */
function serviceWorker(): Plugin {
  return {
    name: 'ironlog-sw',
    apply: 'build',
    generateBundle(_, bundle) {
      const hash = createHash('sha256')
      const built = Object.keys(bundle).filter((f) => !f.endsWith('.map'))
      for (const f of built.sort()) {
        const item = bundle[f]
        hash.update(f)
        hash.update(item.type === 'chunk' ? item.code : item.source)
      }
      const pubDir = here('./public')
      const pub = listFiles(pubDir).map((p) => relative(pubDir, p).split('\\').join('/'))
      for (const f of pub.sort()) {
        hash.update(f)
        hash.update(readFileSync(join(pubDir, f)))
      }
      const assets = ['./', ...[...built, ...pub].filter((f) => f !== 'index.html').map((f) => './' + f)]
      const source =
        `const VERSION = ${JSON.stringify(hash.digest('hex').slice(0, 12))}\n` +
        `const ASSETS = ${JSON.stringify(assets)}\n\n` +
        readFileSync(here('./sw/sw.js'), 'utf8')
      this.emitFile({ type: 'asset', fileName: 'sw.js', source })
    },
  }
}

// La version de l'app est portée par le package.json racine (front, back et tags de release).
const pkg = JSON.parse(readFileSync(here('../package.json'), 'utf8')) as { version: string }

// https://vite.dev/config/
export default defineConfig({
  // Version affichée dans l'app : celle de package.json, la même que le tag de release.
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  // Chemins relatifs : l'app fonctionne quel que soit le sous-dossier où elle est hébergée.
  base: './',
  plugins: [svelte(), serviceWorker()],
  server: {
    // Accessible depuis le téléphone sur le réseau local pendant le dev.
    host: true,
    // API de synchronisation lancée à part : npm run dev:api
    proxy: { '/api': 'http://localhost:3000' },
  },
})
