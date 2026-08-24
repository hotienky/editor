import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      'y-websocket': resolve(__dirname, '__mocks__/y-websocket.js'),
      '@kindy/document': resolve(__dirname, 'packages/document/src'),
      '@kindy/layout': resolve(__dirname, 'packages/layout/src'),
      '@kindy/render': resolve(__dirname, 'packages/render/src'),
      '@kindy/editor': resolve(__dirname, 'packages/editor/src'),
      '@kindy/collaboration': resolve(__dirname, 'packages/collaboration/src'),
      '@kindy/storage': resolve(__dirname, 'packages/storage/src'),
      '@kindy/io': resolve(__dirname, 'packages/io/src'),
      '@kindy/plugin': resolve(__dirname, 'packages/plugin/src'),
      '@kindy/ai': resolve(__dirname, 'packages/ai/src'),
      '@kindy/react': resolve(__dirname, 'packages/react/src'),
      '@kindy/vue': resolve(__dirname, 'packages/vue/src'),
      '@kindy/editor-client': resolve(__dirname, 'packages/editor-client/src'),
    },
  },
  test: {
    globals: true,
    environment: 'happy-dom',
    include: ['packages/**/__tests__/**/*.test.{js,ts}', 'src/**/__tests__/**/*.test.{js,ts}'],
    coverage: {
      reporter: ['text', 'json', 'html'],
      include: ['packages/*/src/**/*.js'],
      exclude: ['**/node_modules/**', '**/__tests__/**'],
    },
  },
})
