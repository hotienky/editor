# @kindy/render

Render engine package for Open Document Platform.

## Installation

```bash
npm install @kindy/render
```

## Quick Start

```javascript
import { PageRenderer, ViewportManager } from '@kindy/render'

// Create page renderer
const renderer = new PageRenderer()

// Render a page to DOM
const pageElement = renderer.renderPage({
  pageNumber: 1,
  width: 21,
  height: 29.7,
  content: [
    {
      type: 'paragraph',
      content: [{ type: 'text', text: 'Hello World' }],
    },
  ],
})

document.getElementById('viewport').appendChild(pageElement)

// Create viewport manager for virtual scrolling
const viewport = new ViewportManager()
const visiblePages = viewport.getVisiblePages(pages, {
  scrollTop: 0,
  viewportHeight: 800,
})
```

## API Reference

### `PageRenderer`

Renders pages to DOM elements.

#### `constructor(options)`

**Options:**
- `theme` (String): Theme name ('light' or 'dark')
- `className` (String): Additional CSS class

#### `renderPage(page)`

Renders a complete page.

**Parameters:**
- `page` (Object): Page object from layout engine

**Returns:** DOM element

#### `renderBlock(block)`

Renders a single block.

**Parameters:**
- `block` (Object): Block object

**Returns:** DOM element

### Supported Block Types

| Block Type | Renderer |
|------------|----------|
| `heading` | `<h1>` to `<h6>` |
| `paragraph` | `<p>` |
| `bulletList` | `<ul>` |
| `orderedList` | `<ol>` |
| `listItem` | `<li>` |
| `taskList` | `<ul class="task-list">` |
| `blockquote` | `<blockquote>` |
| `codeBlock` | `<pre><code>` |
| `horizontalRule` | `<hr>` |
| `table` | `<table>` |
| `image` | `<img>` |

### `ViewportManager`

Manages viewport for virtual scrolling.

#### `getVisiblePages(pages, viewport)`

Calculates visible pages.

**Parameters:**
- `pages` (Array): All pages
- `viewport` (Object): `{ scrollTop, viewportHeight }`

**Returns:** Array of visible page numbers

## CSS Classes

The renderer adds these CSS classes:

```css
.kindy-page           /* Page container */
.kindy-page-content   /* Page content area */
.kindy-block          /* Block container */
.kindy-heading        /* Heading block */
.kindy-paragraph      /* Paragraph block */
.kindy-list           /* List block */
.kindy-code           /* Code block */
.kindy-table          /* Table block */
```

## Print Styles

```css
@media print {
  .kindy-page {
    box-shadow: none;
    margin: 0;
    page-break-after: always;
  }
}
```
