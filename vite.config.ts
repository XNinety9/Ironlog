import { svelte } from '@sveltejs/vite-plugin-svelte'
import { createHash } from 'node:crypto'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { defineConfig, type Plugin } from 'vite'

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
      const pub = listFiles('public').map((p) => relative('public', p).split('\\').join('/'))
      for (const f of pub.sort()) {
        hash.update(f)
        hash.update(readFileSync(join('public', f)))
      }
      const assets = ['./', ...[...built, ...pub].filter((f) => f !== 'index.html').map((f) => './' + f)]
      const source =
        `const VERSION = ${JSON.stringify(hash.digest('hex').slice(0, 12))}\n` +
        `const ASSETS = ${JSON.stringify(assets)}\n\n` +
        readFileSync('sw/sw.js', 'utf8')
      this.emitFile({ type: 'asset', fileName: 'sw.js', source })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  // Chemins relatifs : l'app fonctionne quel que soit le sous-dossier où elle est hébergée.
  base: './',
  plugins: [svelte(), serviceWorker()],
  // Accessible depuis le téléphone sur le réseau local pendant le dev.
  server: { host: true },
})
