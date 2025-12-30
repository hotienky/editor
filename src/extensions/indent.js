import { Extension } from '@tiptap/core'
import { AllSelection, TextSelection } from '@tiptap/pm/state'
import { isFunction } from '@tool-belt/type-predicates'

// @weiruo/tiptap-extension-indent Version:2.0.4-1
const classAttrPrefix = 'umo-indent-'
export default Extension.create({
  name: 'indent',
  addOptions() {
    return {
      types: ['heading', 'listItem', 'taskItem', 'paragraph'],
      minLevel: 0,
      maxLevel: 5,
    }
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          indent: {
            default: null,
            renderHTML: (attributes) => {
              if (!attributes.indent) {
                return {}
              }
              if (attributes.indent > this.options.minLevel) {
                return {
                  class: `${classAttrPrefix}${attributes.indent}`,
                }
              }
              return {}
            },
            parseHTML: (element) => {
              let indentClassName = ''
              for (const className of element.classList) {
                if (className.startsWith(classAttrPrefix)) {
                  indentClassName = className
                  break
                }
              }
              if (indentClassName) {
                const level = Number.parseInt(
                  indentClassName.slice(classAttrPrefix.length),
                  10,
                )
                return level && level > this.options.minLevel ? level : null
              }
              return null
            },
          },
        },
      },
    ]
  },
  addCommands() {
    const setNodeIndentMarkup = (tr, pos, delta) => {
      const node = tr.doc.nodeAt(pos) ?? null
      if (node) {
        const nextLevel = (node.attrs.indent ?? 0) + delta
        const { minLevel, maxLevel } = this.options
        let indent = nextLevel
        if (nextLevel < minLevel) {
          indent = minLevel
        } else if (nextLevel > maxLevel) {
          indent = maxLevel
        }
        if (indent !== node.attrs.indent) {
          const clonedAttrs = { ...node.attrs }
          delete clonedAttrs.indent

          const nodeAttrs =
            indent > minLevel ? { ...clonedAttrs, indent } : clonedAttrs
          return tr.setNodeMarkup(pos, node.type, nodeAttrs, node.marks)
        }
      }
      return tr
    }
    const updateIndentLevel = (tr, delta) => {
      const { doc, selection } = tr
      if (
        doc &&
        selection &&
        (selection instanceof TextSelection ||
          selection instanceof AllSelection)
      ) {
        const { from, to } = selection
        doc.nodesBetween(from, to, (node, pos) => {
          if (this.options.types.includes(node.type.name)) {
            tr = setNodeIndentMarkup(tr, pos, delta)
            return false
          }
          return true
        })
      }
      return tr
    }
    const applyIndent =
      (direction) =>
      () =>
      ({ tr, state, dispatch, editor }) => {
        const { selection } = state
        tr.setSelection(selection)
        tr = updateIndentLevel(tr, direction)
        if (tr.docChanged) {
          if (isFunction(dispatch)) {
            dispatch(tr)
          }
          return true
        }
        return false
      }
    return {
      indent: applyIndent(1),
      outdent: applyIndent(-1),
    }
  },
  addKeyboardShortcuts() {
    return {
      Tab: () => {
        if (
          this.editor.isActive('bulletList') ||
          this.editor.isActive('orderedList')
        ) {
          return this.editor.commands.sinkListItem('listItem')
        }
        if (this.editor.isActive('taskList')) {
          return this.editor.commands.sinkListItem('taskItem')
        }
        return this.editor.commands.indent()
      },
      'Shift-Tab': () => {
        if (
          this.editor.isActive('bulletList') ||
          this.editor.isActive('orderedList')
        ) {
          return this.editor.commands.liftListItem('listItem')
        }
        if (this.editor.isActive('taskList')) {
          return this.editor.commands.liftListItem('taskItem')
        }
        return this.editor.commands.outdent()
      },
    }
  },
})
