# @kindy/layout

Layout engine package for Open Document Platform.

## Installation

```bash
npm install @kindy/layout
```

## Quick Start

```javascript
import { LayoutEngine } from '@kindy/layout'

const engine = new LayoutEngine()

const blocks = [
  {
    type: 'heading',
    attrs: { level: 1 },
    content: [{ type: 'text', text: 'Title' }],
  },
  {
    type: 'paragraph',
    content: [{ type: 'text', text: 'This is a paragraph.' }],
  },
]

const pageOptions = {
  size: { width: 21, height: 29.7 }, // A4
  orientation: 'portrait',
  margin: { top: 2.54, right: 2.54, bottom: 2.54, left: 2.54 },
}

const layout = engine.compute(blocks, pageOptions)

console.log(layout.totalPages) // 1
console.log(layout.pages) // Array of page objects
```

## API Reference

### `LayoutEngine`

Main layout engine class.

#### `constructor(options)`

Creates a new layout engine instance.

**Options:**
- `textMeasurer` (Object): Custom text measurement function
- `workerEnabled` (Boolean): Enable Web Worker for computation

#### `compute(blocks, pageOptions)`

Computes layout for given blocks.

**Parameters:**
- `blocks` (Array): Array of document blocks
- `pageOptions` (Object): Page configuration

**Returns:** Layout result

```javascript
{
  totalPages: 5,
  pages: [
    {
      pageNumber: 1,
      width: 21,
      height: 29.7,
      contentWidth: 15.92,
      contentHeight: 24.62,
      content: [...],
    },
    // ... more pages
  ],
}
```

#### `measureText(text, options)`

Measures text width.

**Parameters:**
- `text` (String): Text to measure
- `options` (Object): Font options

**Returns:** Width in cm

#### `calculateContentHeight(blocks, pageOptions)`

Calculates total content height.

**Parameters:**
- `blocks` (Array): Array of blocks
- `pageOptions` (Object): Page options

**Returns:** Height in cm

## Page Options

```javascript
{
  size: {
    width: 21,    // Width in cm
    height: 29.7, // Height in cm
    format: 'a4', // Optional: a4, letter, legal
  },
  orientation: 'portrait', // or 'landscape'
  margin: {
    top: 2.54,    // Top margin in cm
    right: 2.54,  // Right margin in cm
    bottom: 2.54, // Bottom margin in cm
    left: 2.54,   // Left margin in cm
  },
}
```

## Supported Page Formats

| Format | Width (cm) | Height (cm) |
|--------|------------|-------------|
| A0 | 84.1 | 118.9 |
| A1 | 59.4 | 84.1 |
| A2 | 42 | 59.4 |
| A3 | 29.7 | 42 |
| A4 | 21 | 29.7 |
| A5 | 14.8 | 21 |
| A6 | 10.5 | 14.8 |
| Letter | 21.59 | 27.94 |
| Legal | 21.59 | 35.56 |

## Web Worker Support

```javascript
import { LayoutEngine } from '@kindy/layout'

const engine = new LayoutEngine({
  workerEnabled: true,
})

// Computation runs in Web Worker
const layout = await engine.computeAsync(blocks, pageOptions)
```

## Knuth-Plass Line Breaking

The layout engine uses the Knuth-Plass algorithm for optimal line breaking:

- Supports CJK (Chinese, Japanese, Korean) characters
- Handles widow/orphan control
- Considers hyphenation
