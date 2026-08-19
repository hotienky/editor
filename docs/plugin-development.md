# Plugin Development Guide

Learn how to create plugins for Open Document Platform.

## Plugin Basics

### Creating a Plugin

```javascript
import { BasePlugin, PluginType, PluginPriority } from '@umo/plugin'

class MyPlugin extends BasePlugin {
  constructor() {
    super({
      id: 'my-plugin',
      name: 'My Plugin',
      type: PluginType.EDITOR,
      priority: PluginPriority.NORMAL,
      version: '1.0.0',
    })
  }

  init(editor) {
    // Plugin initialization
    console.log('Plugin initialized')
  }

  destroy() {
    // Cleanup
    console.log('Plugin destroyed')
  }
}

export default MyPlugin
```

### Plugin Types

```javascript
import { PluginType } from '@umo/plugin'

// Editor plugins - extend editor functionality
PluginType.EDITOR

// Theme plugins - provide visual themes
PluginType.THEME

// Command plugins - add new commands
PluginType.COMMAND
```

### Plugin Priority

```javascript
import { PluginPriority } from '@umo/plugin'

PluginPriority.LOW      // Runs last
PluginPriority.NORMAL   // Default
PluginPriority.HIGH     // Runs first
PluginPriority.CRITICAL // Must run before others
```

## Hooks

Plugins can hook into editor events:

```javascript
class MyPlugin extends BasePlugin {
  hooks = {
    // Called when editor initializes
    'editor:init': (context) => {
      console.log('Editor initialized')
    },

    // Called before saving
    'editor:beforeSave': (context) => {
      // Return false to cancel save
      return true
    },

    // Called after saving
    'editor:afterSave': (context) => {
      console.log('Document saved')
    },

    // Called before document changes
    'document:beforeChange': (context) => {
      // Access context.changes
    },

    // Called after document changes
    'document:afterChange': (context) => {
      // Access context.document
    },

    // Called when selection changes
    'selection:change': (context) => {
      // Access context.selection
    },
  }
}
```

## Example Plugins

### Word Counter Plugin

```javascript
import { BasePlugin, PluginType } from '@umo/plugin'

export class WordCounterPlugin extends BasePlugin {
  constructor() {
    super({
      id: 'word-counter',
      name: 'Word Counter',
      type: PluginType.EDITOR,
    })

    this.wordCount = 0
    this.charCount = 0
  }

  init(editor) {
    this.editor = editor
    this.editor.on('change', this.updateCounts.bind(this))
  }

  updateCounts() {
    const text = this.editor.getText()
    this.wordCount = text.split(/\s+/).filter(Boolean).length
    this.charCount = text.length

    this.editor.emit('stats:change', {
      wordCount: this.wordCount,
      charCount: this.charCount,
    })
  }

  destroy() {
    this.editor.off('change', this.updateCounts.bind(this))
  }
}
```

### Spell Check Plugin

```javascript
import { BasePlugin, PluginType } from '@umo/plugin'

export class SpellCheckPlugin extends BasePlugin {
  constructor(options = {}) {
    super({
      id: 'spell-check',
      name: 'Spell Check',
      type: PluginType.EDITOR,
    })

    this.language = options.language || 'en'
    this.dictionary = new Set()
  }

  async init(editor) {
    this.editor = editor
    await this.loadDictionary()

    this.editor.on('change', this.checkSpelling.bind(this))
  }

  async loadDictionary() {
    // Load dictionary words
    const response = await fetch(`/dictionaries/${this.language}.txt`)
    const text = await response.text()
    text.split('\n').forEach((word) => {
      this.dictionary.add(word.toLowerCase())
    })
  }

  checkSpelling() {
    const text = this.editor.getText()
    const words = text.split(/\s+/)
    const errors = []

    words.forEach((word, index) => {
      if (!this.dictionary.has(word.toLowerCase())) {
        errors.push({
          word,
          position: index,
          suggestions: this.getSuggestions(word),
        })
      }
    })

    this.editor.emit('spelling:change', errors)
  }

  getSuggestions(word) {
    // Simple suggestion algorithm
    const suggestions = []
    this.dictionary.forEach((dictWord) => {
      if (this.calculateSimilarity(word, dictWord) > 0.8) {
        suggestions.push(dictWord)
      }
    })
    return suggestions.slice(0, 5)
  }

  calculateSimilarity(a, b) {
    const longer = a.length > b.length ? a : b
    const shorter = a.length > b.length ? b : a
    if (longer.length === 0) return 1.0
    return (longer.length - this.editDistance(longer, shorter)) / longer.length
  }

  editDistance(a, b) {
    const matrix = []
    for (let i = 0; i <= b.length; i++) matrix[i] = [i]
    for (let j = 0; j <= a.length; j++) matrix[0][j] = j

    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b[i - 1] === a[j - 1]) {
          matrix[i][j] = matrix[i - 1][j - 1]
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1,
          )
        }
      }
    }
    return matrix[b.length][a.length]
  }

  destroy() {
    this.editor.off('change', this.checkSpelling.bind(this))
  }
}
```

### Export Plugin

```javascript
import { BasePlugin, PluginType } from '@umo/plugin'
import { HtmlExporter, MarkdownExporter } from '@umo/io'

export class ExportPlugin extends BasePlugin {
  constructor() {
    super({
      id: 'export',
      name: 'Export Plugin',
      type: PluginType.COMMAND,
    })

    this.exporters = {
      html: new HtmlExporter(),
      markdown: new MarkdownExporter(),
    }
  }

  init(editor) {
    this.editor = editor

    // Register export commands
    this.editor.commands.register('exportHtml', this.exportHtml.bind(this))
    this.editor.commands.register('exportMarkdown', this.exportMarkdown.bind(this))
  }

  async exportHtml() {
    const doc = this.editor.getDocument()
    const html = await this.exporters.html.export(doc)
    this.downloadFile(html, 'document.html', 'text/html')
  }

  async exportMarkdown() {
    const doc = this.editor.getDocument()
    const md = await this.exporters.markdown.export(doc)
    this.downloadFile(md, 'document.md', 'text/markdown')
  }

  downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  destroy() {
    this.editor.commands.unregister('exportHtml')
    this.editor.commands.unregister('exportMarkdown')
  }
}
```

## Registering Plugins

```javascript
import { PluginManager } from '@umo/plugin'
import { WordCounterPlugin } from './plugins/word-counter'
import { SpellCheckPlugin } from './plugins/spell-check'

const manager = new PluginManager()

// Register plugins
manager.register(new WordCounterPlugin())
manager.register(new SpellCheckPlugin({ language: 'en' }))

// Enable plugins
manager.enable('word-counter')
manager.enable('spell-check')
```

## Best Practices

1. **Keep plugins focused** - Each plugin should do one thing well
2. **Use hooks** - Hook into events instead of modifying core code
3. **Clean up** - Always implement `destroy()` to remove event listeners
4. **Use unique IDs** - Choose descriptive, unique plugin IDs
5. **Handle errors** - Wrap initialization in try-catch
6. **Document your plugin** - Provide clear documentation
