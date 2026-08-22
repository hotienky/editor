import { build } from 'vite'

// Library artifacts must resolve workers relative to the installed ESM file.
// The demo keeps its own `/kindy-editor/` base in `vite.demo.config.js`.
await build({ base: './' })
await import('./build-core.mjs')
