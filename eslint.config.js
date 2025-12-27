import { readFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

import { FlatCompat } from '@eslint/eslintrc'
import eslintJS from '@eslint/js'
import eslintConfigPrettier from 'eslint-config-prettier'
import eslintPluginSimpleImportSort from 'eslint-plugin-simple-import-sort'
import eslintPluginUnusedImports from 'eslint-plugin-unused-imports'
import pluginVue from 'eslint-plugin-vue'
import globals from 'globals'
import vueParser from 'vue-eslint-parser'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const compat = new FlatCompat({
  baseDirectory: __dirname,
})

function createAutoImportedGlobals() {
  // Read the content of the files synchronously
  try {
    const componentsContent = readFileSync('./types/components.d.ts', 'utf8')
    const importsContent = readFileSync('./types/imports.d.ts', 'utf8')

    // Extract keys from GlobalComponents in components.d.ts
    const globalComponentsMatch = componentsContent.match(
      /GlobalComponents\s*{([^}]*)}/s,
    )
    const globalComponentKeys = globalComponentsMatch
      ? globalComponentsMatch[1]
          .split('\n')
          .map((line) => line.trim().split(':')[0])
          .filter(Boolean)
      : []

    // Extract constants and exports in imports.d.ts
    const globalDeclarationsMatch = importsContent.match(
      /declare global\s*{([^}]*)}/s,
    )
    const globalDeclarationKeys = globalDeclarationsMatch
      ? globalDeclarationsMatch[1]
          .split('\n')
          .map((line) => line.trim().split(':')[0].replace('const ', ''))
          .filter(Boolean)
      : []

    return [...globalComponentKeys, ...globalDeclarationKeys].map((value) => [
      value,
      'readonly',
    ])
  } catch (error) {
    // If the files don't exist, return an empty array
    return []
  }
}

export default [
  eslintJS.configs.recommended,
  ...compat.extends('plugin:prettier/recommended'),
  {
    ignores: ['./dist/**', './node_modules/**', './*.d.ts'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        ...Object.fromEntries(createAutoImportedGlobals()),
      },
    },
    rules: {
      'prefer-destructuring': 'error',
      curly: 'error',
      eqeqeq: 'error',
      'prefer-const': [
        'error',
        {
          destructuring: 'all',
        },
      ],
      'object-shorthand': 'error',
      'prefer-template': 'warn',
      'no-undef': 'off',
      'no-unused-vars': 'off',
      'no-empty': 'off',
      'spaced-comment': ['error', 'always'],
    },
  },
  ...pluginVue.configs['flat/recommended'],
  {
    plugins: {
      'simple-import-sort': eslintPluginSimpleImportSort,
      'unused-imports': eslintPluginUnusedImports,
    },
    languageOptions: {
      parserOptions: {
        ecmaVersion: 2024,
        extraFileExtensions: ['.vue'],
        sourceType: 'module',
      },
    },
    rules: {
      'simple-import-sort/exports': 'error',
      'simple-import-sort/imports': 'error',
      'unused-imports/no-unused-imports': 'error',
      'vue/multi-word-component-names': 'off',
      'vue/no-v-html': 'off',
      'vue/no-v-text-v-html-on-component': 'off',
    },
  },
  {
    files: ['**/*.vue'],
    languageOptions: {
      parser: vueParser,
      parserOptions: {
        ecmaVersion: 2024,
        extraFileExtensions: ['.vue'],
        sourceType: 'module',
      },
    },
  },
  eslintConfigPrettier,
]
