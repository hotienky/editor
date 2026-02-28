import { Extension } from '@tiptap/core'
import { NodeSelection } from '@tiptap/pm/state'

const buildStyle = (mode) => {
  switch (mode) {
    case 'break-all':
      return 'word-break: break-all;'
    case 'break-word':
      return 'word-break: break-word;'
    case 'normal':
    default:
      return 'word-break: normal;'
  }
}

export default Extension.create({
  name: 'wordWrap',
  addOptions() {
    return {
      types: ['paragraph', 'heading'],
    }
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          wordWrap: {
            default: 'normal',
            parseHTML: (element) => {
              return (
                element.style.wordWrap ||
                element.getAttribute('data-word-wrap') ||
                'normal'
              )
            },
            renderHTML: (attributes) => {
              if (!attributes.wordWrap || attributes.wordWrap === 'normal') {
                return {}
              }
              return {
                'data-word-wrap': attributes.wordWrap,
                style: buildStyle(attributes.wordWrap),
              }
            },
          },
        },
      },
    ]
  },
  addCommands() {
    return {
      setWordWrap:
        (mode) =>
        ({ state, commands }) => {
          const { selection } = state
          if (selection instanceof NodeSelection) {
            return commands.updateAttributes(selection.node.type.name, {
              wordWrap: mode,
            })
          }
          return this.options.types.some((type) =>
            commands.updateAttributes(type, {
              wordWrap: mode,
            }),
          )
        },
      unsetWordWrap:
        () =>
        ({ commands }) => {
          return this.options.types.some((type) =>
            commands.updateAttributes(type, {
              wordWrap: 'normal',
            }),
          )
        },
      canSetWordWrap:
        () =>
        ({ state }) => {
          const { from, to } = state.selection
          let canSet = false

          state.doc.nodesBetween(from, to, (node) => {
            if (this.options.types.includes(node.type.name)) {
              canSet = true
              return false
            }
          })

          return canSet
        },
    }
  },
})
