import 'virtual:svg-icons-register'

import { createApp } from 'vue'
import KindyEditor from './index.vue'
import KindyMenuButton from './menus/button.vue'
import KindyDialog from './modal.vue'
import KindyTooltip from './tooltip.vue'

const useKindyEditor = {
  install: (app, options) => {
    app.provide('defaultOptions', options || {})
    app.component(KindyEditor.name || 'KindyEditor', KindyEditor)
  },
}

/**
 * Pure JavaScript Mount Helper to use KindyEditor in React, Next.js, Angular, Svelte, or Vanilla JS
 * @param {HTMLElement|string} container - Target DOM element or CSS selector
 * @param {Object} props - Editor props/options
 * @returns {{ unmount: () => void, app: import('vue').App }}
 */
const mountKindyEditor = (container, props = {}) => {
  const target =
    typeof container === 'string'
      ? document.querySelector(container)
      : container
  if (!target) {
    throw new Error('[kindy-editor] Target container element not found!')
  }
  const app = createApp(KindyEditor, props)
  app.mount(target)
  return {
    app,
    unmount: () => app.unmount(),
  }
}

export {
  KindyEditor as default,
  KindyDialog,
  KindyEditor,
  KindyMenuButton,
  KindyTooltip,
  mountKindyEditor,
  useKindyEditor,
}
