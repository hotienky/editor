import { Extension } from '@tiptap/core'

import { findClosestTargetNode } from '@/utils/prosemirror'

export default Extension.create({
  name: 'lineHeight',
  addOptions() {
    return {
      types: ['heading', 'paragraph'],
      defaultLineHeight: 1.75,
    }
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          lineHeight: {
            default: this.options.defaultLineHeight,
            parseHTML: (element) =>
              element.style.lineHeight || this.options.defaultLineHeight,
            renderHTML: (attributes) => {
              if (attributes.lineHeight === this.options.defaultLineHeight) {
                return {}
              }
              return { style: `line-height: ${attributes.lineHeight}` }
            },
          },
        },
      },
    ]
  },
  addCommands() {
    return {
      setLineHeight:
        (lineHeight) =>
        ({ editor, state, dispatch }) => {
          const typeNames = this.options.types.filter(
            (type) => editor.schema.nodes[type],
          )

          let { tr } = state
          let updated = false

          state.doc.nodesBetween(
            state.selection.from,
            state.selection.to,
            (node, pos) => {
              if (!typeNames.includes(node.type.name)) return
              if (node.attrs.lineHeight === lineHeight) {
                updated = true
                return
              }
              tr = tr.setNodeMarkup(pos, undefined, {
                ...node.attrs,
                lineHeight,
              })
              updated = true
            },
          )

          if (!updated) {
            const target = findClosestTargetNode(state, typeNames)
            if (!target) return false
            if (target.node.attrs.lineHeight === lineHeight) {
              return true
            }
            tr = tr.setNodeMarkup(target.pos, undefined, {
              ...target.node.attrs,
              lineHeight,
            })
            updated = true
          }

          if (dispatch && tr.docChanged) {
            dispatch(tr)
          }
          return updated
        },
      unsetLineHeight:
        () =>
        ({ editor, state, dispatch }) => {
          const { defaultLineHeight } = this.options
          const typeNames = this.options.types.filter(
            (type) => editor.schema.nodes[type],
          )

          let { tr } = state
          let updated = false

          state.doc.nodesBetween(
            state.selection.from,
            state.selection.to,
            (node, pos) => {
              if (!typeNames.includes(node.type.name)) return
              if (node.attrs.lineHeight === defaultLineHeight) {
                updated = true
                return
              }
              tr = tr.setNodeMarkup(pos, undefined, {
                ...node.attrs,
                lineHeight: defaultLineHeight,
              })
              updated = true
            },
          )

          if (!updated) {
            const target = findClosestTargetNode(state, typeNames)
            if (!target) return false
            if (target.node.attrs.lineHeight === defaultLineHeight) {
              return true
            }
            tr = tr.setNodeMarkup(target.pos, undefined, {
              ...target.node.attrs,
              lineHeight: defaultLineHeight,
            })
            updated = true
          }

          if (dispatch && tr.docChanged) {
            dispatch(tr)
          }
          return updated
        },
    }
  },
})
