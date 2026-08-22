import { defineConfig } from 'vite'

import libraryConfig from './vite.config.js'

const { build: _libraryBuild, ...sharedConfig } = libraryConfig

export default defineConfig({
  ...sharedConfig,
  base: '/kindy-editor/',
  plugins: (sharedConfig.plugins || []).filter((plugin) => plugin?.name !== 'copy-dts'),
  build: {
    target: 'es2018',
    outDir: 'demo-dist',
    emptyOutDir: true,
    copyPublicDir: true,
    sourcemap: false,
  },
})
