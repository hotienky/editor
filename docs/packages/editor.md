# @umo/editor

Editor commands and transactions package.

## Installation

```bash
npm install @umo/editor
```

## Quick Start

```javascript
import { Editor, UndoManager } from '@umo/editor'

const editor = new Editor()

// Execute commands
editor.command('insertText', { text: 'Hello World' })

// Create transactions
const tr = editor.transaction()
tr.insert(0, { type: 'text', text: 'Hello' })
editor.apply(tr)

// Undo/Redo
const undoManager = new UndoManager()
undoManager.add(tr)
undoManager.undo()
undoManager.redo()
```

## API Reference

### `Editor`

Main editor class.

#### `command(name, params)`

Executes a command.

**Parameters:**
- `name` (String): Command name
- `params` (Object): Command parameters

**Available Commands:**
- `insertText` - Insert text
- `deleteText` - Delete text
- `formatText` - Apply formatting
- `setBlockType` - Change block type

#### `transaction()`

Creates a new transaction.

**Returns:** Transaction instance

#### `apply(transaction)`

Applies a transaction to the document.

### `Transaction`

Represents a document change.

#### `insert(position, content)`

Inserts content at position.

#### `delete(from, to)`

Deletes content between positions.

#### `replace(from, to, content)`

Replaces content between positions.

### `UndoManager`

Manages undo/redo history.

#### `add(transaction)`

Adds a transaction to history.

#### `undo()`

Undoes the last operation.

#### `redo()`

Redoes the last undone operation.

#### `canUndo()`

Returns true if undo is available.

#### `canRedo()`

Returns true if redo is available.

## Commands Reference

### Text Commands

```javascript
// Insert text
editor.command('insertText', { text: 'Hello' })

// Delete text
editor.command('deleteText', { from: 0, to: 5 })
```

### Formatting Commands

```javascript
// Apply bold
editor.command('formatText', {
  from: 0,
  to: 5,
  marks: [{ type: 'bold' }],
})

// Remove formatting
editor.command('removeMarks', {
  from: 0,
  to: 5,
  markType: 'bold',
})
```

### Block Commands

```javascript
// Change block type
editor.command('setBlockType', {
  position: 0,
  type: 'heading',
  attrs: { level: 1 },
})
```

## Transactions

```javascript
// Create transaction
const tr = editor.transaction()

// Add steps
tr.insert(0, { type: 'text', text: 'Hello' })
tr.insert(5, { type: 'text', text: ' World' })

// Apply all changes at once
editor.apply(tr)

// Transactions can be undone
undoManager.add(tr)
undoManager.undo()
```
