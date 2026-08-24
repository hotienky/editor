# @kindy/react

React adapter for Open Document Platform.

## Installation

```bash
npm install @kindy/react
```

## Quick Start

```jsx
import { EditorProvider, useEditor, useDocument } from '@kindy/react'

function App() {
  return (
    <EditorProvider config={{ locale: 'en' }}>
      <MyEditor />
    </EditorProvider>
  )
}

function MyEditor() {
  const { document, updateDocument } = useEditor()
  const { wordCount } = useDocument()

  return (
    <div>
      <p>Words: {wordCount}</p>
      <textarea
        value={document?.toPlainText() || ''}
        onChange={(e) => updateDocument(e.target.value)}
      />
    </div>
  )
}
```

## API Reference

### Components

#### `EditorProvider`

Root provider for the editor.

```jsx
<EditorProvider
  config={{
    locale: 'en',
    pageOptions: { size: { width: 21, height: 29.7 } },
  }}
>
  {children}
</EditorProvider>
```

#### `KindyEditor`

Main editor component.

```jsx
<KindyEditor className="my-editor" style={{ height: '100vh' }} />
```

#### `Toolbar`

Toolbar container.

```jsx
<Toolbar>
  <ToolbarButton icon="B" label="Bold" onClick={toggleBold} />
  <ToolbarGroup label="Format">
    <ToolbarButton icon="I" label="Italic" />
  </ToolbarGroup>
</Toolbar>
```

#### `PageView`

Page display component.

```jsx
<PageView
  page={{ pageNumber: 1, width: 21, height: 29.7 }}
  pageOptions={pageOptions}
/>
```

### Hooks

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

## Example: Full Editor

```jsx
import {
  EditorProvider,
  KindyEditor,
  Toolbar,
  ToolbarButton,
  useDocument,
} from '@kindy/react'

function App() {
  return (
    <EditorProvider>
      <div className="editor-container">
        <EditorToolbar />
        <KindyEditor />
      </div>
    </EditorProvider>
  )
}

function EditorToolbar() {
  const { insertText } = useDocument()

  return (
    <Toolbar>
      <ToolbarButton
        icon="B"
        label="Bold"
        onClick={() => insertText('**bold**')}
      />
    </Toolbar>
  )
}
```
