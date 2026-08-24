# @kindy/document

Document model package for Open Document Platform.

## Installation

```bash
npm install @kindy/document
```

## Quick Start

```javascript
import { createDocument, createEmptyDocument, getSerializer, getValidator } from '@kindy/document'

// Create a document from content
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
      content: [{ type: 'text', text: 'This is a paragraph.' }],
    },
  ],
})

// Create an empty document
const emptyDoc = createEmptyDocument()

// Serialize to JSON
const serializer = getSerializer()
const json = serializer.toJSON(doc)

// Serialize to HTML
const html = serializer.toHTML(doc)

// Validate document
const validator = getValidator()
const result = validator.validate(doc)
console.log(result.isValid) // true
```

## API Reference

### `createDocument(content)`

Creates a document from content object.

**Parameters:**
- `content` (Object): Document content in AST format

**Returns:** Document instance

### `createEmptyDocument()`

Creates an empty document.

**Returns:** Empty document instance

### `getSerializer()`

Returns a document serializer.

**Returns:** Serializer instance

**Methods:**
- `toJSON(doc)` - Serialize to JSON string
- `toHTML(doc)` - Serialize to HTML string

### `getValidator()`

Returns a document validator.

**Returns:** Validator instance

**Methods:**
- `validate(doc)` - Validate document structure

## Document Structure

```javascript
{
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
    {
      type: 'bulletList',
      content: [
        {
          type: 'listItem',
          content: [{ type: 'text', text: 'Item 1' }],
        },
      ],
    },
  ],
}
```

## Supported Block Types

| Type | Description |
|------|-------------|
| `doc` | Root document node |
| `heading` | Heading (h1-h6) |
| `paragraph` | Paragraph |
| `bulletList` | Unordered list |
| `orderedList` | Ordered list |
| `listItem` | List item |
| `taskList` | Task list |
| `taskItem` | Task item |
| `blockquote` | Block quote |
| `codeBlock` | Code block |
| `horizontalRule` | Horizontal rule |
| `table` | Table |
| `tableRow` | Table row |
| `tableCell` | Table cell |

## Inline Marks

| Type | Description |
|------|-------------|
| `bold` | Bold text |
| `italic` | Italic text |
| `underline` | Underlined text |
| `strike` | Strikethrough text |
| `code` | Inline code |
| `link` | Hyperlink |
