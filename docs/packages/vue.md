# @umo/vue

Vue 3 adapter for Open Document Platform.

## Installation

```bash
npm install @umo/vue
```

## Quick Start

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
  pageOptions: {
    size: { width: 21, height: 29.7 },
    margin: { top: 2.54, right: 2.54, bottom: 2.54, left: 2.54 },
  },
}
</script>
```

## API Reference

### Composables

#### `useEditor`

Returns editor state and operations.

```javascript
const {
  document,
  layout,
  selection,
  pageOptions,
  updateDocument,
  updateSelection,
  updatePageOptions,
} = useEditor()
```

#### `useDocument`

Returns document operations.

```javascript
const {
  document,
  text,
  wordCount,
  charCount,
  insertText,
  deleteText,
} = useDocument()
```

#### `useLayout`

Returns layout information.

```javascript
const {
  layout,
  totalPages,
  pages,
  pageDimensions,
  updatePageOptions,
} = useLayout()
```

#### `useSelection`

Returns selection state.

```javascript
const {
  selection,
  isSelected,
  selectedText,
  updateSelection,
} = useSelection()
```

#### `useCollaboration`

Returns collaboration features.

```javascript
const {
  isConnected,
  users,
  cursors,
  connect,
  disconnect,
} = useCollaboration()
```

#### `usePlugin`

Returns plugin operations.

```javascript
const {
  registerPlugin,
  getPlugin,
  enablePlugin,
  disablePlugin,
} = usePlugin()
```

### Components

#### `UMOEditor`

Main editor component.

```vue
<template>
  <UMOEditor class="my-editor" />
</template>
```

#### `Toolbar`

Toolbar container.

```vue
<template>
  <Toolbar>
    <button @click="toggleBold">Bold</button>
  </Toolbar>
</template>
```

#### `PageView`

Page display component.

```vue
<template>
  <PageView
    :page="{ pageNumber: 1, width: 21, height: 29.7 }"
    :page-options="pageOptions"
  />
</template>
```

## Example: Full Editor

```vue
<template>
  <EditorProvider :config="config">
    <div class="editor-container">
      <EditorToolbar />
      <UMOEditor />
      <StatusBar />
    </div>
  </EditorProvider>
</template>

<script setup>
import { EditorProvider, UMOEditor, useDocument, useLayout } from '@umo/vue'

const config = {
  locale: 'vi-VN',
}

const { wordCount } = useDocument()
const { totalPages } = useLayout()
</script>

<style>
.editor-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
}
</style>
```

## Plugin Installation

```javascript
import { createApp } from 'vue'
import { install as umoPlugin } from '@umo/vue'

const app = createApp(App)

// Install UMO plugin
app.use(umoPlugin)

app.mount('#app')
```
