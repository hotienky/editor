import { Extension } from '@tiptap/core'
import { NodeSelection } from '@tiptap/pm/state'

const findClosestTargetNode = (state, typeNames) => {
  const { selection } = state

  if (selection instanceof NodeSelection) {
    const { node } = selection
    if (node && typeNames.includes(node.type.name)) {
      return { node, pos: selection.from }
    }
  }

  const { $from } = selection
  for (let { depth } = $from; depth > 0; depth -= 1) {
    const node = $from.node(depth)
    if (typeNames.includes(node.type.name)) {
      return { node, pos: $from.before(depth) }
    }
  }

  return null
}

export default Extension.create({
  name: 'nodeAlign',
  addOptions() {
    return {
      defaultAlignment: 'center',
      alignments: ['flex-start', 'center', 'flex-end'],
      types: ['image', 'video', 'audio', 'iframe', 'file', 'echarts'],
    }
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          nodeAlign: {
            default: this.options.defaultAlignment,
            parseHTML: (element) => {
              return (
                element.style.justifyContent || this.options.defaultAlignment
              )
            },
            renderHTML: (attributes) => {
              const align = attributes.nodeAlign
              return { style: `justify-content: ${align}` }
            },
          },
        },
      },
    ]
  },
  addCommands() {
    return {
      setNodeAlign:
        (alignment) =>
        ({ editor, state, dispatch }) => {
          if (!this.options.alignments.includes(alignment)) {
            return false
          }

          const typeNames = this.options.types.filter(
            (type) => editor.schema.nodes[type],
          )

          let { tr } = state
          let updated = false

          state.doc.nodesBetween(
            state.selection.from,
            state.selection.to,
            (node, pos) => {
              if (!typeNames.includes(node.type.name)) {
                return
              }
              if (node.attrs.nodeAlign === alignment) {
                updated = true
                return
              }
              tr = tr.setNodeMarkup(pos, undefined, {
                ...node.attrs,
                nodeAlign: alignment,
              })
              updated = true
            },
          )

          if (!updated) {
            const target = findClosestTargetNode(state, typeNames)
            if (!target) {
              return false
            }
            if (target.node.attrs.nodeAlign === alignment) {
              return true
            }
            tr = tr.setNodeMarkup(target.pos, undefined, {
              ...target.node.attrs,
              nodeAlign: alignment,
            })
            updated = true
          }

          if (dispatch && tr.docChanged) {
            dispatch(tr)
          }

          return updated
        },
      unsetNodeAlign:
        () =>
        ({ editor, state, dispatch }) => {
          const { defaultAlignment } = this.options
          const typeNames = this.options.types.filter(
            (type) => editor.schema.nodes[type],
          )

          let { tr } = state
          let updated = false

          state.doc.nodesBetween(
            state.selection.from,
            state.selection.to,
            (node, pos) => {
              if (!typeNames.includes(node.type.name)) {
                return
              }
              if (node.attrs.nodeAlign === defaultAlignment) {
                updated = true
                return
              }
              tr = tr.setNodeMarkup(pos, undefined, {
                ...node.attrs,
                nodeAlign: defaultAlignment,
              })
              updated = true
            },
          )

          if (!updated) {
            const target = findClosestTargetNode(state, typeNames)
            if (!target) {
              return false
            }
            if (target.node.attrs.nodeAlign === defaultAlignment) {
              return true
            }
            tr = tr.setNodeMarkup(target.pos, undefined, {
              ...target.node.attrs,
              nodeAlign: defaultAlignment,
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
