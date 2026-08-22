# @umo/editor-client

UMO Editor Client — A Google Docs-like editor built on Open Document Platform.

## Installation

```bash
npm install @umo/editor-client
```

## Quick Start

```vue
<template>
  <UmoEditor :config="config" />
</template>

<script setup>
import { UmoEditor } from '@umo/editor-client'

const config = {
  locale: 'vi-VN',
  title: 'My Document',
}
</script>
```

## Features

- Multi-document tabs
- Toolbar with formatting options
- Page view with pagination
- Status bar with word count
- Save/Export functionality
- Dark mode support

## Components

### `UmoEditor`

Main editor component.

```vue
<UmoEditor
  :config="config"
  :initial-content="content"
  :read-only="false"
  @ready="onReady"
  @save="onSave"
/>
```

**Props:**
- `config` (Object): Editor configuration
- `initial-content` (String|Object): Initial document content
- `read-only` (Boolean): Enable read-only mode

**Events:**
- `ready` - Editor is ready
- `save` - Document saved
- `export` - Document exported

### `EditorHeader`

Header with title and actions.

### `EditorToolbar`

Toolbar with formatting buttons.

### `EditorContent`

Main content area with page view.

### `EditorFooter`

Footer container.

### `DocumentTabs`

Multi-document tabs.

### `StatusBar`

Status bar with page info and zoom.

## Composables

### `useUmoEditor`

Returns editor state and operations.

```javascript
const {
  document,
  layout,
  selection,
  pageOptions,
  updateDocument,
  updatePageOptions,
} = useUmoEditor()
```

### `useDocumentManager`

Manages multiple document tabs.

```javascript
const {
  tabs,
  activeTabId,
  currentDocument,
  selectTab,
  addTab,
  closeTab,
} = useDocumentManager()
```

### `useFileOperations`

File operations.

```javascript
const {
  save,
  load,
  exportDocument,
  importDocument,
  isSaving,
} = useFileOperations()
```

## Configuration

```javascript
const config = {
  title: 'My Document',
  pageOptions: {
    size: { width: 21, height: 29.7 },
    orientation: 'portrait',
    margin: { top: 2.54, right: 2.54, bottom: 2.54, left: 2.54 },
  },
}
```

## Export Formats

- JSON
- HTML
- Markdown
- Plain Text

## Example

```vue
<template>
  <div class="app">
    <UmoEditor
      :config="config"
      @ready="handleReady"
      @save="handleSave"
    />
  </div>
</template>

<script setup>
import { UmoEditor } from '@umo/editor-client'

const config = {
  title: 'My Document',
}

const handleReady = ({ editor, document }) => {
  console.log('Editor ready')
}

const handleSave = (document) => {
  console.log('Document saved:', document)
}
</script>
```
