/**
 * Collaboration Engine — Track Changes Extension
 *
 * Tiptap Mark extension for tracking insertions and deletions.
 * Each tracked change carries metadata: author, timestamp, type (insert/delete).
 */

import { Mark, mergeAttributes } from '@tiptap/core'
import { Plugin, PluginKey, TextSelection } from '@tiptap/pm/state'

const trackChangesKey = new PluginKey('kindyTrackChanges')

/**
 * Generate a unique ID for track changes
 */
function generateId() {
  return `tc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

/**
 * Read tracked changes without executing a Tiptap command. Getter commands
 * still dispatch an empty transaction, so using them from a transaction
 * listener creates an endless transaction -> refresh loop.
 */
export function collectTrackChanges(state, markName = 'trackChange') {
  const changes = []
  state?.doc?.descendants((node, pos) => {
    node.marks.forEach((mark) => {
      if (mark.type.name === markName) {
        changes.push({
          id: mark.attrs.id,
          type: mark.attrs.type,
          author: mark.attrs.author,
          timestamp: mark.attrs.timestamp,
          text: node.text || '',
          from: pos,
          to: pos + node.nodeSize,
        })
      }
    })
  })
  return changes
}

/**
 * TrackChanges Mark extension
 *
 * Usage:
 *   - editor.commands.setTrackChange({ type: 'insert', author: 'User', text: '...' })
 *   - editor.commands.acceptTrackChange(id)
 *   - editor.commands.rejectTrackChange(id)
 *   - editor.commands.acceptAllTrackChanges()
 *   - editor.commands.rejectAllTrackChanges()
 */
export const TrackChanges = Mark.create({
  name: 'trackChange',

  addOptions() {
    return {
      HTMLAttributes: {},
      enabled: false,
      user: { name: 'Anonymous' },
    }
  },

  addAttributes() {
    return {
      id: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-track-id'),
        renderHTML: (attributes) => ({ 'data-track-id': attributes.id }),
      },
      type: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-track-type'),
        renderHTML: (attributes) => ({ 'data-track-type': attributes.type }),
      },
      author: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-track-author'),
        renderHTML: (attributes) => ({ 'data-track-author': attributes.author }),
      },
      timestamp: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-track-timestamp'),
        renderHTML: (attributes) => ({ 'data-track-timestamp': attributes.timestamp }),
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-track]',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        'data-track': '',
      }),
      0,
    ]
  },

  addCommands() {
    return {
      enableTrackChanges:
        (user = this.options.user) =>
        () => {
          this.storage.enabled = true
          this.storage.user = user
          return true
        },
      disableTrackChanges:
        () =>
        () => {
          this.storage.enabled = false
          return true
        },
      deleteTrackedSelection:
        () =>
        ({ state, dispatch }) => {
          if (!this.storage.enabled) return false
          let { from, to } = state.selection
          if (from === to && from > 1) from -= 1
          if (from === to) return false
          if (dispatch) {
            const mark = state.schema.marks[this.name].create({
              id: generateId(), type: 'delete', author: this.storage.user?.name || 'Anonymous', timestamp: Date.now(),
            })
            const tr = state.tr.addMark(from, to, mark)
            dispatch(tr.setSelection(TextSelection.create(tr.doc, to)).setMeta(trackChangesKey, true))
          }
          return true
        },
      /**
       * Mark the current selection as a tracked change
       * @param {Object} attrs - { type: 'insert'|'delete', author, text }
       */
      setTrackChange:
        (attrs) =>
        ({ commands }) => {
          return commands.setMark(this.name, {
            id: attrs.id || generateId(),
            type: attrs.type || 'insert',
            author: attrs.author || 'Anonymous',
            timestamp: attrs.timestamp || Date.now(),
          })
        },

      /**
       * Accept a tracked change (remove the mark, keep the content)
       * @param {string} id - Track change ID
       */
      acceptTrackChange:
        (id) =>
        ({ state, dispatch }) => {
          const { doc } = state
          let found = false

          doc.descendants((node, pos) => {
            if (found) return false

            node.marks.forEach((mark) => {
              if (mark.type.name === this.name && mark.attrs.id === id) {
                found = true
                if (dispatch) {
                  const {tr} = state
                  if (mark.attrs.type === 'delete') tr.delete(pos, pos + node.nodeSize)
                  else tr.removeMark(pos, pos + node.nodeSize, mark.type)
                  dispatch(tr.setMeta(trackChangesKey, true))
                }
              }
            })
          })

          return found
        },

      /**
       * Reject a tracked change (remove the mark AND the content)
       * @param {string} id - Track change ID
       */
      rejectTrackChange:
        (id) =>
        ({ state, dispatch }) => {
          const { doc } = state
          let found = false
          const ranges = []

          doc.descendants((node, pos) => {
            node.marks.forEach((mark) => {
              if (mark.type.name === this.name && mark.attrs.id === id) {
                found = true
                ranges.push({ from: pos, to: pos + node.nodeSize, type: mark.attrs.type })
              }
            })
          })

          if (found && dispatch) {
            const {tr} = state
            // Remove in reverse order to preserve positions
            ranges.sort((a, b) => b.from - a.from)
            for (const range of ranges) {
              if (range.type === 'insert') {
                // Reject insert = remove the content
                tr.delete(range.from, range.to)
              } else {
                // Reject delete = keep the content, remove the mark
                tr.removeMark(range.from, range.to, state.schema.marks[this.name])
              }
            }
            dispatch(tr.setMeta(trackChangesKey, true))
          }

          return found
        },

      /**
       * Accept all tracked changes
       */
      acceptAllTrackChanges:
        () =>
        ({ state, dispatch }) => {
          const { doc } = state
          const insertions = []
          const deletions = []

          doc.descendants((node, pos) => {
            node.marks.forEach((mark) => {
              if (mark.type.name === this.name) {
                const item = { from: pos, to: pos + node.nodeSize, mark }
                if (mark.attrs.type === 'delete') deletions.push(item)
                else insertions.push(item)
              }
            })
          })

          if ((insertions.length || deletions.length) && dispatch) {
            const {tr} = state
            deletions.sort((a, b) => b.from - a.from)
            for (const { from, to } of deletions) tr.delete(from, to)
            insertions.sort((a, b) => b.from - a.from)
            for (const { from, to, mark } of insertions) {
              tr.removeMark(from, to, mark.type)
            }
            dispatch(tr.setMeta(trackChangesKey, true))
          }

          return insertions.length + deletions.length > 0
        },

      /**
       * Reject all tracked changes
       */
      rejectAllTrackChanges:
        () =>
        ({ state, dispatch }) => {
          const { doc } = state
          const insertions = []
          const deletions = []

          doc.descendants((node, pos) => {
            node.marks.forEach((mark) => {
              if (mark.type.name === this.name) {
                if (mark.attrs.type === 'insert') {
                  insertions.push({ from: pos, to: pos + node.nodeSize })
                } else {
                  deletions.push({ from: pos, to: pos + node.nodeSize })
                }
              }
            })
          })

          if ((insertions.length > 0 || deletions.length > 0) && dispatch) {
            const {tr} = state

            // Reject inserts = remove content
            insertions.sort((a, b) => b.from - a.from)
            for (const { from, to } of insertions) {
              tr.delete(from, to)
            }

            // Reject deletes = remove marks (keep content)
            deletions.sort((a, b) => b.from - a.from)
            for (const { from, to } of deletions) {
              tr.removeMark(from, to, state.schema.marks[this.name])
            }

            dispatch(tr.setMeta(trackChangesKey, true))
          }

          return insertions.length + deletions.length > 0
        },

      /**
       * Get all tracked changes
       */
      getTrackChanges:
        () =>
        ({ state }) => {
          return collectTrackChanges(state, this.name)
        },
    }
  },

  addStorage() {
    return {
      enabled: this.options.enabled,
      user: this.options.user,
    }
  },

  addKeyboardShortcuts() {
    return {
      Backspace: () => this.storage.enabled ? this.editor.commands.deleteTrackedSelection() : false,
      Delete: () => this.storage.enabled ? this.editor.commands.deleteTrackedSelection() : false,
    }
  },

  addProseMirrorPlugins() {
    return [new Plugin({
      key: trackChangesKey,
      appendTransaction: (transactions, _oldState, newState) => {
        const isHistoryTransaction = transactions.some((transaction) => Object.keys(transaction.meta).some((key) => key.startsWith('history$')))
        if (!this.storage.enabled || isHistoryTransaction || !transactions.some((transaction) => transaction.docChanged) || transactions.some((transaction) => transaction.getMeta(trackChangesKey))) return null
        const markType = newState.schema.marks[this.name]
        if (!markType) return null
        const ranges = []
        const deletions = []
        transactions.forEach((transaction, transactionIndex) => {
          let stepDocument = transaction.before
          transaction.steps.forEach((step, stepIndex) => {
            if (step.slice && Number.isInteger(step.from) && Number.isInteger(step.to) && step.to > step.from) {
              const deleted = stepDocument.slice(step.from, step.to)
              let inlineOnly = deleted.content.size > 0
              deleted.content.forEach((node) => { if (!node.isInline) inlineOnly = false })
              if (inlineOnly) {
                let position = transaction.mapping.slice(stepIndex + 1).map(step.from, -1)
                for (let later = transactionIndex + 1; later < transactions.length; later += 1) {
                  position = transactions[later].mapping.map(position, -1)
                }
                deletions.push({ position, content: deleted.content })
              }
            }
            const applied = step.apply(stepDocument)
            if (!applied.failed) stepDocument = applied.doc
          })
          transaction.mapping.maps.forEach((map, index) => {
            map.forEach((_oldStart, _oldEnd, newStart, newEnd) => {
              if (newEnd > newStart) {
                const rest = transaction.mapping.slice(index + 1)
                ranges.push({ from: rest.map(newStart), to: rest.map(newEnd) })
              }
            })
          })
        })
        if (!ranges.length && !deletions.length) return null
        const tr = newState.tr.setMeta(trackChangesKey, true)
        const author = this.storage.user?.name || 'Anonymous'
        deletions.sort((a, b) => b.position - a.position)
        deletions.forEach(({ position, content }) => {
          const from = Math.max(0, Math.min(position, tr.doc.content.size))
          tr.insert(from, content)
          tr.addMark(from, from + content.size, markType.create({
            id: generateId(), type: 'delete', author, timestamp: Date.now(),
          }))
        })
        const insertionAttrs = { id: generateId(), type: 'insert', author, timestamp: Date.now() }
        ranges.forEach(({ from, to }) => {
          const mappedFrom = tr.mapping.map(from, 1)
          const mappedTo = tr.mapping.map(to, -1)
          if (mappedTo > mappedFrom) tr.addMark(mappedFrom, mappedTo, markType.create(insertionAttrs))
        })
        return tr.steps.length ? tr : null
      },
    })]
  },
})

export default TrackChanges
