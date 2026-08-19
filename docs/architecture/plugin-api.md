# Plugin API Specification

> Version: 1.0
> Date: 2026-08-07
> Status: Draft

---

## Table of Contents

1. [Overview](#1-overview)
2. [Plugin Interface](#2-plugin-interface)
3. [Plugin Lifecycle](#3-plugin-lifecycle)
4. [Plugin API](#4-plugin-api)
5. [Plugin Restrictions](#5-plugin-restrictions)
6. [Plugin Examples](#6-plugin-examples)
7. [API Reference](#7-api-reference)

---

## 1. Overview

### 1.1 Purpose

The Plugin System allows extending the editor functionality without modifying the core.

### 1.2 Design Principles

1. **Isolated**: Plugins cannot interfere with each other
2. **Declarative**: Plugins declare what they need
3. **Safe**: Plugins cannot access DOM directly
4. **Composable**: Multiple plugins can work together

---

## 2. Plugin Interface

### 2.1 Plugin Definition

```typescript
interface Plugin {
  name: string
  version: string
  description?: string
  
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
  sidebar?: SidebarItem[]
  
  // Events
  onTransaction?(transaction: Transaction): void
  onSelectionChange?(selection: Selection): void
  onFocus?(): void
  onBlur?(): void
}
```

### 2.2 Command

```typescript
interface Command {
  name: string
  description?: string
  icon?: string
  
  execute: (editor: Editor, params?: any) => void
  isEnabled?: (editor: Editor) => boolean
  isActive?: (editor: Editor) => boolean
}
```

### 2.3 Schema Extension

```typescript
interface SchemaExtension {
  nodes?: Record<string, NodeSpec>
  marks?: Record<string, MarkSpec>
}
```

---

## 3. Plugin Lifecycle

### 3.1 Registration

```typescript
// Register a plugin
editor.registerPlugin(MyPlugin)

// Register multiple plugins
editor.registerPlugin([PluginA, PluginB, PluginC])
```

### 3.2 Initialization

```typescript
// Plugin is initialized when editor is created
const editor = new Editor({
  plugins: [MyPlugin]
})

// Or register later
editor.registerPlugin(MyPlugin)
```

### 3.3 Destruction

```typescript
// Plugin is destroyed when editor is destroyed
editor.destroy()

// Or unregister manually
editor.unregisterPlugin('my-plugin')
```

---

## 4. Plugin API

### 4.1 Editor API

Plugins can access the editor API:

```typescript
const MyPlugin: Plugin = {
  name: 'my-plugin',
  version: '1.0.0',
  
  onInit(editor) {
    // Access editor API
    editor.insertText('Hello')
    editor.insertImage({ src: 'image.png' })
    editor.addComment({ text: 'Comment' })
  }
}
```

### 4.2 Available Commands

```typescript
interface EditorAPI {
  // Text operations
  insertText(text: string): void
  deleteText(from: number, to: number): void
  replaceText(from: number, to: number, text: string): void
  
  // Node operations
  insertNode(type: string, attrs?: Record<string, any>): void
  deleteNode(position: number): void
  moveNode(from: number, to: number): void
  
  // Selection
  getSelection(): Selection
  setSelection(from: number, to: number): void
  selectAll(): void
  
  // Formatting
  setMark(type: string, attrs?: Record<string, any>): void
  unsetMark(type: string): void
  toggleMark(type: string): void
  
  // History
  undo(): void
  redo(): void
  canUndo(): boolean
  canRedo(): boolean
  
  // Document
  getDocument(): Document
  setDocument(doc: Document): void
  getHTML(): string
  setHTML(html: string): void
  
  // Collaboration
  getCollaborationProvider(): CollaborationProvider | null
  
  // Storage
  save(): Promise<void>
  load(): Promise<void>
}
```

---

## 5. Plugin Restrictions

### 5.1 Allowed

Plugins can:

- Call editor API
- Register commands
- Register keyboard shortcuts
- Extend schema
- Add UI elements
- Listen to events

### 5.2 Forbidden

Plugins cannot:

- Access DOM directly (`document.querySelector(...)`)
- Modify core behavior
- Access other plugins' state
- Import core modules directly
- Override security policies

### 5.3 Sandboxing

```typescript
// Plugin runs in a sandboxed environment
const pluginContext = {
  editor: sandboxedEditorAPI,
  document: null,  // No access to DOM document
  window: null,    // No access to DOM window
  console: console // Can log to console
}

// Plugin code is executed with this context
executePlugin(plugin, pluginContext)
```

---

## 6. Plugin Examples

### 6.1 Image Plugin

```typescript
const ImagePlugin: Plugin = {
  name: 'image',
  version: '1.0.0',
  
  commands: {
    insertImage: {
      name: 'insertImage',
      description: 'Insert an image',
      icon: 'image',
      
      execute(editor, params) {
        editor.insertNode('image', {
          src: params.src,
          alt: params.alt || '',
          title: params.title || ''
        })
      },
      
      isEnabled(editor) {
        return editor.getSelection() !== null
      }
    }
  },
  
  shortcuts: {
    'Mod+Shift+I': 'insertImage'
  },
  
  schema: {
    nodes: {
      image: {
        group: 'inline',
        atom: true,
        attrs: {
          src: {},
          alt: { default: '' },
          title: { default: '' }
        }
      }
    }
  },
  
  toolbar: [
    {
      type: 'button',
      icon: 'image',
      command: 'insertImage',
      tooltip: 'Insert Image'
    }
  ]
}
```

### 6.2 Comment Plugin

```typescript
const CommentPlugin: Plugin = {
  name: 'comment',
  version: '1.0.0',
  
  commands: {
    addComment: {
      name: 'addComment',
      description: 'Add a comment',
      icon: 'comment',
      
      execute(editor, params) {
        const selection = editor.getSelection()
        if (!selection) return
        
        editor.addComment({
          text: params.text,
          from: selection.from,
          to: selection.to
        })
      }
    },
    
    resolveComment: {
      name: 'resolveComment',
      description: 'Resolve a comment',
      
      execute(editor, params) {
        editor.resolveComment(params.commentId)
      }
    }
  },
  
  shortcuts: {
    'Mod+Shift+M': 'addComment'
  },
  
  onTransaction(transaction) {
    // Highlight commented text
    const comments = transaction.doc.getComments()
    // Apply decorations
  }
}
```

### 6.3 Table Plugin

```typescript
const TablePlugin: Plugin = {
  name: 'table',
  version: '1.0.0',
  
  commands: {
    insertTable: {
      name: 'insertTable',
      description: 'Insert a table',
      icon: 'table',
      
      execute(editor, params) {
        const rows = params.rows || 3
        const cols = params.cols || 3
        
        editor.insertNode('table', {
          rows,
          cols
        })
      }
    },
    
    addRow: {
      name: 'addRow',
      description: 'Add a row',
      
      execute(editor) {
        editor.insertTableRow()
      }
    },
    
    addColumn: {
      name: 'addColumn',
      description: 'Add a column',
      
      execute(editor) {
        editor.insertTableColumn()
      }
    },
    
    deleteRow: {
      name: 'deleteRow',
      description: 'Delete a row',
      
      execute(editor) {
        editor.deleteTableRow()
      }
    },
    
    deleteColumn: {
      name: 'deleteColumn',
      description: 'Delete a column',
      
      execute(editor) {
        editor.deleteTableColumn()
      }
    }
  },
  
  schema: {
    nodes: {
      table: {
        group: 'block',
        content: 'tableRow+'
      },
      tableRow: {
        content: 'tableCell+'
      },
      tableCell: {
        content: 'paragraph block*'
      }
    }
  },
  
  toolbar: [
    {
      type: 'dropdown',
      icon: 'table',
      items: [
        { label: 'Insert Table', command: 'insertTable' },
        { label: 'Add Row', command: 'addRow' },
        { label: 'Add Column', command: 'addColumn' },
        { label: 'Delete Row', command: 'deleteRow' },
        { label: 'Delete Column', command: 'deleteColumn' }
      ]
    }
  ]
}
```

---

## 7. API Reference

### 7.1 Types

```typescript
interface Plugin { ... }
interface Command { ... }
interface SchemaExtension { ... }
interface ToolbarItem { ... }
interface MenuItem { ... }
interface SidebarItem { ... }
```

### 7.2 Plugin Manager API

```typescript
interface PluginManager {
  // Registration
  register(plugin: Plugin): void
  unregister(name: string): void
  
  // Query
  get(name: string): Plugin | null
  getAll(): Plugin[]
  
  // Commands
  getCommand(name: string): Command | null
  executeCommand(name: string, params?: any): void
  
  // Events
  onInit(callback: (editor: Editor) => void): void
  onDestroy(callback: (editor: Editor) => void): void
}
```

### 7.3 Editor Plugin API

```typescript
interface Editor {
  // Plugin management
  registerPlugin(plugin: Plugin): void
  unregisterPlugin(name: string): void
  getPlugin(name: string): Plugin | null
  
  // Command execution
  execute(command: string, params?: any): void
}
```

---

## Appendix: References

- [Tiptap Extensions](https://tiptap.dev/guide/custom-extensions)
- [ProseMirror Plugins](https://prosemirror.net/docs/guide/)
- [VS Code Extension API](https://code.visualstudio.com/api)
