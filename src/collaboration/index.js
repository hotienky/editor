/**
 * Collaboration Engine — Public API
 *
 * Single entry point for the Collaboration Engine layer.
 * All external code should import from here.
 *
 * Architecture: Layer 6 — Collaboration Engine
 */

// ─── Protocol (Yjs Integration) ───────────────────────────────────────────

export {
  CollaborationProtocol,
  getCollaboration,
  createCollaboration,
} from './protocol'

// ─── Presence (User Awareness) ────────────────────────────────────────────

export {
  PresenceManager,
  getPresence,
  createPresence,
} from './presence'

// ─── Version History ──────────────────────────────────────────────────────

export {
  VersionHistory,
  getVersionHistory,
  createVersionHistory,
} from './history'

// ─── Track Changes ────────────────────────────────────────────────────────

export { TrackChanges } from './track-changes'

// ─── Convenience ───────────────────────────────────────────────────────────

import { getCollaboration } from './protocol'
import { getPresence } from './presence'
import { getVersionHistory } from './history'

/**
 * Initialize the collaboration engine
 * @param {Object} config
 * @param {string} config.docName - Document identifier
 * @param {string} [config.wsUrl] - WebSocket URL
 * @param {Object} [config.user] - Current user { name, color }
 * @param {Object} [config.history] - History options { maxVersions, storageKey }
 * @returns {Object} Collaboration context
 */
export function initCollaboration(config = {}) {
  const collaboration = getCollaboration()
  const presence = getPresence(collaboration)
  const history = getVersionHistory(config.history)

  // Connect to WebSocket if docName provided
  if (config.docName) {
    collaboration.connect(config.docName, config.wsUrl, config.user)

    if (config.user) {
      presence.setUser(config.user)
    }
  }

  return {
    collaboration,
    presence,
    history,

    // Convenience methods
    connect: (docName, wsUrl, user) => {
      collaboration.connect(docName, wsUrl, user)
      if (user) presence.setUser(user)
    },
    disconnect: () => collaboration.disconnect(),

    // Presence
    setUser: (user) => presence.setUser(user),
    getRemoteUsers: () => presence.getRemoteUsers(),
    setCursor: (cursor) => presence.setCursor(cursor),

    // History
    createSnapshot: (doc, meta) => history.createSnapshot(doc, meta),
    restoreVersion: (id) => history.restore(id),
    getVersions: () => history.getVersions(),

    // State
    isConnected: () => collaboration.isConnected,
    getUserCount: () => presence.getUserCount(),
  }
}

export default {
  // Protocol
  getCollaboration,
  createCollaboration,

  // Presence
  getPresence,
  createPresence,

  // History
  getVersionHistory,
  createVersionHistory,

  // Track Changes
  TrackChanges,

  // Convenience
  initCollaboration,
}
