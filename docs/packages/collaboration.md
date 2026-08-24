# @kindy/collaboration

Real-time collaboration package using Yjs CRDT.

## Installation

```bash
npm install @kindy/collaboration
```

## Quick Start

```javascript
import { CollaborationProtocol, PresenceManager, VersionHistory } from '@kindy/collaboration'

// Connect to collaboration server
const protocol = new CollaborationProtocol()

await protocol.connect('doc-1', {
  url: 'ws://localhost:1234',
  user: { id: 'user-1', name: 'John Doe' },
})

// Track presence
const presence = new PresenceManager(protocol)

presence.addUser({
  id: 'user-1',
  name: 'John Doe',
  color: '#ff0000',
})

presence.updateCursor('user-1', {
  anchor: 10,
  head: 15,
})

// Version history
const history = new VersionHistory(protocol)

history.on('change', (versions) => {
  console.log('Versions:', versions)
})
```

## API Reference

### `CollaborationProtocol`

Manages WebSocket connection and Yjs document.

#### `connect(docName, options)`

Connects to a collaboration server.

**Options:**
- `url` (String): WebSocket server URL
- `user` (Object): User information

#### `disconnect()`

Disconnects from the server.

#### `getDocument()`

Returns the Yjs document.

#### `getAwareness()`

Returns the awareness instance.

### `PresenceManager`

Manages user presence and cursors.

#### `addUser(user)`

Adds a user to presence.

**User object:**
```javascript
{
  id: 'user-1',
  name: 'John Doe',
  color: '#ff0000',
  avatar: 'https://...', // Optional
}
```

#### `removeUser(userId)`

Removes a user from presence.

#### `updateCursor(userId, cursor)`

Updates user cursor position.

**Cursor object:**
```javascript
{
  anchor: 10,  // Anchor position
  head: 15,    // Head position
}
```

#### `getUsers()`

Returns all connected users.

#### `getCursor(userId)`

Returns cursor for a specific user.

### `VersionHistory`

Manages document version history.

#### `on(event, callback)`

Listens for version events.

**Events:**
- `change` - Version list changed
- `add` - New version added

#### `getVersions()`

Returns all versions.

#### `revertToVersion(versionId)`

Reverts document to a specific version.

## WebSocket Protocol

The collaboration uses Yjs WebSocket protocol:

```javascript
// Client
const ws = new WebSocket('ws://localhost:1234/doc-1')

// Messages are binary (Yjs encoding)
ws.onmessage = (event) => {
  const data = new Uint8Array(event.data)
  Y.applyUpdate(doc, data)
}
```

## Awareness Protocol

Presence information is synchronized via awareness:

```javascript
// Set local state
awareness.setLocalState({
  user: { name: 'John Doe' },
  cursor: { anchor: 10, head: 15 },
})

// Listen for changes
awareness.on('change', () => {
  const states = awareness.getStates()
  console.log('Connected users:', states.size)
})
```
