# Basic Editor Example

A minimal document editor using Open Document Platform.

## HTML

```html
<!DOCTYPE html>
<html>
<head>
  <title>Basic Editor</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
    .viewport { max-width: 800px; margin: 0 auto; }
    .page {
      background: white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      padding: 2.54cm;
      margin-bottom: 20px;
      min-height: 29.7cm;
    }
    .toolbar { margin-bottom: 20px; padding: 10px; background: #f5f5f5; }
    .toolbar button { margin-right: 5px; padding: 5px 10px; }
  </style>
</head>
<body>
  <div class="toolbar">
    <button onclick="insertHeading()">Heading</button>
    <button onclick="insertParagraph()">Paragraph</button>
    <button onclick="insertList()">List</button>
  </div>
  <div class="viewport" id="viewport"></div>

  <script type="module" src="./main.js"></script>
</body>
</html>
```

## JavaScript

```javascript
// main.js
import { createDocument } from '@umo/document'
import { LayoutEngine } from '@umo/layout'
import { PageRenderer } from '@umo/render'

// Initialize
const engine = new LayoutEngine()
const renderer = new PageRenderer()
const viewport = document.getElementById('viewport')

// Page options
const pageOptions = {
  size: { width: 21, height: 29.7 },
  margin: { top: 2.54, right: 2.54, bottom: 2.54, left: 2.54 },
}

// Document content
let content = [
  {
    type: 'heading',
    attrs: { level: 1 },
    content: [{ type: 'text', text: 'Hello World' }],
  },
  {
    type: 'paragraph',
    content: [{ type: 'text', text: 'Start typing here...' }],
  },
]

// Render document
function renderDocument() {
  viewport.innerHTML = ''

  const doc = createDocument({ type: 'doc', content })
  const layout = engine.compute(doc.children, pageOptions)

  layout.pages.forEach((page) => {
    const element = renderer.renderPage(page)
    viewport.appendChild(element)
  })
}

// Insert heading
window.insertHeading = () => {
  content.push({
    type: 'heading',
    attrs: { level: 2 },
    content: [{ type: 'text', text: 'New Heading' }],
  })
  renderDocument()
}

// Insert paragraph
window.insertParagraph = () => {
  content.push({
    type: 'paragraph',
    content: [{ type: 'text', text: 'New paragraph...' }],
  })
  renderDocument()
}

// Insert list
window.insertList = () => {
  content.push({
    type: 'bulletList',
    content: [
      { type: 'listItem', content: [{ type: 'text', text: 'Item 1' }] },
      { type: 'listItem', content: [{ type: 'text', text: 'Item 2' }] },
    ],
  })
  renderDocument()
}

// Initial render
renderDocument()
```
