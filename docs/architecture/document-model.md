# Document Model Specification

> Version: 1.0
> Date: 2026-08-07
> Status: Draft

---

## Table of Contents

1. [Overview](#1-overview)
2. [AST Structure](#2-ast-structure)
3. [Node Types](#3-node-types)
4. [Mark Types](#4-mark-types)
5. [Schema](#5-schema)
6. [Serialization](#6-serialization)
7. [Validation](#7-validation)
8. [API Reference](#8-api-reference)

---

## 1. Overview

### 1.1 Purpose

The Document Model defines how documents are represented in memory as an Abstract Syntax Tree (AST).

### 1.2 Design Principles

1. **Tree-based**: Documents are trees, not flat structures
2. **Typed**: Every node has a type
3. **Attributed**: Nodes can have attributes
4. **Marked**: Text can have marks (bold, italic, etc.)
5. **Serializable**: Can be converted to/from JSON

---

## 2. AST Structure

### 2.1 Document

```typescript
interface Document {
  type: 'doc'
  content: Node[]
  attrs: Record<string, any>
}
```

### 2.2 Node

```typescript
interface Node {
  type: string
  attrs?: Record<string, any>
  content?: Node[]
  marks?: Mark[]
  text?: string  // only for text nodes
}
```

### 2.3 Mark

```typescript
interface Mark {
  type: string
  attrs?: Record<string, any>
}
```

### 2.4 Example

```json
{
  "type": "doc",
  "content": [
    {
      "type": "heading",
      "attrs": { "level": 1 },
      "content": [
        {
          "type": "text",
          "text": "Hello World"
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "type": "text",
          "text": "This is a ",
          "marks": [{ "type": "bold" }]
        },
        {
          "type": "text",
          "text": "paragraph"
        }
      ]
    }
  ]
}
```

---

## 3. Node Types

### 3.1 Block Nodes

#### Document Root

```typescript
interface DocNode {
  type: 'doc'
  content: BlockNode[]
  attrs: {
    title?: string
    language?: string
  }
}
```

#### Section

```typescript
interface SectionNode {
  type: 'section'
  content: BlockNode[]
  attrs: {
    pageOptions?: PageOptions
    header?: HeaderFooterConfig
    footer?: HeaderFooterConfig
  }
}
```

#### Paragraph

```typescript
interface ParagraphNode {
  type: 'paragraph'
  content: InlineNode[]
  attrs: {
    textAlign?: 'left' | 'center' | 'right' | 'justify'
    indent?: number
    marginTop?: number
    marginBottom?: number
  }
}
```

#### Heading

```typescript
interface HeadingNode {
  type: 'heading'
  content: InlineNode[]
  attrs: {
    level: 1 | 2 | 3 | 4 | 5 | 6
    textAlign?: 'left' | 'center' | 'right'
  }
}
```

#### Blockquote

```typescript
interface BlockquoteNode {
  type: 'blockquote'
  content: BlockNode[]
  attrs: {
    author?: string
    source?: string
  }
}
```

#### Code Block

```typescript
interface CodeBlockNode {
  type: 'codeBlock'
  content: TextNode[]
  attrs: {
    language?: string
  }
}
```

#### List

```typescript
interface BulletListNode {
  type: 'bulletList'
  content: ListItemNode[]
}

interface OrderedListNode {
  type: 'orderedList'
  content: ListItemNode[]
  attrs: {
    start?: number
  }
}

interface ListItemNode {
  type: 'listItem'
  content: BlockNode[]
}
```

#### Table

```typescript
interface TableNode {
  type: 'table'
  content: TableRowNode[]
  attrs: {
    columns: number
    rows: number
  }
}

interface TableRowNode {
  type: 'tableRow'
  content: TableCellNode[]
}

interface TableCellNode {
  type: 'tableCell'
  content: BlockNode[]
  attrs: {
    colspan?: number
    rowspan?: number
    width?: number
    backgroundColor?: string
  }
}
```

#### Image

```typescript
interface ImageNode {
  type: 'image'
  attrs: {
    src: string
    alt?: string
    title?: string
    width?: number
    height?: number
    align?: 'left' | 'center' | 'right'
  }
}
```

#### Horizontal Rule

```typescript
interface HorizontalRuleNode {
  type: 'horizontalRule'
}
```

#### Page Break

```typescript
interface PageBreakNode {
  type: 'pageBreak'
}
```

### 3.2 Inline Nodes

#### Text

```typescript
interface TextNode {
  type: 'text'
  text: string
  marks?: Mark[]
}
```

---

## 4. Mark Types

### 4.1 Bold

```typescript
interface BoldMark {
  type: 'bold'
}
```

### 4.2 Italic

```typescript
interface ItalicMark {
  type: 'italic'
}
```

### 4.3 Code

```typescript
interface CodeMark {
  type: 'code'
}
```

### 4.4 Link

```typescript
interface LinkMark {
  type: 'link'
  attrs: {
    href: string
    title?: string
    target?: '_blank' | '_self'
  }
}
```

### 4.5 Strike

```typescript
interface StrikeMark {
  type: 'strike'
}
```

### 4.6 Underline

```typescript
interface UnderlineMark {
  type: 'underline'
}
```

### 4.7 Highlight

```typescript
interface HighlightMark {
  type: 'highlight'
  attrs: {
    color?: string
  }
}
```

---

## 5. Schema

### 5.1 Schema Definition

```typescript
interface Schema {
  nodes: Record<string, NodeSpec>
  marks: Record<string, MarkSpec>
}

interface NodeSpec {
  content?: string
  attrs?: Record<string, AttrSpec>
  group?: string
  inline?: boolean
  atom?: boolean
  draggable?: boolean
  code?: boolean
  defining?: boolean
  toDOM?: (node: Node) => DOMOutputSpec
  parseDOM?: ParseRule[]
}

interface MarkSpec {
  attrs?: Record<string, AttrSpec>
  inclusive?: boolean
  group?: string
  toDOM?: (mark: Mark, inline: boolean) => DOMOutputSpec
  parseDOM?: ParseRule[]
}

interface AttrSpec {
  default?: any
  validate?: string
}
```

### 5.2 Content Expressions

Content expressions define what content a node can contain:

| Expression | Meaning |
|-----------|---------|
| `text*` | Zero or more text nodes |
| `text+` | One or more text nodes |
| `inline*` | Zero or more inline nodes |
| `inline+` | One or more inline nodes |
| `block*` | Zero or more block nodes |
| `block+` | One or more block nodes |
| `paragraph heading*` | Paragraph followed by zero or more headings |
| `(paragraph | heading)+` | One or more paragraphs or headings |

### 5.3 Default Schema

```typescript
const defaultSchema: Schema = {
  nodes: {
    doc: {
      content: 'block+'
    },
    paragraph: {
      group: 'block',
      content: 'inline*',
      attrs: {
        textAlign: { default: 'left' },
        indent: { default: 0 }
      }
    },
    heading: {
      group: 'block',
      content: 'inline*',
      attrs: {
        level: { default: 1 }
      }
    },
    blockquote: {
      group: 'block',
      content: 'block+'
    },
    codeBlock: {
      group: 'block',
      content: 'text*',
      atom: true,
      attrs: {
        language: { default: '' }
      }
    },
    bulletList: {
      group: 'block',
      content: 'listItem+'
    },
    orderedList: {
      group: 'block',
      content: 'listItem+',
      attrs: {
        start: { default: 1 }
      }
    },
    listItem: {
      content: 'paragraph block*'
    },
    table: {
      group: 'block',
      content: 'tableRow+'
    },
    tableRow: {
      content: 'tableCell+'
    },
    tableCell: {
      content: 'paragraph block*',
      attrs: {
        colspan: { default: 1 },
        rowspan: { default: 1 }
      }
    },
    image: {
      group: 'inline',
      atom: true,
      attrs: {
        src: {},
        alt: { default: '' },
        title: { default: '' }
      }
    },
    horizontalRule: {
      group: 'block',
      atom: true
    },
    pageBreak: {
      group: 'block',
      atom: true
    },
    text: {
      group: 'inline'
    }
  },
  marks: {
    bold: {},
    italic: {},
    code: {},
    link: {
      attrs: {
        href: {},
        title: { default: '' }
      }
    },
    strike: {},
    underline: {},
    highlight: {
      attrs: {
        color: { default: '#ffff00' }
      }
    }
  }
}
```

---

## 6. Serialization

### 6.1 ProseMirror JSON

```typescript
// ProseMirror JSON → Document AST
function fromProseMirror(pmJson: any): Document {
  return {
    type: 'doc',
    content: pmJson.content.map(fromProseMirrorNode),
    attrs: pmJson.attrs || {}
  }
}

function fromProseMirrorNode(pmNode: any): Node {
  if (pmNode.type === 'text') {
    return {
      type: 'text',
      text: pmNode.text,
      marks: pmNode.marks?.map(fromProseMirrorMark)
    }
  }
  
  return {
    type: pmNode.type,
    attrs: pmNode.attrs,
    content: pmNode.content?.map(fromProseMirrorNode)
  }
}

function fromProseMirrorMark(pmMark: any): Mark {
  return {
    type: pmMark.type,
    attrs: pmMark.attrs
  }
}

// Document AST → ProseMirror JSON
function toProseMirror(doc: Document): any {
  return {
    type: 'doc',
    content: doc.content.map(toProseMirrorNode),
    attrs: doc.attrs
  }
}

function toProseMirrorNode(node: Node): any {
  if (node.type === 'text') {
    return {
      type: 'text',
      text: node.text,
      marks: node.marks?.map(toProseMirrorMark)
    }
  }
  
  return {
    type: node.type,
    attrs: node.attrs,
    content: node.content?.map(toProseMirrorNode)
  }
}

function toProseMirrorMark(mark: Mark): any {
  return {
    type: mark.type,
    attrs: mark.attrs
  }
}
```

### 6.2 HTML

```typescript
// Document AST → HTML
function toHTML(doc: Document): string {
  return `<div class="kindy-editor">${doc.content.map(toHTMLNode).join('')}</div>`
}

function toHTMLNode(node: Node): string {
  switch (node.type) {
    case 'paragraph':
      return `<p>${node.content?.map(toHTMLNode).join('') || ''}</p>`
    case 'heading':
      return `<h${node.attrs.level}>${node.content?.map(toHTMLNode).join('') || ''}</h${node.attrs.level}>`
    case 'text':
      let text = escapeHTML(node.text || '')
      if (node.marks) {
        for (const mark of node.marks) {
          text = applyMark(text, mark)
        }
      }
      return text
    default:
      return ''
  }
}

// HTML → Document AST
function fromHTML(html: string): Document {
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')
  return {
    type: 'doc',
    content: Array.from(doc.body.children).map(fromHTMLNode),
    attrs: {}
  }
}

function fromHTMLNode(element: HTMLElement): Node {
  const type = element.tagName.toLowerCase()
  return {
    type: type,
    content: Array.from(element.childNodes).map(child => {
      if (child.nodeType === Node.TEXT_NODE) {
        return { type: 'text', text: child.textContent || '' }
      }
      return fromHTMLNode(child as HTMLElement)
    })
  }
}
```

---

## 7. Validation

### 7.1 Validation Rules

```typescript
interface ValidationRule {
  name: string
  validate: (node: Node) => boolean
  message: string
}

const validationRules: ValidationRule[] = [
  {
    name: 'doc-must-have-content',
    validate: (node) => node.type === 'doc' && (node.content?.length || 0) > 0,
    message: 'Document must have at least one block'
  },
  {
    name: 'heading-level-valid',
    validate: (node) => {
      if (node.type !== 'heading') return true
      return node.attrs.level >= 1 && node.attrs.level <= 6
    },
    message: 'Heading level must be between 1 and 6'
  },
  {
    name: 'image-must-have-src',
    validate: (node) => {
      if (node.type !== 'image') return true
      return !!node.attrs.src
    },
    message: 'Image must have a source URL'
  }
]
```

### 7.2 Validation Result

```typescript
interface ValidationResult {
  valid: boolean
  errors: ValidationError[]
}

interface ValidationError {
  node: Node
  path: number[]
  rule: string
  message: string
}

function validate(doc: Document): ValidationResult {
  const errors: ValidationError[] = []
  
  function traverse(node: Node, path: number[]) {
    for (const rule of validationRules) {
      if (!rule.validate(node)) {
        errors.push({
          node,
          path,
          rule: rule.name,
          message: rule.message
        })
      }
    }
    
    if (node.content) {
      node.content.forEach((child, index) => {
        traverse(child, [...path, index])
      })
    }
  }
  
  traverse(doc, [])
  
  return {
    valid: errors.length === 0,
    errors
  }
}
```

### 7.3 Auto-fix

```typescript
function fix(doc: Document): Document {
  const fixed = clone(doc)
  
  function traverse(node: Node) {
    // Fix heading level
    if (node.type === 'heading') {
      if (node.attrs.level < 1) node.attrs.level = 1
      if (node.attrs.level > 6) node.attrs.level = 6
    }
    
    // Fix image without src
    if (node.type === 'image' && !node.attrs.src) {
      node.attrs.src = 'placeholder.png'
    }
    
    // Recurse
    if (node.content) {
      node.content.forEach(traverse)
    }
  }
  
  traverse(fixed)
  return fixed
}
```

---

## 8. API Reference

### 8.1 Types

```typescript
interface Document { ... }
interface Node { ... }
interface Mark { ... }
interface Schema { ... }
interface ValidationResult { ... }
interface ValidationError { ... }
```

### 8.2 Functions

```typescript
// Serialization
function fromProseMirror(pmJson: any): Document
function toProseMirror(doc: Document): any
function toHTML(doc: Document): string
function fromHTML(html: string): Document

// Validation
function validate(doc: Document): ValidationResult
function fix(doc: Document): Document

// Utility
function clone<T>(obj: T): T
function escapeHTML(str: string): string
```

---

## Appendix: References

- [ProseMirror Schema](https://prosemirror.net/docs/guide/#schema)
- [Tiptap Schema](https://tiptap.dev/guide/custom-extensions)
