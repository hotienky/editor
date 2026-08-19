/**
 * Collaboration Engine — Track Changes Extension
 *
 * Tiptap Mark extension for tracking insertions and deletions.
 * Each tracked change carries metadata: author, timestamp, type (insert/delete).
 */

import { Mark, mergeAttributes } from '@tiptap/core'

/**
 * Generate a unique ID for track changes
 */
function generateId() {
  return `tc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
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
                  tr.removeMark(pos, pos + node.nodeSize, mark.type)
                  dispatch(tr)
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
            dispatch(tr)
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
          const marksToRemove = []

          doc.descendants((node, pos) => {
            node.marks.forEach((mark) => {
              if (mark.type.name === this.name) {
                marksToRemove.push({ from: pos, to: pos + node.nodeSize, mark })
              }
            })
          })

          if (marksToRemove.length > 0 && dispatch) {
            const {tr} = state
            marksToRemove.sort((a, b) => b.from - a.from)
            for (const { from, to, mark } of marksToRemove) {
              tr.removeMark(from, to, mark.type)
            }
            dispatch(tr)
          }

          return marksToRemove.length > 0
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

            dispatch(tr)
          }

          return insertions.length + deletions.length > 0
        },

      /**
       * Get all tracked changes
       */
      getTrackChanges:
        () =>
        ({ state }) => {
          const { doc } = state
          const changes = []

          doc.descendants((node, pos) => {
            node.marks.forEach((mark) => {
              if (mark.type.name === this.name) {
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
        },
    }
  },

  addStorage() {
    return {
      enabled: false,
      changes: [],
    }
  },
})

export default TrackChanges
