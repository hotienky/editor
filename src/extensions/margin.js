import { Extension } from '@tiptap/core'
import { NodeSelection } from '@tiptap/pm/state'

const normalizeMarginValue = (value) => {
  if (value === null || value === undefined) return null
  if (typeof value === 'number') {
    return Number.isFinite(value) ? String(value) : null
  }
  if (typeof value !== 'string') return null
  const trimmed = value.trim().replace(/px$/i, '')
  if (!trimmed) return null
  const num = Number.parseFloat(trimmed)
  if (!Number.isFinite(num)) return null
  return String(num)
}

const normalizeMargin = (options) => {
  if (!options || typeof options !== 'object') return null
  const top = normalizeMarginValue(options.top)
  const bottom = normalizeMarginValue(options.bottom)
  const next = {}
  if (top !== null && top !== '' && top !== '0') next.top = top
  if (bottom !== null && bottom !== '' && bottom !== '0') next.bottom = bottom
  return Object.keys(next).length ? next : null
}

const isSameMargin = (a, b) => {
  if (!a && !b) return true
  if (!a || !b) return false
  if (typeof a !== 'object' || typeof b !== 'object') return false
  const aTop = a.top ?? null
  const bTop = b.top ?? null
  const aBottom = a.bottom ?? null
  const bBottom = b.bottom ?? null
  return aTop === bTop && aBottom === bBottom
}

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
  name: 'margin',
  addOptions() {
    return {
      types: [
        'heading',
        'paragraph',
        'audio',
        'codeBlock',
        'file',
        'iframe',
        'image',
        'toc',
        'video',
        'horizontalRule',
        'table',
        'bulletList',
        'orderedList',
        'taskList',
        'echarts',
        'callout',
        'columns',
        'blockMath',
        'codeBlock',
      ],
      margin: { top: 0, bottom: 0 },
    }
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          margin: {
            default: null,
            parseHTML: (element) => {
              const { marginTop, marginBottom } = element.style
              if (
                (marginTop === '' && marginBottom === '') ||
                (marginTop === '0px' && marginBottom === '0px')
              ) {
                return null
              }
              const styleMargin = {}
              if (marginTop && marginTop !== '0px') {
                const top = normalizeMarginValue(marginTop.replace(/px/g, ''))
                if (top !== null && top !== '' && top !== '0') {
                  styleMargin.top = top
                }
              }
              if (marginBottom && marginBottom !== '0px') {
                const bottom = normalizeMarginValue(
                  marginBottom.replace(/px/g, ''),
                )
                if (bottom !== null && bottom !== '' && bottom !== '0') {
                  styleMargin.bottom = bottom
                }
              }
              return Object.keys(styleMargin).length ? styleMargin : null
            },
            renderHTML: (attributes) => {
              const { margin } = attributes
              if (!margin || typeof margin !== 'object') return {}

              const { top, bottom } = margin ?? {}
              let styleMargin = ''
              if (top !== null && top !== undefined && top !== '') {
                styleMargin += `margin-top: ${top}px;`
              }
              if (bottom !== null && bottom !== undefined && bottom !== '') {
                styleMargin += `margin-bottom: ${bottom}px;`
              }
              if (!styleMargin) return {}
              return { style: styleMargin }
            },
          },
        },
      },
    ]
  },
  addCommands() {
    return {
      setMargin:
        (options) =>
        ({ editor, state, dispatch }) => {
          const typeNames = this.options.types.filter(
            (type) => editor.schema.nodes[type],
          )

          const normalized = normalizeMargin(options)
          if (!normalized) {
            return editor.commands.unsetMargin()
          }

          let { tr } = state
          let updated = false

          state.doc.nodesBetween(
            state.selection.from,
            state.selection.to,
            (node, pos) => {
              if (!typeNames.includes(node.type.name)) return

              const current =
                node.attrs.margin && typeof node.attrs.margin === 'object'
                  ? node.attrs.margin
                  : null

              const next = normalizeMargin({ ...current, ...normalized })
              if (isSameMargin(current, next)) {
                updated = true
                return
              }

              tr = tr.setNodeMarkup(pos, undefined, {
                ...node.attrs,
                margin: next,
              })
              updated = true
            },
          )

          if (!updated) {
            const target = findClosestTargetNode(state, typeNames)
            if (!target) return false

            const current =
              target.node.attrs.margin &&
              typeof target.node.attrs.margin === 'object'
                ? target.node.attrs.margin
                : null

            const next = normalizeMargin({ ...current, ...normalized })
            if (isSameMargin(current, next)) {
              return true
            }
            tr = tr.setNodeMarkup(target.pos, undefined, {
              ...target.node.attrs,
              margin: next,
            })
            updated = true
          }

          if (dispatch && tr.docChanged) {
            dispatch(tr)
          }

          return updated
        },
      unsetMargin:
        () =>
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
              const current = node.attrs.margin
              if (
                !current ||
                (typeof current === 'object' && !Object.keys(current).length)
              ) {
                updated = true
                return
              }
              tr = tr.setNodeMarkup(pos, undefined, {
                ...node.attrs,
                margin: null,
              })
              updated = true
            },
          )

          if (!updated) {
            const target = findClosestTargetNode(state, typeNames)
            if (!target) return false

            const current = target.node.attrs.margin
            if (
              !current ||
              (typeof current === 'object' && !Object.keys(current).length)
            ) {
              return true
            }

            tr = tr.setNodeMarkup(target.pos, undefined, {
              ...target.node.attrs,
              margin: null,
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
