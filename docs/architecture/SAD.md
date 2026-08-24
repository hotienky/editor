# Software Architecture Document

# Open Document Platform

> Version: 1.0
> Date: 2026-08-07
> Status: Draft
> Author: Kindy Team

---

## Table of Contents

1. [Overview](#1-overview)
2. [Architecture Goals](#2-architecture-goals)
3. [System Architecture](#3-system-architecture)
4. [Document Model](#4-document-model)
5. [Layout Engine](#5-layout-engine)
6. [Render Engine](#6-render-engine)
7. [Storage](#7-storage)
8. [Collaboration](#8-collaboration)
9. [Plugin System](#9-plugin-system)
10. [API Contracts](#10-api-contracts)
11. [Non-functional Requirements](#11-non-functional-requirements)
12. [Migration Strategy](#12-migration-strategy)

---

## 1. Overview

### 1.1 Purpose

Open Document Platform is a modular, extensible document engine for building rich-text editors like Google Docs, Word Online, and OnlyOffice.

The platform provides:

- **Document Model**: AST-based document representation
- **Layout Engine**: Pagination, header/footer, section breaks
- **Render Engine**: DOM-based rendering with virtual scrolling
- **Storage**: Snapshots, operations, version history
- **Collaboration**: Real-time editing via CRDT
- **Plugin System**: Extensible architecture

### 1.2 Scope

The platform covers:

- Document creation and editing
- Layout and pagination
- Print and PDF export
- DOCX import/export
- Real-time collaboration
- Plugin development

### 1.3 Definitions

| Term | Definition |
|------|-----------|
| AST | Abstract Syntax Tree - tree representation of document structure |
| Layout Tree | Tree structure representing how content is distributed across pages |
| Block | A top-level content element (paragraph, heading, table, etc.) |
| Inline | Content within a block (text, bold, link, etc.) |
| Section | A group of pages with shared layout settings |
| Page | A single page in the document |

### 1.4 References

- [ProseMirror Guide](https://prosemirror.net/docs/guide/)
- [Tiptap Documentation](https://tiptap.dev/)
- [Google Docs Architecture](https://drive.google.com/)
- [Word Online](https://www.office.com/)
- [OnlyOffice](https://www.onlyoffice.com/)

---

## 2. Architecture Goals

### 2.1 Modularity

Each component is a separate package with clear boundaries:

```
@kindy/core           - Document, Node, Tree, Schema
@kindy/document       - Section, Paragraph, Inline nodes
@kindy/editor         - Commands, Transactions, Selection
@kindy/layout         - Layout Engine
@kindy/render         - Render Engine
@kindy/storage        - Storage Engine
@kindy/collaboration  - Collaboration Engine
@kindy/io             - Import/Export
@kindy/plugin         - Plugin System
@kindy/ai             - AI Platform
@kindy/editor-client  - Kindy Editor Client
@kindy/performance   - Performance Utilities
```

### 2.2 Extensibility

Plugins can extend functionality without modifying core:

```typescript
// Plugin API
editor.registerPlugin(MyPlugin)

// Plugin can:
editor.insertImage()
editor.addComment()
editor.insertTable()

// Plugin cannot:
document.querySelector(...)  // No direct DOM access
```

### 2.3 Performance

- Lazy rendering (only visible pages)
- Layout caching
- Web Worker for computation
- Incremental updates

### 2.4 Testability

Each component can be tested independently:

```typescript
// Layout Engine can be tested without DOM
const layout = layoutEngine.compute(nodes, pageOptions)
expect(layout.pages).toHaveLength(5)

// Render Engine can be tested without editor
const html = renderEngine.renderPage(layoutPage)
expect(html).toContain('kindy-print-page')
```

### 2.5 Framework Agnostic

Core logic has no dependency on React/Vue/Angular:

```
@kindy/core           - No framework dependency
@kindy/layout         - No framework dependency
@kindy/render         - No framework dependency
@kindy/react          - React adapter
@kindy/vue            - Vue adapter
```

---

## 3. System Architecture

### 3.1 Layer Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Application Layer                        │
│  (Kindy Editor, CRM Contract, CMS Editor, Mobile Apps)       │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                   Framework Adapters                        │
│  (React, Vue, Angular, Web Components)                      │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                     Render Engine                           │
│  (Page Renderer, Viewport Virtualizer, Header/Footer)      │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                     Layout Engine                           │
│  (Text Measurement, Line Breaking, Pagination, Sections)    │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                    Editing Engine                           │
│  (Commands, Transactions, Selection, History)               │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                    Document Model                           │
│  (AST, Schema, Serializer, Validator)                       │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│               Storage & Collaboration                       │
│  (Yjs, Snapshots, Versions, Operations)                    │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 Data Flow

```
User Action
    ↓
Command (InsertText, DeleteText, etc.)
    ↓
Transaction (step-based mutations)
    ↓
Document Model (AST update)
    ↓
Layout Engine (recompute layout)
    ↓
Layout Tree (pages with positions)
    ↓
Render Engine (HTML/CSS generation)
    ↓
DOM Update (virtual scrolling)
```

### 3.3 Package Structure

```
packages/
├── @kindy/document        # Document Model ✅
├── @kindy/layout          # Layout Engine ✅
├── @kindy/render          # Render Engine ✅
├── @kindy/editor          # Editing Engine ✅
├── @kindy/collaboration   # Collaboration Engine ✅
├── @kindy/storage         # Storage Engine ✅
├── @kindy/io              # Import/Export ✅
├── @kindy/plugin          # Plugin System ✅
├── @kindy/ai              # AI Platform ✅
├── @kindy/react           # React Adapter
├── @kindy/vue             # Vue Adapter
└── @kindy/editor-client   # Kindy Editor Client (Google Docs-like)
```

---

## 4. Document Model

### 4.1 AST Structure

The document is represented as an Abstract Syntax Tree (AST):

```typescript
interface Document {
  type: 'doc'
  content: Node[]
  attrs: Record<string, any>
}

interface Node {
  type: string
  attrs?: Record<string, any>
  content?: Node[]
  marks?: Mark[]
  text?: string  // only for text nodes
}

interface Mark {
  type: string
  attrs?: Record<string, any>
}
```

### 4.2 Node Types

**Block Nodes:**

| Node Type | Description |
|-----------|-------------|
| `doc` | Root document node |
| `section` | Section with layout settings |
| `paragraph` | Text paragraph |
| `heading` | Heading (h1-h6) |
| `blockquote` | Block quote |
| `codeBlock` | Code block |
| `bulletList` | Unordered list |
| `orderedList` | Ordered list |
| `listItem` | List item |
| `table` | Table |
| `tableRow` | Table row |
| `tableCell` | Table cell |
| `image` | Image |
| `video` | Video |
| `audio` | Audio |
| `horizontalRule` | Horizontal rule |
| `pageBreak` | Manual page break |
| `columnBreak` | Manual column break |

**Inline Nodes:**

| Node Type | Description |
|-----------|-------------|
| `text` | Text content |

**Mark Types:**

| Mark Type | Description |
|-----------|-------------|
| `bold` | Bold text |
| `italic` | Italic text |
| `code` | Inline code |
| `link` | Hyperlink |
| `strike` | Strikethrough |
| `underline` | Underline |
| `highlight` | Highlight |

### 4.3 Schema

The schema defines the structure of the document:

```typescript
interface Schema {
  nodes: Record<string, NodeSpec>
  marks: Record<string, MarkSpec>
}

interface NodeSpec {
  content?: string  // e.g., 'text*', 'block+', 'inline*'
  attrs?: Record<string, AttrSpec>
  group?: string    // e.g., 'block', 'inline'
  inline?: boolean
  atom?: boolean    // leaf node (no content editing)
  draggable?: boolean
  code?: boolean
  defining?: boolean
  linebreakReplacement?: boolean
  toDOM?: (node: Node) => DOMOutputSpec
  parseDOM?: ParseRule[]
}

interface MarkSpec {
  attrs?: Record<string, AttrSpec>
  inclusive?: boolean
  group?: string
  toDOM?: (mark: Mark, inline: boolean) => DOMOutputSpec
  parseDOM?: ParseRule[]
}
```

### 4.4 Serialization

```typescript
// ProseMirror JSON → Document AST
DocumentSerializer.fromProseMirror(pmJson: PNode): Document

// Document AST → ProseMirror JSON
DocumentSerializer.toProseMirror(doc: Document): PNode

// Document AST → HTML (for export)
DocumentSerializer.toHTML(doc: Document): string

// HTML → Document AST (for import)
DocumentSerializer.fromHTML(html: string): Document
```

### 4.5 Validation

```typescript
// Validate document structure
const result = validator.validate(document)
if (!result.valid) {
  console.error(result.errors)
}

// Auto-fix common issues
const fixed = validator.fix(document)
```

---

## 5. Layout Engine

See [Layout Engine Specification](./layout-engine.md) for details.

### 5.1 Overview

The Layout Engine converts Document AST into a Layout Tree:

```
Document AST
    ↓
Block Measurement
    ↓
Line Layout
    ↓
Paragraph Layout
    ↓
Table Layout
    ↓
Image Layout
    ↓
Page Layout
    ↓
Section Layout
    ↓
Layout Tree
```

### 5.2 Input/Output

**Input:**

- Document AST (from @kindy/document)
- Page Options (size, margins, orientation)

**Output:**

- Layout Tree (array of pages)
- Each page contains:
  - Page number
  - Content blocks with positions
  - Header/footer data

### 5.3 Key Algorithms

- **Text Measurement**: Canvas API with LRU cache
- **Line Breaking**: Knuth-Plass algorithm
- **Pagination**: Greedy page break algorithm
- **Table Layout**: Column width optimization

---

## 6. Render Engine

See [Render Engine Specification](./render-engine.md) for details.

### 6.1 Overview

The Render Engine converts Layout Tree into HTML/CSS:

```
Layout Tree
    ↓
Page Renderer
    ↓
HTML/CSS
    ↓
DOM Update (virtual scrolling)
```

### 6.2 Components

- **PageRenderer**: Generates HTML/CSS for a single page
- **ViewportVirtualizer**: Determines which pages to render
- **HeaderFooterRenderer**: Renders header/footer content

### 6.3 Virtual Scrolling

```
Total Pages: 1000
Visible Pages: 5 (with buffer)
Rendered Pages: 10 (5 visible + 5 buffer)

On scroll:
- Calculate visible range
- Render only visible pages
- Recycle DOM elements
```

---

## 7. Storage

See [Storage Specification](./storage.md) for details.

### 7.1 Storage Types

| Type | Description |
|------|-------------|
| Snapshot | Full document state at a point in time |
| Operation | Individual change (insert, delete, move) |
| Version | Named checkpoint with metadata |

### 7.2 Storage Strategy

```
Snapshot Storage (every N operations)
    ↓
Operation Storage (all operations)
    ↓
Version History (named checkpoints)
```

### 7.3 Database Schema

```sql
-- Documents
CREATE TABLE documents (
  id UUID PRIMARY KEY,
  title TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- Snapshots
CREATE TABLE snapshots (
  id UUID PRIMARY KEY,
  document_id UUID,
  content JSONB,
  version INTEGER,
  created_at TIMESTAMP
);

-- Operations
CREATE TABLE operations (
  id UUID PRIMARY KEY,
  document_id UUID,
  type TEXT,
  data JSONB,
  version INTEGER,
  created_at TIMESTAMP
);

-- Versions
CREATE TABLE versions (
  id UUID PRIMARY KEY,
  document_id UUID,
  name TEXT,
  snapshot_id UUID,
  created_at TIMESTAMP
);
```

---

## 8. Collaboration

See [Collaboration Specification](./collaboration.md) for details.

### 8.1 CRDT Integration

We use Yjs for CRDT-based collaboration:

```
Client A ←→ Yjs Document ←→ Client B
                ↕
           Server (Yjs WebSocket)
```

### 8.2 Features

- **Presence**: Show user cursors and selections
- **Awareness**: Show user status (idle, active)
- **Offline**: Work offline, sync when reconnected
- **Conflict Resolution**: Automatic merge via CRDT

### 8.3 Architecture

```
@kindy/collaboration
├── YjsProvider      # Yjs document management
├── PresenceProvider  # User presence
├── SyncProvider     # Offline sync
└── AwarenessProvider # User awareness
```

---

## 9. Plugin System

See [Plugin API Specification](./plugin-api.md) for details.

### 9.1 Plugin API

```typescript
interface Plugin {
  name: string
  version: string
  
  // Lifecycle
  onInit?(editor: Editor): void
  onDestroy?(editor: Editor): void
  
  // Commands
  commands?: Record<string, Command>
  
  // Keyboard shortcuts
  shortcuts?: Record<string, Command>
  
  // Schema extensions
  schema?: SchemaExtension
  
  // UI extensions
  toolbar?: ToolbarItem[]
  menu?: MenuItem[]
}
```

### 9.2 Plugin Restrictions

Plugins can:

- Call editor API (insertImage, addComment, etc.)
- Register commands
- Register keyboard shortcuts
- Extend schema
- Add UI elements

Plugins cannot:

- Access DOM directly
- Modify core behavior
- Access other plugins' state

---

## 10. API Contracts

### 10.1 Document API

```typescript
interface DocumentAPI {
  // Create
  createDocument(content?: Node[]): Document
  
  // Query
  getNode(path: number[]): Node
  getNodes(type: string): Node[]
  findNodes(predicate: (node: Node) => boolean): Node[]
  
  // Mutate
  insertNode(path: number[], node: Node): void
  deleteNode(path: number[]): void
  moveNode(from: number[], to: number[]): void
  replaceNode(path: number[], node: Node): void
}
```

### 10.2 Layout API

```typescript
interface LayoutAPI {
  // Compute
  compute(nodes: Node[], options: PageOptions): LayoutTree
  computeAndCache(nodes: Node[], options: PageOptions): LayoutTree
  
  // Query
  getPageAtY(y: number): number
  getYForPage(pageNumber: number): number
  getPageDimensions(pageNumber: number): PageDimensions
}
```

### 10.3 Render API

```typescript
interface RenderAPI {
  // Render
  renderPage(layoutPage: LayoutPage): string
  renderHeader(pageNumber: number): string
  renderFooter(pageNumber: number): string
  
  // Virtual scrolling
  getVisiblePages(scrollTop: number, containerHeight: number): number[]
}
```

### 10.4 Editor API

```typescript
interface EditorAPI {
  // Commands
  execute(command: Command): void
  insertText(text: string): void
  deleteText(from: number, to: number): void
  insertNode(type: string, attrs?: Record<string, any>): void
  
  // Selection
  getSelection(): Selection
  setSelection(from: number, to: number): void
  
  // History
  undo(): void
  redo(): void
  canUndo(): boolean
  canRedo(): boolean
}
```

---

## 11. Non-functional Requirements

### 11.1 Performance

| Metric | Target |
|--------|--------|
| Layout computation (100 pages) | < 500ms |
| Render time (visible pages) | < 100ms |
| Input latency | < 16ms (60fps) |
| Memory usage (1000 pages) | < 500MB |

### 11.2 Scalability

- Support documents up to 10,000 pages
- Support tables up to 1000 rows
- Support images up to 10MB
- Support collaboration with 100+ users

### 11.3 Testability

- Unit test coverage > 80%
- Integration test coverage > 60%
- E2E test coverage for critical paths
- Performance benchmarks

### 11.4 Documentation

- API documentation (TypeDoc)
- Architecture documentation (this document)
- User guide
- Plugin development guide

---

## 12. Migration Strategy

### 12.1 From Current Codebase

The current codebase has:

- `src/model/` → Will become `@kindy/document`
- `src/layout/` → Will become `@kindy/layout`
- `src/render/` → Will become `@kindy/render`
- `src/editing/` → Will become `@kindy/editor`

### 12.2 Backward Compatibility

Kindy Editor will continue to work during migration:

1. Create new packages alongside existing code
2. gradually migrate functionality
3. Keep Kindy Editor as the "client" of the packages
4. Remove old code after migration is complete

### 12.3 Migration Steps

1. **Phase 0**: Create documentation ✅
2. **Phase 1**: Create `@kindy/*` packages ✅
3. **Phase 2**: Migrate imports to `@kindy/*` ✅
4. **Phase 3**: Layout Engine improvements ✅
5. **Phase 4**: Render Engine improvements ✅
6. **Phase 5**: Collaboration improvements ✅
7. **Phase 6**: Storage Engine ✅
8. **Phase 7**: IO Engine (Import/Export) ✅
9. **Phase 8**: Plugin System ✅
10. **Phase 9**: AI Platform ✅
11. **Phase 10**: Framework Adapters (React/Vue) ✅
12. **Phase 11**: Kindy Editor Client ✅
13. **Phase 12**: Testing & Quality Assurance ✅
14. **Phase 13**: Performance Optimization ✅
15. **Phase 14**: Documentation & Examples ✅

---

## Appendix A: Architecture Decision Records

- [ADR-001: Use ProseMirror as Foundation](../adr/001-use-proseMirror-as-foundation.md)
- [ADR-002: Layout Engine Approach](../adr/002-layout-engine-approach.md)
- [ADR-003: Render Strategy](../adr/003-render-strategy.md)

## Appendix B: Related Documents

- [Document Model Specification](./document-model.md)
- [Layout Engine Specification](./layout-engine.md)
- [Render Engine Specification](./render-engine.md)
- [Storage Specification](./storage.md)
- [Collaboration Specification](./collaboration.md)
- [Plugin API Specification](./plugin-api.md)
