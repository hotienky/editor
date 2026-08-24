# @kindy/plugin

Plugin system for Open Document Platform.

## Installation

```bash
npm install @kindy/plugin
```

## Quick Start

```javascript
import { PluginManager, BasePlugin, PluginType, PluginPriority } from '@kindy/plugin'

// Get plugin manager
const manager = new PluginManager()

// Create a plugin
class MyPlugin extends BasePlugin {
  constructor() {
    super({
      id: 'my-plugin',
      name: 'My Plugin',
      type: PluginType.EDITOR,
      priority: PluginPriority.NORMAL,
    })
  }

  init(editor) {
    console.log('Plugin initialized')
  }

  destroy() {
    console.log('Plugin destroyed')
  }
}

// Register plugin
manager.register(new MyPlugin())

// Enable plugin
manager.enable('my-plugin')

// Execute hook
await manager.executeHook('editor:beforeSave', { document: doc })
```

## API Reference

### `PluginManager`

Manages plugin lifecycle.

#### `register(plugin)`

Registers a plugin.

#### `enable(pluginId)`

Enables a plugin.

#### `disable(pluginId)`

Disables a plugin.

#### `get(pluginId)`

Gets a plugin by ID.

#### `getAll()`

Gets all registered plugins.

#### `executeHook(hookName, context)`

Executes a hook on all enabled plugins.

### `BasePlugin`

Base class for plugins.

```javascript
class MyPlugin extends BasePlugin {
  constructor() {
    super({
      id: 'my-plugin',
      name: 'My Plugin',
      type: PluginType.EDITOR,
      priority: PluginPriority.NORMAL,
    })
  }

  init(editor) {
    // Initialize plugin
  }

  destroy() {
    // Cleanup
  }
}
```

### Enums

#### `PluginType`

```javascript
PluginType.EDITOR    // Editor plugins
PluginType.THEME     // Theme plugins
PluginType.COMMAND   // Command plugins
```

#### `PluginPriority`

```javascript
PluginPriority.LOW      // Low priority
PluginPriority.NORMAL   // Normal priority
PluginPriority.HIGH     // High priority
PluginPriority.CRITICAL // Critical priority
```

#### `PluginStatus`

```javascript
PluginStatus.INACTIVE // Not active
PluginStatus.ACTIVE   // Active
PluginStatus.ERROR    // Error state
```

## Hooks

Plugins can implement these hooks:

```javascript
class MyPlugin extends BasePlugin {
  hooks = {
    'editor:init': (context) => {
      // Called when editor initializes
    },
    'editor:beforeSave': (context) => {
      // Called before saving
      // Return false to cancel save
    },
    'editor:afterSave': (context) => {
      // Called after saving
    },
    'document:beforeChange': (context) => {
      // Called before document changes
    },
    'document:afterChange': (context) => {
      // Called after document changes
    },
  }
}
```

## Plugin Example: Word Counter

```javascript
class WordCounterPlugin extends BasePlugin {
  constructor() {
    super({
      id: 'word-counter',
      name: 'Word Counter',
      type: PluginType.EDITOR,
      priority: PluginPriority.LOW,
    })

    this.wordCount = 0
  }

  init(editor) {
    this.editor = editor
    this.editor.on('change', this.updateCount.bind(this))
  }

  updateCount() {
    const text = this.editor.getText()
    this.wordCount = text.split(/\s+/).filter(Boolean).length
    this.editor.emit('wordCountChange', this.wordCount)
  }

  destroy() {
    this.editor.off('change', this.updateCount.bind(this))
  }
}
```
