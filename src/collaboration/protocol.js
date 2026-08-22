/**
 * Collaboration Engine — Yjs Protocol Layer
 *
 * Manages Y.Doc instances, WebSocket connections, and document synchronization.
 * Built on yjs, y-prosemirror, and y-protocols.
 */

import { Doc as YDoc, UndoManager } from 'yjs'
import { WebsocketProvider } from 'y-websocket'

/**
 * Collaboration protocol managing Y.Doc lifecycle and WebSocket connections
 */
export class CollaborationProtocol {
  constructor() {
    this._doc = null
    this._provider = null
    this._yXmlFragment = null
    this._connected = false
    this._listeners = new Set()
    this._awarenessListeners = new Set()
  }

  // ─── Initialization ─────────────────────────────────────────────────────

  /**
   * Initialize collaboration with a document name and WebSocket URL
   * @param {string} docName - Document identifier
   * @param {string} [wsUrl] - WebSocket server URL (default: ws://localhost:1234)
   * @param {Object} [user] - Current user info { name, color }
   * @returns {Y.Doc}
   */
  connect(docName, wsUrl = 'ws://localhost:1234', user) {
    if (this._doc) {
      this.disconnect()
    }

    this._doc = new YDoc()
    this._yXmlFragment = this._doc.getXmlFragment('document-content')

    this._provider = new WebsocketProvider(wsUrl, docName, this._doc, {
      connect: true,
      awareness: true,
    })

    if (user) {
      this.setAwarenessUser(user)
    }

    this._provider.on('status', ({ status }) => {
      this._connected = status === 'connected'
      this._notify({ type: 'status', connected: this._connected })
    })

    this._provider.awareness.on('change', () => {
      this._notify({ type: 'awareness', states: this.getAwarenessStates() })
    })

    this._provider.on('sync', (synced) => {
      this._notify({ type: 'sync', synced })
    })

    return this._doc
  }

  /**
   * Disconnect and clean up
   */
  disconnect() {
    if (this._provider) {
      this._provider.disconnect()
      this._provider.destroy()
      this._provider = null
    }
    if (this._doc) {
      this._doc.destroy()
      this._doc = null
    }
    this._yXmlFragment = null
    this._connected = false
  }

  // ─── Document Access ────────────────────────────────────────────────────

  get doc() {
    return this._doc
  }

  get xmlFragment() {
    return this._yXmlFragment
  }

  get isConnected() {
    return this._connected
  }

  /**
   * Get the current document content as JSON
   * @returns {Object|null}
   */
  getJSON() {
    if (!this._doc) return null
    return this._doc.toJSON()
  }

  // ─── Awareness (Presence) ───────────────────────────────────────────────

  /**
   * Set the current user's awareness info
   * @param {Object} user - { name, color, colorIndex }
   */
  setAwarenessUser(user) {
    if (!this._provider?.awareness) return

    this._provider.awareness.setLocalStateField('user', {
      name: user.name || 'Anonymous',
      color: user.color || '#333',
      colorIndex: user.colorIndex || 0,
    })
  }

  /**
   * Update awareness state
   * @param {Object} state - Awareness fields to update
   */
  setAwarenessState(state) {
    if (!this._provider?.awareness) return

    for (const [key, value] of Object.entries(state)) {
      this._provider.awareness.setLocalStateField(key, value)
    }
  }

  /**
   * Get all connected users' awareness states
   * @returns {Array<Object>}
   */
  getAwarenessStates() {
    if (!this._provider?.awareness) return []

    const states = []
    this._provider.awareness.getStates().forEach((state, clientId) => {
      if (clientId !== this._doc.clientID) {
        states.push({ clientId, ...state })
      }
    })
    return states
  }

  /**
   * Get the current user's client ID
   * @returns {number|null}
   */
  getClientID() {
    return this._doc?.clientID ?? null
  }

  // ─── Undo/Redo (Shared) ─────────────────────────────────────────────────

  /**
   * Create a shared undo manager for the document
   * @param {Array<Y.Item|Y.XmlFragment>} [scopes] - Scopes to track
   * @returns {Y.UndoManager}
   */
  createUndoManager(scopes) {
    if (!this._doc) return null

    const undoManager = new UndoManager(
      scopes || [this._yXmlFragment],
      {
        trackedOrigins: new Set([this._doc]),
      },
    )

    return undoManager
  }

  // ─── Events ─────────────────────────────────────────────────────────────

  /**
   * Subscribe to collaboration events
   * @param {(event: Object) => void} listener
   * @returns {Function} Unsubscribe function
   */
  onChange(listener) {
    this._listeners.add(listener)
    return () => this._listeners.delete(listener)
  }

  _notify(event) {
    for (const listener of this._listeners) {
      listener(event)
    }
  }

  // ─── Transaction ────────────────────────────────────────────────────────

  /**
   * Execute a transaction on the Y.Doc
   * @param {(doc: Y.Doc) => void} fn
   */
  transaction(fn) {
    if (!this._doc) return
    this._doc.transact(fn)
  }
}

let _instance = null

/**
 * Get or create the singleton CollaborationProtocol
 */
export function getCollaboration() {
  if (!_instance) {
    _instance = new CollaborationProtocol()
  }
  return _instance
}

/**
 * Create a fresh CollaborationProtocol instance
 */
export function createCollaboration() {
  _instance = new CollaborationProtocol()
  return _instance
}
