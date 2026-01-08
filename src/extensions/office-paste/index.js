import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'

import { transformRemoveBookmarks } from './transform/bookmark'
import { transformExcel } from './transform/excel'
import { transformMsoHtmlClasses } from './transform/html-classes'
import { transformRemoveLineNumberWrapper } from './transform/line-number'
import { transformLists } from './transform/list'
import { transformMsoStyles } from './transform/style'

// form https://www.npmjs.com/package/@intevation/tiptap-extension-office-paste

const OfficePastePlugin = new Plugin({
  key: new PluginKey('office-paste'),
  props: {
    transformPastedHTML(html) {
      if (
        html.indexOf(`microsoft-com`) !== -1 &&
        html.indexOf(`office`) !== -1
      ) {
        html = transformLists(html)
        html = transformRemoveBookmarks(html)
        html = transformMsoStyles(html)
        html = transformMsoHtmlClasses(html)
        html = transformRemoveLineNumberWrapper(html)
      }
      return html
    },
    handlePaste(view, event) {
      return transformExcel(view, event)
    },
  },
})

export default Extension.create({
  priority: 99999,
  name: 'officePaste',
  addProseMirrorPlugins() {
    return [OfficePastePlugin]
  },
})
