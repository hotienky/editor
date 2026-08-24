/**
 * Collaboration Engine — Track Changes Helpers
 */

/**
 * Generate a unique ID for track changes
 */
export function generateId() {
  return `tc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

/**
 * Read tracked changes from document state
 */
export function collectTrackChanges(state, markName = 'trackChange') {
  const changes = []
  state?.doc?.descendants?.((node, pos) => {
    (node.marks || []).forEach((mark) => {
      if (mark?.type?.name === markName || mark?.type === markName) {
        changes.push({
          id: mark.attrs?.id,
          type: mark.attrs?.type,
          author: mark.attrs?.author,
          timestamp: mark.attrs?.timestamp,
          text: node.text || '',
          from: pos,
          to: pos + (node.nodeSize || 0),
        })
      }
    })
  })
  return changes
}

export const TrackChanges = {
  name: 'trackChange',
  collectTrackChanges,
  generateId,
}

export default TrackChanges
