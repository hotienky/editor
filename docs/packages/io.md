# @umo/io

Import/Export engine for document formats.

## Installation

```bash
npm install @umo/io
```

## Quick Start

```javascript
import {
  HtmlImporter,
  MarkdownImporter,
  JsonImporter,
  HtmlExporter,
  MarkdownExporter,
  JsonExporter,
  PlainTextExporter,
} from '@umo/io'

// Import HTML
const htmlImporter = new HtmlImporter()
const doc = await htmlImporter.import('<h1>Hello</h1><p>World</p>')

// Export to HTML
const htmlExporter = new HtmlExporter()
const html = await htmlExporter.export(doc)

// Export to Markdown
const mdExporter = new MarkdownExporter()
const markdown = await mdExporter.export(doc)
```

## API Reference

### Importers

#### `HtmlImporter`

Imports HTML content.

```javascript
const importer = new HtmlImporter()
const doc = await importer.import(htmlString)
```

#### `MarkdownImporter`

Imports Markdown content.

```javascript
const importer = new MarkdownImporter()
const doc = await importer.import(markdownString)
```

#### `JsonImporter`

Imports JSON content.

```javascript
const importer = new JsonImporter()
const doc = await importer.import(jsonString)
```

#### `DocxImporter`

Imports DOCX files (requires file input).

```javascript
const importer = new DocxImporter()
const doc = await importer.import(file)
```

### Exporters

#### `HtmlExporter`

Exports to HTML.

```javascript
const exporter = new HtmlExporter()
const html = await exporter.export(doc)
```

#### `MarkdownExporter`

Exports to Markdown.

```javascript
const exporter = new MarkdownExporter()
const markdown = await exporter.export(doc)
```

#### `JsonExporter`

Exports to JSON.

```javascript
const exporter = new JsonExporter()
const json = await exporter.export(doc)
```

#### `PlainTextExporter`

Exports to plain text.

```javascript
const exporter = new PlainTextExporter()
const text = await exporter.export(doc)
```

#### `DocxExporter`

Exports to DOCX.

```javascript
const exporter = new DocxExporter()
const blob = await exporter.export(doc)
```

## Supported Formats

| Format | Import | Export |
|--------|--------|--------|
| HTML | ✅ | ✅ |
| Markdown | ✅ | ✅ |
| JSON | ✅ | ✅ |
| DOCX | ✅ | ✅ |
| Plain Text | ❌ | ✅ |

## HTML Import Example

```javascript
const html = `
<h1>Hello World</h1>
<p>This is a <strong>paragraph</strong> with <em>formatting</em>.</p>
<ul>
  <li>Item 1</li>
  <li>Item 2</li>
</ul>
`

const doc = await htmlImporter.import(html)
// Returns AST document with proper block structure
```

## Markdown Export Example

```javascript
const doc = {
  type: 'doc',
  content: [
    {
      type: 'heading',
      attrs: { level: 1 },
      content: [{ type: 'text', text: 'Title' }],
    },
    {
      type: 'paragraph',
      content: [
        { type: 'text', text: 'Hello ' },
        { type: 'text', marks: [{ type: 'bold' }], text: 'World' },
      ],
    },
  ],
}

const markdown = await mdExporter.export(doc)
// Output: "# Title\n\nHello **World**"
```
