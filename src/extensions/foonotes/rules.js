import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { ReplaceStep } from '@tiptap/pm/transform'

import { updateFootnotesList } from './utils'

export default Extension.create({
  name: 'footnoteRules',
  priority: 1000,
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('footnoteRules'),
        filterTransaction(tr) {
          const { from, to } = tr.selection
          if (from === 0 && to === tr.doc.content.size) return true
          let selectedFootnotes = false
          let selectedContent = false
          let footnoteCount = 0
          tr.doc.nodesBetween(from, to, (node, _, parent) => {
            if (parent?.type.name === 'doc' && node.type.name !== 'footnotes') {
              selectedContent = true
            } else if (node.type.name === 'footnote') {
              footnoteCount += 1
            } else if (node.type.name === 'footnotes') {
              selectedFootnotes = true
            }
          })
          const overSelected = selectedContent && selectedFootnotes
          return !overSelected && footnoteCount <= 1
        },
        appendTransaction(transactions, oldState, newState) {
          const newTr = newState.tr
          let refsChanged = false
          for (const tr of transactions) {
            if (!tr.docChanged) continue
            if (refsChanged) break

            for (const step of tr.steps) {
              if (!(step instanceof ReplaceStep)) continue
              if (refsChanged) break

              const isDelete = step.from !== step.to
              const isInsert = step.slice.size > 0

              if (isInsert) {
                step.slice.content.descendants((node) => {
                  if (node?.type.name === 'footnoteReference') {
                    refsChanged = true
                    return false
                  }
                })
              }
              if (isDelete && !refsChanged) {
                tr.before.nodesBetween(
                  step.from,
                  Math.min(tr.before.content.size, step.to),
                  (node) => {
                    if (node.type.name === 'footnoteReference') {
                      refsChanged = true
                      return false
                    }
                  },
                )
              }
            }
          }
          if (refsChanged) {
            updateFootnotesList(newTr, newState)
            return newTr
          }
          return null
        },
      }),
    ]
  },
})
