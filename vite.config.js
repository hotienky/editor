import Vue from '@vitejs/plugin-vue'
import ReactivityTransform from '@vue-macros/reactivity-transform/vite'
import fs from 'node:fs'
import path from 'node:path'
import AutoImport from 'unplugin-auto-import/vite'
import { TDesignResolver } from 'unplugin-vue-components/resolvers'
import Components from 'unplugin-vue-components/vite'
import VueMacros from 'unplugin-vue-macros/vite'
import { defineConfig } from 'vite'
import { createSvgIconsPlugin } from 'vite-plugin-svg-icons'

import pkg from './package.json'
import copyright from './src/utils/copyright'

// Plugin: copy src/kindy-editor.d.ts → dist/kindy-editor.d.ts after build
const copyDtsPlugin = () => ({
  name: 'copy-dts',
  closeBundle() {
    const src = path.resolve(process.cwd(), 'src/kindy-editor.d.ts')
    const dest = path.resolve(process.cwd(), 'dist/kindy-editor.d.ts')
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, dest)
      console.info('✓ Copied kindy-editor.d.ts → dist/')
    }
  },
})

// Plugin configurations
const vuePlugins = {
  VueMacros: VueMacros({
    reactivityTransform: true,
    plugins: {
      vue: Vue(),
    },
  }),
  AutoImport: AutoImport({
    dirs: ['./src/composables'],
    imports: ['vue', '@vueuse/core'],
    resolvers: [TDesignResolver({ library: 'vue-next', esm: true })],
    dts: './types/imports.d.ts',
    dtsMode: 'overwrite',
  }),
  Components: Components({
    directoryAsNamespace: true,
    dirs: ['./src/components'],
    resolvers: [TDesignResolver({ library: 'vue-next', esm: true })],
    dts: './types/components.d.ts',
  }),
  SvgIcons: createSvgIconsPlugin({
    iconDirs: [`${process.cwd()}/src/assets/icons`],
    symbolId: 'kindy-icon-[name]',
    customDomId: 'kindy-icons',
  }),
}

// Build configuration
const buildConfig = {
  target: 'es2018',
  lib: {
    entry: `${process.cwd()}/src/components/index.js`,
    name: 'KindyEditor',
    fileName: 'kindy-editor',
  },
  outDir: 'dist',
  copyPublicDir: false,
  minify: 'esbuild',
  cssMinify: true,
  sourcemap: false,
  rollupOptions: {
    output: [
      // ESM — for Vue 3 / Vite / modern bundlers
      {
        banner: copyright,
        intro: `import './kindy-editor.css'`,
        format: 'es',
        entryFileNames: 'kindy-editor.js',
      },
      // CJS — for SSR / Nuxt / Node
      {
        banner: copyright,
        format: 'cjs',
        entryFileNames: 'kindy-editor.cjs',
        exports: 'named',
        globals: {
          vue: 'Vue',
        },
      },
      // IIFE — for CDN <script src> usage
      {
        banner: copyright,
        format: 'iife',
        name: 'KindyEditor',
        entryFileNames: 'kindy-editor.iife.js',
        exports: 'named',
        globals: {
          vue: 'Vue',
        },
      },
    ],
    external: [
      'vue',
      /^@vueuse\/.*/,
      /^@tiptap\/.*/,
      /^prosemirror-*/,
      /^nzh\/.*/,
      ...Object.keys(pkg.dependencies),
    ],
    onwarn(warning, warn) {
      if (warning.code === 'UNUSED_EXTERNAL_IMPORT') return
      warn(warning)
    },
  },
}


const cssConfig = {
  preprocessorOptions: {
    less: {
      modifyVars: { '@prefix': 'kindy' },
      javascriptEnabled: true,
      // 添加 Less 插件来排除特定类名
      plugins: [
        {
          install(less, pluginManager) {
            pluginManager.addPostProcessor({
              process(css) {
                return css.replace(/\.flex-center(\s|\{|,)[^}]*\}/g, '')
              },
            })
          },
        },
      ],
    },
  },
}

export default defineConfig({
  base: '/kindy-editor',
  plugins: [ReactivityTransform(), ...Object.values(vuePlugins), copyDtsPlugin()],
  css: cssConfig,
  build: buildConfig,
  esbuild: {
    drop: ['debugger'],
  },
  resolve: {
    alias: {
      '@': `${process.cwd()}/src`,
      '@umo/document': `${process.cwd()}/packages/document/src`,
      '@umo/layout': `${process.cwd()}/packages/layout/src`,
      '@umo/render': `${process.cwd()}/packages/render/src`,
      '@umo/editor': `${process.cwd()}/packages/editor/src`,
      '@umo/collaboration': `${process.cwd()}/packages/collaboration/src`,
    },
  },
})
