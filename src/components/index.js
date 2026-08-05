import 'virtual:svg-icons-register'

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

export {
  KindyEditor as default,
  KindyDialog,
  KindyEditor,
  KindyMenuButton,
  KindyTooltip,
  useKindyEditor,
}
