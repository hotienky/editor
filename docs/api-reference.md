# API Reference

Complete API reference for all Open Document Platform packages.

## Table of Contents

- [@umo/document](#umodocument)
- [@umo/layout](#umolayout)
- [@umo/render](#umorender)
- [@umo/editor](#umoeditor)
- [@umo/collaboration](#umocollaboration)
- [@umo/storage](#umostorage)
- [@umo/io](#umoio)
- [@umo/plugin](#umoplugin)
- [@umo/ai](#umoai)
- [@umo/vue](#umovue)
- [@umo/react](#umoreact)
- [@umo/performance](#umoperformance)

---

## @umo/document

### `createDocument(content)`

Creates a document from content.

**Parameters:**
- `content` (Object): Document content in AST format

**Returns:** Document instance

### `createEmptyDocument()`

Creates an empty document.

**Returns:** Document instance

### `getSerializer()`

Returns a document serializer.

**Returns:** Serializer

### `getValidator()`

Returns a document validator.

**Returns:** Validator

---

## @umo/layout

### `class LayoutEngine`

#### `constructor(options)`
- `options.textMeasurer` (Function): Custom text measurement
- `options.workerEnabled` (Boolean): Enable Web Worker

#### `compute(blocks, pageOptions)`
Computes layout for blocks.

**Returns:** `{ totalPages, pages }`

#### `measureText(text, options)`
Measures text width.

**Returns:** Width in cm

#### `calculateContentHeight(blocks, pageOptions)`
Calculates total content height.

**Returns:** Height in cm

---

## @umo/render

### `class PageRenderer`

#### `constructor(options)`
- `options.theme` (String): 'light' or 'dark'
- `options.className` (String): Additional CSS class

#### `renderPage(page)`
Renders a page to DOM.

**Returns:** DOM Element

#### `renderBlock(block)`
Renders a single block.

**Returns:** DOM Element

### `class ViewportManager`

#### `getVisiblePages(pages, viewport)`
Calculates visible pages.

**Returns:** Array of page numbers

---

## @umo/editor

### `class Editor`

#### `command(name, params)`
Executes a command.

#### `transaction()`
Creates a new transaction.

**Returns:** Transaction

#### `apply(transaction)`
Applies a transaction.

### `class Transaction`

#### `insert(position, content)`
Inserts content.

#### `delete(from, to)`
Deletes content.

#### `replace(from, to, content)`
Replaces content.

### `class UndoManager`

#### `add(transaction)`
Adds to history.

#### `undo()`
Undoes last operation.

#### `redo()`
Redoes last operation.

#### `canUndo()`
Returns Boolean.

#### `canRedo()`
Returns Boolean.

---

## @umo/collaboration

### `class CollaborationProtocol`

#### `connect(docName, options)`
Connects to server.

#### `disconnect()`
Disconnects.

#### `getDocument()`
Returns Yjs document.

### `class PresenceManager`

#### `addUser(user)`
Adds user.

#### `removeUser(userId)`
Removes user.

#### `updateCursor(userId, cursor)`
Updates cursor.

#### `getUsers()`
Returns Array.

#### `getCursor(userId)`
Returns Object.

### `class VersionHistory`

#### `on(event, callback)`
Listens for events.

#### `getVersions()`
Returns Array.

#### `revertToVersion(versionId)`
Reverts to version.

---

## @umo/storage

### `class LocalStorageAdapter`

#### `get(key)`
Gets value.

#### `set(key, value)`
Sets value.

#### `delete(key)`
Deletes value.

#### `clear()`
Clears all.

### `class SnapshotStorage`

#### `create(snapshot)`
Creates snapshot.

#### `get(id)`
Gets snapshot.

#### `getAll(documentId)`
Gets all snapshots.

#### `delete(id)`
Deletes snapshot.

### `class OperationStorage`

#### `add(operation)`
Adds operation.

#### `getByDocument(documentId)`
Gets operations.

### `class VersionStorage`

#### `save(version)`
Saves version.

#### `getByDocument(documentId)`
Gets versions.

#### `getLatest(documentId)`
Gets latest.

---

## @umo/io

### Importers

#### `class HtmlImporter`
- `import(html)` - Returns Document

#### `class MarkdownImporter`
- `import(markdown)` - Returns Document

#### `class JsonImporter`
- `import(json)` - Returns Document

#### `class DocxImporter`
- `import(file)` - Returns Document

### Exporters

#### `class HtmlExporter`
- `export(doc)` - Returns String

#### `class MarkdownExporter`
- `export(doc)` - Returns String

#### `class JsonExporter`
- `export(doc)` - Returns String

#### `class PlainTextExporter`
- `export(doc)` - Returns String

#### `class DocxExporter`
- `export(doc)` - Returns Blob

---

## @umo/plugin

### `class PluginManager`

#### `register(plugin)`
Registers plugin.

#### `enable(pluginId)`
Enables plugin.

#### `disable(pluginId)`
Disables plugin.

#### `get(pluginId)`
Gets plugin.

#### `getAll()`
Gets all plugins.

#### `executeHook(hookName, context)`
Executes hook.

### `class BasePlugin`

#### `constructor(options)`
- `options.id` (String): Plugin ID
- `options.name` (String): Plugin name
- `options.type` (PluginType): Plugin type
- `options.priority` (PluginPriority): Priority

#### `init(editor)`
Initialize plugin.

#### `destroy()`
Cleanup plugin.

### Enums

#### `PluginType`
- `EDITOR` - Editor plugins
- `THEME` - Theme plugins
- `COMMAND` - Command plugins

#### `PluginPriority`
- `LOW` - Low priority
- `NORMAL` - Normal priority
- `HIGH` - High priority
- `CRITICAL` - Critical priority

#### `PluginStatus`
- `INACTIVE` - Not active
- `ACTIVE` - Active
- `ERROR` - Error state

---

## @umo/ai

### `class AIProvider`

#### `constructor(options)`
- `options.apiKey` (String): API key
- `options.model` (String): Model name

### `class TextCompletion`

#### `getSuggestions(prompt, options)`
Gets suggestions.

#### `getInlineCompletion(text, position)`
Gets inline completion.

### `class GrammarCheck`

#### `check(text)`
Checks grammar.

**Returns:** Array of issues

#### `suggest(text, issue)`
Gets suggestions.

### `class Summarization`

#### `summarize(text, options)`
Summarizes text.

#### `extractKeyPoints(text)`
Extracts key points.

### `class Translation`

#### `translate(text, from, to)`
Translates text.

#### `detectLanguage(text)`
Detects language.

### `class ContentGeneration`

#### `generate(prompt, options)`
Generates content.

#### `rewrite(text, style)`
Rewrites text.

#### `expand(text)`
Expands text.

#### `compress(text)`
Compresses text.

---

## @umo/vue

### Composables

#### `useEditor()`
Returns editor state.

#### `useDocument()`
Returns document operations.

#### `useLayout()`
Returns layout info.

#### `useSelection()`
Returns selection state.

#### `useCollaboration()`
Returns collaboration features.

#### `usePlugin()`
Returns plugin operations.

### Components

#### `<EditorProvider>`
Root provider.

#### `<UMOEditor>`
Main editor.

#### `<Toolbar>`
Toolbar container.

#### `<PageView>`
Page display.

---

## @umo/react

### Hooks

#### `useEditor()`
Returns editor state.

#### `useDocument()`
Returns document operations.

#### `useLayout()`
Returns layout info.

#### `useSelection()`
Returns selection state.

#### `useCollaboration()`
Returns collaboration features.

#### `usePlugin()`
Returns plugin operations.

### Components

#### `<EditorProvider>`
Root provider.

#### `<UMOEditor>`
Main editor.

#### `<Toolbar>`
Toolbar container.

#### `<PageView>`
Page display.

---

## @umo/performance

### `class VirtualScroller`

#### `init(container, pages)`
Initializes scroller.

#### `scrollToPage(pageNumber)`
Scrolls to page.

#### `getVisiblePages()`
Returns Array.

#### `destroy()`
Cleanup.

### `class WorkerPool`

#### `init()`
Initializes pool.

#### `submit(task, data)`
Submits task.

**Returns:** Promise

#### `getStats()`
Returns stats.

#### `terminate()`
Terminates workers.

### `class CacheManager`

#### `get(key)`
Gets value.

#### `set(key, value, options)`
Sets value.

#### `delete(key)`
Deletes value.

#### `clear()`
Clears cache.

#### `getStats()`
Returns stats.

### `class Benchmark`

#### `measure(label, fn)`
Measures function.

#### `measureAsync(label, fn)`
Measures async function.

#### `getSummary()`
Returns summary.

### `class PerformanceMonitor`

#### `start()`
Starts monitoring.

#### `stop()`
Stops monitoring.

#### `getMetrics()`
Returns metrics.

### `class DocumentProfiler`

#### `profileDocumentLoad(document)`
Profiles document load.

#### `profileTyping(editor, text)`
Profiles typing.

#### `profileLayout(engine, blocks, pageOptions)`
Profiles layout.

#### `getReport()`
Returns report.

### `createPerformanceToolkit(options)`
Creates pre-configured toolkit.

**Returns:** Toolkit object
