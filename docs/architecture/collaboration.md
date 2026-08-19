# Collaboration Specification

> Version: 1.0
> Date: 2026-08-07
> Status: Draft

---

## Table of Contents

1. [Overview](#1-overview)
2. [CRDT Integration](#2-crdt-integration)
3. [Presence](#3-presence)
4. [Awareness](#4-awareness)
5. [Offline Support](#5-offline-support)
6. [Conflict Resolution](#6-conflict-resolution)
7. [API Reference](#7-api-reference)

---

## 1. Overview

### 1.1 Purpose

The Collaboration Engine enables real-time collaborative editing using CRDT (Conflict-free Replicated Data Type).

### 1.2 Design Principles

1. **Conflict-free**: Automatic merge without conflicts
2. **Offline-capable**: Work offline, sync when reconnected
3. **Real-time**: See changes as they happen
4. **Presence-aware**: See who else is editing

---

## 2. CRDT Integration

### 2.1 Yjs Integration

We use Yjs for CRDT-based collaboration:

```typescript
import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'

class CollaborationProvider {
  private doc: Y.Doc
  private provider: WebsocketProvider
  private yContent: Y.XmlFragment
  
  constructor(documentId: string, userId: string) {
    // Create Yjs document
    this.doc = new Y.Doc()
    
    // Connect to WebSocket server
    this.provider = new WebsocketProvider(
      'ws://localhost:1234',
      documentId,
      this.doc
    )
    
    // Get shared content
    this.yContent = this.doc.getXmlFragment('content')
  }
  
  // Get current document content
  getContent(): Document {
    return Y.XmlFragment.toJSON(this.yContent)
  }
  
  // Apply local changes
  applyLocalChanges(changes: any[]): void {
    this.doc.transact(() => {
      for (const change of changes) {
        applyYjsChange(this.yContent, change)
      }
    })
  }
  
  // Listen for remote changes
  onRemoteChanges(callback: (changes: any[]) => void): void {
    this.yContent.observe(event => {
      callback(event.changes)
    })
  }
}
```

### 2.2 Architecture

```
Client A ←→ Yjs Document ←→ Client B
                ↕
           WebSocket Server
                ↕
           Database (optional)
```

---

## 3. Presence

### 3.1 User Cursors

Show other users' cursors:

```typescript
interface Presence {
  userId: string
  userName: string
  userColor: string
  cursor: {
    position: number
    selection?: {
      from: number
      to: number
    }
  }
  lastActive: Date
}

class PresenceProvider {
  private localPresence: any
  
  setLocalPresence(presence: Presence): void {
    this.localPresence = this.provider.awareness.setLocalStateField(
      'presence',
      presence
    )
  }
  
  getRemotePresences(): Presence[] {
    const states = this.provider.awareness.getStates()
    const presences: Presence[] = []
    
    states.forEach((state, clientId) => {
      if (state.presence && clientId !== this.provider.clientID) {
        presences.push(state.presence)
      }
    })
    
    return presences
  }
  
  onPresenceChange(callback: (presences: Presence[]) => void): void {
    this.provider.awareness.on('change', () => {
      callback(this.getRemotePresences())
    })
  }
}
```

### 3.2 Cursor Rendering

```typescript
function renderCursor(presence: Presence): HTMLElement {
  const cursor = document.createElement('div')
  cursor.className = 'kindy-collaboration-cursor'
  cursor.style.backgroundColor = presence.userColor
  cursor.style.left = `${presence.cursor.position}px`
  
  const label = document.createElement('div')
  label.className = 'kindy-collaboration-label'
  label.textContent = presence.userName
  label.style.backgroundColor = presence.userColor
  
  cursor.appendChild(label)
  return cursor
}

function renderSelection(presence: Presence): HTMLElement {
  if (!presence.cursor.selection) return null
  
  const selection = document.createElement('div')
  selection.className = 'kindy-collaboration-selection'
  selection.style.backgroundColor = presence.userColor + '40'
  selection.style.left = `${presence.cursor.selection.from}px`
  selection.style.width = `${presence.cursor.selection.to - presence.cursor.selection.from}px`
  
  return selection
}
```

---

## 4. Awareness

### 4.1 User Status

Track user status:

```typescript
interface Awareness {
  userId: string
  userName: string
  userAvatar?: string
  status: 'active' | 'idle' | 'offline'
  lastActive: Date
  currentPage?: number
}

class AwarenessProvider {
  setLocalAwareness(awareness: Awareness): void {
    this.provider.awareness.setLocalStateField('awareness', awareness)
  }
  
  getRemoteAwareness(): Awareness[] {
    const states = this.provider.awareness.getStates()
    const awareness: Awareness[] = []
    
    states.forEach((state, clientId) => {
      if (state.awareness && clientId !== this.provider.clientID) {
        awareness.push(state.awareness)
      }
    })
    
    return awareness
  }
  
  onAwarenessChange(callback: (awareness: Awareness[]) => void): void {
    this.provider.awareness.on('change', () => {
      callback(this.getRemoteAwareness())
    })
  }
}
```

### 4.2 User List

Display active users:

```typescript
function UserList({ awareness }: { awareness: Awareness[] }) {
  return (
    <div className="kindy-user-list">
      {awareness.map(user => (
        <div key={user.userId} className="kindy-user-item">
          <img src={user.userAvatar} className="kindy-user-avatar" />
          <span className="kindy-user-name">{user.userName}</span>
          <span className={`kindy-user-status ${user.status}`} />
        </div>
      ))}
    </div>
  )
}
```

---

## 5. Offline Support

### 5.1 Local Storage

Store changes locally when offline:

```typescript
class OfflineProvider {
  private pendingChanges: any[] = []
  private isOnline: boolean = true
  
  constructor() {
    // Listen for online/offline events
    window.addEventListener('online', () => this.onOnline())
    window.addEventListener('offline', () => this.onOffline())
  }
  
  onOffline(): void {
    this.isOnline = false
    console.log('Working offline')
  }
  
  onOnline(): void {
    this.isOnline = true
    this.syncPendingChanges()
  }
  
  applyChange(change: any): void {
    if (this.isOnline) {
      this.applyOnline(change)
    } else {
      this.pendingChanges.push(change)
      this.saveToLocal()
    }
  }
  
  async syncPendingChanges(): Promise<void> {
    for (const change of this.pendingChanges) {
      await this.applyOnline(change)
    }
    this.pendingChanges = []
    this.clearLocal()
  }
  
  private saveToLocal(): void {
    localStorage.setItem('pendingChanges', JSON.stringify(this.pendingChanges))
  }
  
  private loadFromLocal(): void {
    const data = localStorage.getItem('pendingChanges')
    if (data) {
      this.pendingChanges = JSON.parse(data)
    }
  }
}
```

---

## 6. Conflict Resolution

### 6.1 Automatic Merge

Yjs handles conflicts automatically:

```typescript
// Yjs automatically merges changes from multiple users
// No manual conflict resolution needed

// Example:
// Client A inserts "Hello" at position 0
// Client B inserts "World" at position 0
// Result: "HelloWorld" (order may vary)
```

### 6.2 Last Writer Wins

For non-critical conflicts, use last writer wins:

```typescript
function resolveConflict(
  local: any,
  remote: any,
  localTimestamp: number,
  remoteTimestamp: number
): any {
  if (localTimestamp > remoteTimestamp) {
    return local
  }
  return remote
}
```

---

## 7. API Reference

### 7.1 Types

```typescript
interface Presence { ... }
interface Awareness { ... }
```

### 7.2 Collaboration API

```typescript
interface CollaborationAPI {
  // Connection
  connect(): void
  disconnect(): void
  isConnected(): boolean
  
  // Content
  getContent(): Document
  applyChanges(changes: any[]): void
  onChanges(callback: (changes: any[]) => void): () => void
  
  // Presence
  setPresence(presence: Presence): void
  getPresences(): Presence[]
  onPresenceChange(callback: (presences: Presence[]) => void): () => void
  
  // Awareness
  setAwareness(awareness: Awareness): void
  getAwareness(): Awareness[]
  onAwarenessChange(callback: (awareness: Awareness[]) => void): () => void
  
  // History
  getHistory(): HistoryEntry[]
  undo(): void
  redo(): void
}
```

### 7.3 WebSocket Server

```typescript
// Server setup
import { WebSocketServer } from 'ws'
import { setupWSConnection } from 'y-websocket/bin/utils'

const wss = new WebSocketServer({ port: 1234 })

wss.on('connection', (ws, req) => {
  setupWSConnection(ws, req)
})
```

---

## Appendix: References

- [Yjs Documentation](https://docs.yjs.dev/)
- [Yjs WebSocket Provider](https://github.com/yjs/y-websocket)
- [CRDT Paper](https://hal.inria.fr/inria-00609399v1/document)
