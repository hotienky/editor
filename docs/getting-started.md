# Getting Started with Open Document Platform

A modular document engine for building Google Docs-like editors.

## Quick Start

### 1. Install Packages

```bash
npm install @umo/document @umo/layout @umo/render @umo/editor
```

### 2. Basic Usage

```javascript
import { createDocument } from '@umo/document'
import { LayoutEngine } from '@umo/layout'
import { PageRenderer } from '@umo/render'

// Create document
const doc = createDocument({
  type: 'doc',
  content: [
    {
      type: 'heading',
      attrs: { level: 1 },
      content: [{ type: 'text', text: 'Hello World' }],
    },
    {
      type: 'paragraph',
      content: [{ type: 'text', text: 'This is my first document.' }],
    },
  ],
})

// Compute layout
const engine = new LayoutEngine()
const layout = engine.compute(doc.children, {
  size: { width: 21, height: 29.7 },
  margin: { top: 2.54, right: 2.54, bottom: 2.54, left: 2.54 },
})

// Render to DOM
const renderer = new PageRenderer()
layout.pages.forEach((page) => {
  const element = renderer.renderPage(page)
  document.getElementById('viewport').appendChild(element)
})
```

### 3. Vue Integration

```vue
<template>
  <EditorProvider :config="config">
    <UMOEditor />
  </EditorProvider>
</template>

<script setup>
import { EditorProvider, UMOEditor } from '@umo/vue'

const config = {
  locale: 'vi-VN',
}
</script>
```

### 4. React Integration

```jsx
import { EditorProvider, UMOEditor } from '@umo/react'

function App() {
  return (
    <EditorProvider>
      <UMOEditor />
    </EditorProvider>
  )
}
```

## Package Overview

| Package | Description |
|---------|-------------|
| `@umo/document` | Document model and AST |
| `@umo/layout` | Pagination and layout engine |
| `@umo/render` | DOM rendering |
| `@umo/editor` | Commands and transactions |
| `@umo/collaboration` | Real-time collaboration |
| `@umo/storage` | Document persistence |
| `@umo/io` | Import/Export formats |
| `@umo/plugin` | Plugin system |
| `@umo/ai` | AI features |
| `@umo/vue` | Vue 3 adapter |
| `@umo/react` | React adapter |
| `@umo/editor-client` | Ready-to-use editor |
| `@umo/performance` | Performance utilities |

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Application Layer                     │
│  (UMO Editor, Custom Editors, CMS Integration)          │
├─────────────────────────────────────────────────────────┤
│                  Framework Adapters                      │
│            (Vue 3, React, Web Components)               │
├─────────────────────────────────────────────────────────┤
│                     Core Engine                          │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│  │ Document │ │  Layout  │ │  Render  │ │  Editor  │  │
│  │  Model   │ │  Engine  │ │  Engine  │ │  Engine  │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘  │
├─────────────────────────────────────────────────────────┤
│                  Platform Services                       │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│  │Collab    │ │ Storage  │ │    IO    │ │  Plugin  │  │
│  │(Yjs)     │ │          │ │          │ │  System  │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘  │
├─────────────────────────────────────────────────────────┤
│                  Infrastructure                          │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐               │
│  │   AI     │ │Perf      │ │  Tests   │               │
│  │Platform  │ │Utilities │ │          │               │
│  └──────────┘ └──────────┘ └──────────┘               │
└─────────────────────────────────────────────────────────┘
```

## Next Steps

- [Document Model Guide](./document.md)
- [Layout Engine Guide](./layout.md)
- [Render Engine Guide](./render.md)
- [Editor Guide](./editor.md)
- [Collaboration Guide](./collaboration.md)
- [Plugin Development Guide](./plugin.md)
