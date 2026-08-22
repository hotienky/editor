# Storage & Versioning Specification

> Version: 1.0
> Date: 2026-08-07
> Status: Draft

---

## Table of Contents

1. [Overview](#1-overview)
2. [Storage Types](#2-storage-types)
3. [Storage Strategy](#3-storage-strategy)
4. [Database Schema](#4-database-schema)
5. [Version History](#5-version-history)
6. [API Reference](#6-api-reference)

---

## 1. Overview

### 1.1 Purpose

The Storage Engine handles document persistence, snapshots, operations, and version history.

### 1.2 Design Principles

1. **Immutable Snapshots**: Snapshots are never modified
2. **Append-only Operations**: Operations are only added, never deleted
3. **Named Versions**: Users can create named checkpoints
4. **Efficient Storage**: Use compression and delta encoding

---

## 2. Storage Types

### 2.1 Snapshot

A complete document state at a point in time.

```typescript
interface Snapshot {
  id: string
  documentId: string
  content: Document
  version: number
  createdAt: Date
  metadata?: {
    author?: string
    description?: string
  }
}
```

### 2.2 Operation

An individual change to the document.

```typescript
interface Operation {
  id: string
  documentId: string
  type: 'insert' | 'delete' | 'move' | 'replace' | 'format'
  position: number
  data: any
  version: number
  createdAt: Date
  author?: string
}
```

### 2.3 Version

A named checkpoint with metadata.

```typescript
interface Version {
  id: string
  documentId: string
  name: string
  snapshotId: string
  description?: string
  createdAt: Date
  author?: string
}
```

---

## 3. Storage Strategy

### 3.1 Hybrid Approach

Combine snapshots and operations for efficient storage:

```
Snapshot (v1) → Operation 1 → Operation 2 → ... → Operation N → Snapshot (v2)
     ↓                                                                         ↓
  Full state                                                              Full state
```

### 3.2 Snapshot Frequency

Create snapshots at regular intervals:

```typescript
interface SnapshotConfig {
  interval: number        // Create snapshot every N operations
  maxSnapshots: number    // Maximum snapshots to keep
  compress: boolean       // Compress old snapshots
}

const defaultConfig: SnapshotConfig = {
  interval: 100,
  maxSnapshots: 50,
  compress: true
}
```

### 3.3 Operation Compression

Compress old operations:

```typescript
function compressOperations(operations: Operation[]): Operation[] {
  // Group consecutive operations of the same type
  // Merge adjacent insert/delete operations
  // Remove operations that cancel each other out
  
  return compressed
}
```

---

## 4. Database Schema

### 4.1 Documents Table

```sql
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  owner_id UUID REFERENCES users(id),
  is_deleted BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_documents_owner ON documents(owner_id);
CREATE INDEX idx_documents_updated ON documents(updated_at);
```

### 4.2 Snapshots Table

```sql
CREATE TABLE snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  content JSONB NOT NULL,
  version INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  metadata JSONB,
  
  UNIQUE(document_id, version)
);

CREATE INDEX idx_snapshots_document ON snapshots(document_id);
CREATE INDEX idx_snapshots_version ON snapshots(document_id, version);
```

### 4.3 Operations Table

```sql
CREATE TABLE operations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  position INTEGER NOT NULL,
  data JSONB NOT NULL,
  version INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  author_id UUID REFERENCES users(id),
  
  UNIQUE(document_id, version)
);

CREATE INDEX idx_operations_document ON operations(document_id);
CREATE INDEX idx_operations_version ON operations(document_id, version);
```

### 4.4 Versions Table

```sql
CREATE TABLE versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  snapshot_id UUID REFERENCES snapshots(id),
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  author_id UUID REFERENCES users(id)
);

CREATE INDEX idx_versions_document ON versions(document_id);
```

---

## 5. Version History

### 5.1 Version Timeline

```
v1 (snapshot) → op1 → op2 → op3 → v2 (snapshot) → op4 → op5 → v3 (named)
     ↓                                                              ↓
  "Initial draft"                                              "Final version"
```

### 5.2 Version Comparison

```typescript
function compareVersions(
  versionA: Snapshot,
  versionB: Snapshot
): Diff {
  // Compare two snapshots and return differences
  
  return {
    added: [...],    // Nodes added
    removed: [...],  // Nodes removed
    modified: [...]  // Nodes modified
  }
}
```

### 5.3 Version Restore

```typescript
function restoreVersion(
  documentId: string,
  versionId: string
): Document {
  // Get the snapshot for the specified version
  const snapshot = getSnapshot(versionId)
  
  // Get all operations after the snapshot
  const operations = getOperationsAfter(documentId, snapshot.version)
  
  // Apply operations to get current state
  let doc = snapshot.content
  for (const op of operations) {
    doc = applyOperation(doc, op)
  }
  
  return doc
}
```

---

## 6. API Reference

### 6.1 Types

```typescript
interface Snapshot { ... }
interface Operation { ... }
interface Version { ... }
interface SnapshotConfig { ... }
```

### 6.2 Storage API

```typescript
interface StorageAPI {
  // Documents
  createDocument(title: string): Document
  getDocument(id: string): Document | null
  updateDocument(id: string, updates: Partial<Document>): void
  deleteDocument(id: string): void
  
  // Snapshots
  createSnapshot(documentId: string, content: Document): Snapshot
  getSnapshot(id: string): Snapshot | null
  getLatestSnapshot(documentId: string): Snapshot | null
  
  // Operations
  addOperation(documentId: string, operation: Operation): Operation
  getOperations(documentId: string, fromVersion?: number): Operation[]
  
  // Versions
  createVersion(documentId: string, name: string, description?: string): Version
  getVersions(documentId: string): Version[]
  getVersion(id: string): Version | null
  
  // History
  getHistory(documentId: string): HistoryEntry[]
  restoreVersion(documentId: string, versionId: string): Document
}
```

### 6.3 Local Storage

For browser-based storage:

```typescript
class LocalStorage implements StorageAPI {
  private prefix = 'kindy:'
  
  createDocument(title: string): Document {
    const doc = { id: generateId(), title, content: { type: 'doc', content: [] } }
    localStorage.setItem(`${this.prefix}doc:${doc.id}`, JSON.stringify(doc))
    return doc
  }
  
  getDocument(id: string): Document | null {
    const data = localStorage.getItem(`${this.prefix}doc:${id}`)
    return data ? JSON.parse(data) : null
  }
  
  // ... other methods
}
```

### 6.4 Server Storage

For server-based storage:

```typescript
class ServerStorage implements StorageAPI {
  private baseUrl: string
  
  constructor(baseUrl: string) {
    this.baseUrl = baseUrl
  }
  
  async createDocument(title: string): Promise<Document> {
    const response = await fetch(`${this.baseUrl}/documents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title })
    })
    return response.json()
  }
  
  async getDocument(id: string): Promise<Document | null> {
    const response = await fetch(`${this.baseUrl}/documents/${id}`)
    if (!response.ok) return null
    return response.json()
  }
  
  // ... other methods
}
```

---

## Appendix: References

- [CRDT](https://crdt.tech/)
- [Yjs](https://docs.yjs.dev/)
- [Firebase Realtime Database](https://firebase.google.com/docs/database)
