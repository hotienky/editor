# ProseMirror/Tiptap Architecture Analysis

> Status: Completed
> Date: 2026-08-07

## Overview

ProseMirror is a toolkit for building rich-text editors. Tiptap is a wrapper around ProseMirror that provides a simpler API and Vue/React integration.

## Architecture

### Core Modules

```
prosemirror-model      → Document Model (AST)
prosemirror-state      → Editor State (selection, transactions)
prosemirror-view       → DOM rendering and user interaction
prosemirror-transform  → Document modifications (steps)
```

### Layer Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                      Application Layer                      │
│  (Tiptap, Custom Extensions)                                │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                    ProseMirror State                        │
│  (Document, Selection, StoredMarks, Plugins)                │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                    ProseMirror Transform                    │
│  (Steps, Mappings, Transactions)                            │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                    ProseMirror Model                        │
│  (Nodes, Marks, Schema, Fragments)                          │
└─────────────────────────────────────────────────────────────┘
```

## Document Model

### Node Structure

ProseMirror documents are trees of nodes:

```
Document
├── Paragraph
│   ├── Text "Hello "
│   ├── Text "World" (with Bold mark)
│   └── Text "!"
├── Heading
│   └── Text "Title"
└── Blockquote
    └── Paragraph
        └── Text "Quote"
```

### Key Concepts

1. **Immutable Values**: Nodes are immutable values, not stateful objects
2. **Persistent Data Structure**: Sharing unchanged sub-nodes is cheap
3. **One Valid Representation**: Adjacent text nodes with same marks are combined
4. **Position System**: Flat token-based indexing

### Schema

```typescript
const schema = new Schema({
  nodes: {
    doc: { content: "block+" },
    paragraph: { group: "block", content: "text*" },
    heading: { group: "block", content: "text*", attrs: { level: { default: 1 } } },
    text: { inline: true }
  },
  marks: {
    bold: {},
    italic: {}
  }
})
```

### Content Expressions

- `"paragraph+"` → one or more paragraphs
- `"text*"` → zero or more text nodes
- `"(paragraph | blockquote)+"` → one or more paragraphs or blockquotes
- `"block+"` → one or more block nodes (via group)

## State Management

### Editor State

```typescript
interface EditorState {
  doc: Node           // The document
  selection: Selection // Current selection
  storedMarks: Mark[] // Active marks
  plugins: Plugin[]   // Registered plugins
}
```

### Transactions

All changes go through transactions:

```typescript
// Create a transaction
let tr = state.tr
tr.insertText("hello")
tr.setSelection(TextSelection.create(tr.doc, 3))

// Apply transaction
let newState = state.apply(tr)
```

### Steps

Transactions are composed of steps:

- `ReplaceStep`: Replace a range of content
- `AddMarkStep`: Add a mark to a range
- `RemoveMarkStep`: Remove a mark from a range

### Mappings

Steps can be mapped through each other:

```typescript
let map = step.getMap()
let newPos = map.map(oldPos)
```

## Plugin System

### Plugin Definition

```typescript
const myPlugin = new Plugin({
  state: {
    init() { return 0 },
    apply(tr, value) { return value + 1 }
  },
  props: {
    handleKeyDown(view, event) {
      console.log("Key pressed!")
      return false
    }
  }
})
```

### Plugin Capabilities

1. **State Management**: Define and manage plugin state
2. **Props Extension**: Add props to editor view
3. **Transaction Handling**: React to document changes
4. **Decorations**: Add visual decorations to the document

## Strengths

1. **Modular Design**: Only include what you need
2. **Full Control**: Your code controls the document
3. **Immutable Data**: No invalid states
4. **Extensible**: Rich plugin ecosystem
5. **Transaction-based**: All changes are tracked

## Weaknesses

1. **Learning Curve**: Complex concepts (nodes, steps, mappings)
2. **No Built-in Pagination**: Layout engine must be added
3. **No Built-in Collaboration**: Requires external solution (Yjs)
4. **No WYSIWYG**: Not true WYSIWYG by default

## Lessons Learned for UMO

1. **AST-based Model**: Use ProseMirror's document model as foundation
2. **Transaction System**: Track all changes through transactions
3. **Plugin Architecture**: Extensible via plugins
4. **Need Layout Engine**: ProseMirror lacks pagination
5. **Need Collaboration**: ProseMirror lacks real-time collaboration

---

## References

- [ProseMirror Guide](https://prosemirror.net/docs/guide/)
- [Tiptap Documentation](https://tiptap.dev/)
- [ProseMirror GitHub](https://github.com/ProseMirror/prosemirror)
