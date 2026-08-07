/**
 * Collaboration Engine — Presence & Awareness
 *
 * Manages user presence indicators, remote cursors, and user list.
 * Built on top of Yjs awareness protocol.
 */

const PRESENCE_COLORS = [
  '#3b82f6', '#ef4444', '#10b981', '#f59e0b',
  '#8b5cf6', '#ec4899', '#06b6d4', '#f97316',
  '#6366f1', '#14b8a6', '#e11d48', '#84cc16',
]

const DEFAULT_AVATARS = [
  'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H',
  'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P',
]

/**
 * Presence manager for user awareness and remote cursors
 */
export class PresenceManager {
  constructor(collaboration) {
    this._collaboration = collaboration
    this._localUser = null
    this._cursors = new Map()
    this._listeners = new Set()
    this._cursorListeners = new Set()

    this._setupAwarenessListener()
  }

  // ─── Local User ─────────────────────────────────────────────────────────

  /**
   * Set the current user's presence info
   * @param {Object} user - { name, color?, colorIndex? }
   */
  setUser(user) {
    const colorIndex = user.colorIndex ?? this._hashString(user.name) % PRESENCE_COLORS.length
    this._localUser = {
      name: user.name || 'Anonymous',
      color: user.color || PRESENCE_COLORS[colorIndex],
      colorIndex,
      avatar: user.name?.[0]?.toUpperCase() || DEFAULT_AVATARS[colorIndex],
    }

    this._collaboration.setAwarenessUser(this._localUser)
    return this._localUser
  }

  /**
   * Get the current local user
   * @returns {Object|null}
   */
  get localUser() {
    return this._localUser
  }

  // ─── Remote Users ───────────────────────────────────────────────────────

  /**
   * Get all connected users (excluding local)
   * @returns {Array<Object>}
   */
  getRemoteUsers() {
    return this._collaboration.getAwarenessStates().map((state) => ({
      clientId: state.clientId,
      name: state.user?.name || 'Anonymous',
      color: state.user?.color || '#999',
      colorIndex: state.user?.colorIndex || 0,
      avatar: state.user?.name?.[0]?.toUpperCase() || 'U',
      cursor: state.cursor || null,
      selection: state.selection || null,
    }))
  }

  /**
   * Get all connected users including local
   * @returns {Array<Object>}
   */
  getAllUsers() {
    const remote = this.getRemoteUsers()
    const local = this._localUser
      ? [{ clientId: this._collaboration.getClientID(), ...this._localUser, isLocal: true }]
      : []
    return [...local, ...remote]
  }

  /**
   * Get the count of connected users
   * @returns {number}
   */
  getUserCount() {
    return this.getRemoteUsers().length + (this._localUser ? 1 : 0)
  }

  // ─── Cursor Position ────────────────────────────────────────────────────

  /**
   * Update the local cursor position (broadcast to others)
   * @param {Object} cursor - { anchor, head } or null to clear
   */
  setCursor(cursor) {
    this._collaboration.setAwarenessState({ cursor })
  }

  /**
   * Get remote cursors
   * @returns {Array<Object>}
   */
  getRemoteCursors() {
    return this.getRemoteUsers()
      .filter((user) => user.cursor)
      .map((user) => ({
        user: {
          name: user.name,
          color: user.color,
          avatar: user.avatar,
        },
        cursor: user.cursor,
      }))
  }

  // ─── Selection ──────────────────────────────────────────────────────────

  /**
   * Update the local selection range (broadcast to others)
   * @param {Object} selection - { from, to }
   */
  setSelection(selection) {
    this._collaboration.setAwarenessState({ selection })
  }

  /**
   * Get remote selections
   * @returns {Array<Object>}
   */
  getRemoteSelections() {
    return this.getRemoteUsers()
      .filter((user) => user.selection)
      .map((user) => ({
        user: {
          name: user.name,
          color: user.color,
        },
        selection: user.selection,
      }))
  }

  // ─── Events ─────────────────────────────────────────────────────────────

  /**
   * Subscribe to user list changes
   * @param {(users: Array) => void} listener
   * @returns {Function} Unsubscribe
   */
  onUsersChange(listener) {
    this._listeners.add(listener)
    return () => this._listeners.delete(listener)
  }

  /**
   * Subscribe to cursor changes
   * @param {(cursors: Array) => void} listener
   * @returns {Function} Unsubscribe
   */
  onCursorChange(listener) {
    this._cursorListeners.add(listener)
    return () => this._cursorListeners.delete(listener)
  }

  _setupAwarenessListener() {
    this._collaboration.onChange((event) => {
      if (event.type === 'awareness') {
        this._notifyUsers()
        this._notifyCursors()
      }
    })
  }

  _notifyUsers() {
    const users = this.getAllUsers()
    for (const listener of this._listeners) {
      listener(users)
    }
  }

  _notifyCursors() {
    const cursors = this.getRemoteCursors()
    for (const listener of this._cursorListeners) {
      listener(cursors)
    }
  }

  // ─── Helpers ────────────────────────────────────────────────────────────

  _hashString(str) {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0
    }
    return Math.abs(hash)
  }
}

let _instance = null

/**
 * Get or create the singleton PresenceManager
 */
export function getPresence(collaboration) {
  if (!_instance) {
    _instance = new PresenceManager(collaboration || getCollaborationInstance())
  }
  return _instance
}

/**
 * Create a fresh PresenceManager instance
 */
export function createPresence(collaboration) {
  _instance = new PresenceManager(collaboration)
  return _instance
}

function getCollaborationInstance() {
  const { getCollaboration } = require('./protocol')
  return getCollaboration()
}
