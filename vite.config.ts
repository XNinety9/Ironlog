import { svelte } from '@sveltejs/vite-plugin-svelte'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [svelte()],
  // Accessible depuis le téléphone sur le réseau local pendant le dev.
  server: { host: true },
})
