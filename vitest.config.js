import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      'y-websocket': resolve(__dirname, '__mocks__/y-websocket.js'),
      '@umo/document': resolve(__dirname, 'packages/document/src'),
      '@umo/layout': resolve(__dirname, 'packages/layout/src'),
      '@umo/render': resolve(__dirname, 'packages/render/src'),
      '@umo/editor': resolve(__dirname, 'packages/editor/src'),
      '@umo/collaboration': resolve(__dirname, 'packages/collaboration/src'),
      '@umo/storage': resolve(__dirname, 'packages/storage/src'),
      '@umo/io': resolve(__dirname, 'packages/io/src'),
      '@umo/plugin': resolve(__dirname, 'packages/plugin/src'),
      '@umo/ai': resolve(__dirname, 'packages/ai/src'),
      '@umo/react': resolve(__dirname, 'packages/react/src'),
      '@umo/vue': resolve(__dirname, 'packages/vue/src'),
      '@umo/editor-client': resolve(__dirname, 'packages/editor-client/src'),
    },
  },
  test: {
    globals: true,
    environment: 'happy-dom',
    include: ['packages/**/__tests__/**/*.test.js', 'src/**/__tests__/**/*.test.js'],
    coverage: {
      reporter: ['text', 'json', 'html'],
      include: ['packages/*/src/**/*.js'],
      exclude: ['**/node_modules/**', '**/__tests__/**'],
    },
  },
})
