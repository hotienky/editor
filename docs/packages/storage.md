# @umo/storage

Storage engine for document persistence.

## Installation

```bash
npm install @umo/storage
```

## Quick Start

```javascript
import {
  SnapshotStorage,
  OperationStorage,
  VersionStorage,
  LocalStorageAdapter,
} from '@umo/storage'

// Create storage with adapter
const adapter = new LocalStorageAdapter()
const snapshots = new SnapshotStorage(adapter)
const operations = new OperationStorage(adapter)
const versions = new VersionStorage(adapter)

// Save a snapshot
await snapshots.create({
  id: 'snap-1',
  document: { type: 'doc', content: [] },
  timestamp: Date.now(),
})

// Get snapshot
const snapshot = await snapshots.get('snap-1')

// Get all snapshots for a document
const allSnapshots = await snapshots.getAll('doc-1')
```

## API Reference

### Storage Adapters

#### `LocalStorageAdapter`

Uses browser localStorage.

```javascript
const adapter = new LocalStorageAdapter()
```

### `SnapshotStorage`

Manages document snapshots.

#### `create(snapshot)`

Creates a new snapshot.

**Snapshot object:**
```javascript
{
  id: 'snap-1',
  documentId: 'doc-1',
  document: { type: 'doc', content: [...] },
  timestamp: Date.now(),
}
```

#### `get(id)`

Gets a snapshot by ID.

#### `getAll(documentId)`

Gets all snapshots for a document.

#### `delete(id)`

Deletes a snapshot.

### `OperationStorage`

Manages document operations for collaboration.

#### `add(operation)`

Adds an operation.

**Operation object:**
```javascript
{
  id: 'op-1',
  documentId: 'doc-1',
  type: 'insert',
  position: 0,
  content: 'Hello',
  userId: 'user-1',
  timestamp: Date.now(),
}
```

#### `getByDocument(documentId)`

Gets all operations for a document.

#### `getAfter(documentId, timestamp)`

Gets operations after a timestamp.

### `VersionStorage`

Manages document versions.

#### `save(version)`

Saves a version.

**Version object:**
```javascript
{
  id: 'ver-1',
  documentId: 'doc-1',
  document: { type: 'doc', content: [...] },
  timestamp: Date.now(),
  userId: 'user-1',
  description: 'Initial version',
}
```

#### `getByDocument(documentId)`

Gets all versions for a document.

#### `getLatest(documentId)`

Gets the latest version.

## Usage with Layout Cache

```javascript
import { CacheManager, LayoutCache } from '@umo/performance'
import { LocalStorageAdapter } from '@umo/storage'

const adapter = new LocalStorageAdapter()
const cache = new CacheManager()
const layoutCache = new LayoutCache(cache)

// Cache layout computation
const docHash = 'abc123'
const pageOptions = { size: { width: 21, height: 29.7 } }

// Check cache first
let layout = layoutCache.get(docHash, pageOptions)

if (!layout) {
  // Compute and cache
  layout = engine.compute(blocks, pageOptions)
  layoutCache.set(docHash, pageOptions, layout)
}
```
