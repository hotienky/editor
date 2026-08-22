# Layout Engine Specification

> Version: 1.0
> Date: 2026-08-07
> Status: Draft

---

## Table of Contents

1. [Overview](#1-overview)
2. [Input/Output](#2-inputoutput)
3. [Pipeline Stages](#3-pipeline-stages)
4. [Text Measurement](#4-text-measurement)
5. [Line Breaking](#5-line-breaking)
6. [Paragraph Layout](#6-paragraph-layout)
7. [Table Layout](#7-table-layout)
8. [Image Layout](#8-image-layout)
9. [Pagination](#9-pagination)
10. [Section Layout](#10-section-layout)
11. [Header/Footer](#11-headerfooter)
12. [Performance](#12-performance)
13. [API Reference](#13-api-reference)

---

## 1. Overview

### 1.1 Purpose

The Layout Engine converts Document AST into a Layout Tree that represents how content is distributed across pages.

### 1.2 Architecture

```
Document AST
    ↓
┌─────────────────────────────┐
│      Block Measurement      │  Measure height of each block
└─────────────────────────────┘
    ↓
┌─────────────────────────────┐
│        Line Layout          │  Break text into lines
└─────────────────────────────┘
    ↓
┌─────────────────────────────┐
│      Paragraph Layout       │  Calculate paragraph height
└─────────────────────────────┘
    ↓
┌─────────────────────────────┐
│        Table Layout         │  Size table rows/columns
└─────────────────────────────┘
    ↓
┌─────────────────────────────┐
│        Image Layout         │  Size and position images
└─────────────────────────────┘
    ↓
┌─────────────────────────────┐
│        Page Layout          │  Paginate content
└─────────────────────────────┘
    ↓
┌─────────────────────────────┐
│       Section Layout        │  Handle section breaks
└─────────────────────────────┘
    ↓
Layout Tree
```

### 1.3 Design Principles

1. **Framework Agnostic**: No dependency on React/Vue/DOM
2. **Incremental**: Can compute layout for changed blocks only
3. **Cacheable**: Results can be cached and reused
4. **Headless**: Can run in Web Worker or Node.js

---

## 2. Input/Output

### 2.1 Input

```typescript
interface LayoutInput {
  nodes: Node[]           // Document AST nodes
  pageOptions: PageOptions // Page configuration
}

interface PageOptions {
  size: {
    width: number    // in cm
    height: number   // in cm
  }
  orientation: 'portrait' | 'landscape'
  margin: {
    top: number      // in cm
    bottom: number   // in cm
    left: number     // in cm
    right: number    // in cm
  }
  header: HeaderFooterConfig
  footer: HeaderFooterConfig
}

interface HeaderFooterConfig {
  enable: boolean
  marginTop?: number    // in cm
  marginBottom?: number // in cm
  content?: {
    text?: string
    logo?: string
    align?: 'left' | 'center' | 'right'
    layout?: 'single' | 'split'
    leftText?: string
    rightText?: string
  }
}
```

### 2.2 Output

```typescript
interface LayoutTree {
  pages: LayoutPage[]
  totalPages: number
  totalHeight: number
}

interface LayoutPage {
  pageNumber: number
  blocks: LayoutBlock[]
  contentHeight: number
  contentTop: number
  contentBottom: number
  header?: HeaderFooterData
  footer?: HeaderFooterData
}

interface LayoutBlock {
  node: Node
  position: number      // position in document
  top: number           // y position within page
  height: number        // block height in px
  pageNumber: number    // which page it's on
}

interface HeaderFooterData {
  visible: boolean
  text?: string
  logo?: string
  align?: 'left' | 'center' | 'right'
}
```

---

## 3. Pipeline Stages

### 3.1 Block Measurement

Measure the height of each block in the document.

```typescript
function measureBlock(node: Node, contentWidth: number): number {
  switch (node.type) {
    case 'paragraph':
      return measureParagraph(node, contentWidth)
    case 'heading':
      return measureHeading(node, contentWidth)
    case 'table':
      return measureTable(node, contentWidth)
    case 'image':
      return measureImage(node, contentWidth)
    case 'codeBlock':
      return measureCodeBlock(node, contentWidth)
    case 'bulletList':
    case 'orderedList':
      return measureList(node, contentWidth)
    case 'blockquote':
      return measureBlockquote(node, contentWidth)
    default:
      return estimateBlockHeight(node, contentWidth)
  }
}
```

### 3.2 Line Layout

Break text into lines based on available width.

```
Input:  "The quick brown fox jumps over the lazy dog"
Width:  200px
Font:   Arial 14px

Output: Line 1: "The quick brown"
        Line 2: "fox jumps over"
        Line 3: "the lazy dog"
```

### 3.3 Paragraph Layout

Calculate paragraph height from lines.

```
Paragraph height =
  margin-top +
  first-line-indent +
  (line-height × line-count) +
  margin-bottom
```

### 3.4 Table Layout

Size table rows and columns.

```
Table width = sum(column-widths) + (borders × columns)

Column width calculation:
1. Auto columns: distribute remaining width equally
2. Fixed columns: use specified width
3. Percentage columns: calculate from table width
```

### 3.5 Image Layout

Size and position images.

```
Image dimensions:
1. Use specified width/height if provided
2. Use natural dimensions if available
3. Use default dimensions (400×300) if neither
4. Maintain aspect ratio
```

### 3.6 Pagination

Distribute content across pages.

```
Algorithm:
1. Start with first block
2. Check if block fits on current page
3. If yes, add to current page
4. If no, start new page
5. Repeat until all blocks are placed

Constraints:
- Page height = page size - margins - header - footer
- Widow/orphan control
- Page break before/after rules
```

### 3.7 Section Layout

Handle section breaks with different layout settings.

```
Section 1: A4, Portrait, 2.54cm margins
Section 2: A3, Landscape, 2cm margins
Section 3: A4, Portrait, 2.54cm margins
```

---

## 4. Text Measurement

### 4.1 Canvas API

Use Canvas API for accurate text measurement:

```typescript
const canvas = document.createElement('canvas')
const ctx = canvas.getContext('2d')

function measureText(text: string, style: TextStyle): TextMetrics {
  ctx.font = `${style.fontWeight} ${style.fontSize}px ${style.fontFamily}`
  return ctx.measureText(text)
}
```

### 4.2 Font Handling

- Wait for web fonts to load before measurement
- Use `document.fonts.ready` promise
- Cache font metrics

### 4.3 Cache Strategy

LRU cache for text measurements:

```typescript
class TextMeasurementCache {
  private cache: Map<string, TextMetrics>
  private maxSize: number = 10000
  
  get(text: string, style: TextStyle): TextMetrics | null {
    const key = this.getKey(text, style)
    return this.cache.get(key) || null
  }
  
  set(text: string, style: TextStyle, metrics: TextMetrics): void {
    const key = this.getKey(text, style)
    if (this.cache.size >= this.maxSize) {
      this.evict()
    }
    this.cache.set(key, metrics)
  }
  
  private getKey(text: string, style: TextStyle): string {
    return `${text}|${style.fontSize}|${style.fontFamily}|${style.fontWeight}`
  }
}
```

### 4.4 Web Worker Support

Move text measurement to Web Worker for large documents:

```typescript
// Main thread
const worker = new Worker('layout-worker.js')
worker.postMessage({ type: 'measure', nodes, pageOptions })
worker.onmessage = (e) => {
  const layoutTree = e.data
  render(layoutTree)
}

// Worker thread
self.onmessage = (e) => {
  if (e.data.type === 'measure') {
    const layoutTree = computeLayout(e.data.nodes, e.data.pageOptions)
    self.postMessage(layoutTree)
  }
}
```

---

## 5. Line Breaking

### 5.1 Knuth-Plass Algorithm

Optimal line breaking algorithm:

```typescript
function breakTextIntoLines(
  text: string,
  maxWidth: number,
  style: TextStyle
): string[] {
  const words = text.split(/\s+/)
  const lines: string[] = []
  let currentLine = ''
  
  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word
    const width = measureText(testLine, style).width
    
    if (width <= maxWidth) {
      currentLine = testLine
    } else {
      if (currentLine) {
        lines.push(currentLine)
      }
      currentLine = word
    }
  }
  
  if (currentLine) {
    lines.push(currentLine)
  }
  
  return lines
}
```

### 5.2 Word Wrapping

Handle word wrapping for different languages:

- **English**: Wrap at word boundaries (spaces)
- **Chinese/Japanese/Korean**: Wrap at any character
- **German**: Handle compound words
- **Arabic**: Handle right-to-left text

### 5.3 Hyphenation

Optional hyphenation support:

```typescript
function hyphenateWord(word: string, maxWidth: number): string[] {
  // Use hyphenation library (e.g., hyphen)
  const hyphens = hyphen.getHyphens(word)
  // Return possible break points
  return hyphens
}
```

### 5.4 CJK Support

CJK text has no word boundaries:

```typescript
function breakCJKText(
  text: string,
  maxWidth: number,
  style: TextStyle
): string[] {
  const chars = Array.from(text)
  const lines: string[] = []
  let currentLine = ''
  
  for (const char of chars) {
    const testLine = currentLine + char
    const width = measureText(testLine, style).width
    
    if (width <= maxWidth) {
      currentLine = testLine
    } else {
      lines.push(currentLine)
      currentLine = char
    }
  }
  
  if (currentLine) {
    lines.push(currentLine)
  }
  
  return lines
}
```

---

## 6. Paragraph Layout

### 6.1 Height Calculation

```typescript
function calculateParagraphHeight(
  node: Node,
  contentWidth: number
): number {
  const text = getTextContent(node)
  const style = getStyle(node)
  const lines = breakTextIntoLines(text, contentWidth, style)
  
  const lineHeight = style.fontSize * style.lineHeight
  const marginTop = node.attrs.marginTop || 0
  const marginBottom = node.attrs.marginBottom || 0
  const firstLineIndent = node.attrs.firstLineIndent || 0
  
  return marginTop + (lines.length * lineHeight) + marginBottom
}
```

### 6.2 Spacing

Handle paragraph spacing:

- **margin-top**: Space above paragraph
- **margin-bottom**: Space below paragraph
- **line-height**: Space between lines
- **first-line-indent**: Indent of first line

### 6.3 Alignment

Handle text alignment:

- **left**: Align to left margin
- **center**: Center horizontally
- **right**: Align to right margin
- **justify**: Stretch to fill width

---

## 7. Table Layout

### 7.1 Column Width Calculation

```typescript
function calculateColumnWidths(
  table: Node,
  availableWidth: number
): number[] {
  const columns = table.content[0].content // first row
  const widths: number[] = []
  let fixedWidth = 0
  let autoColumns = 0
  
  // First pass: calculate fixed widths
  for (const cell of columns) {
    const width = cell.attrs.width
    if (width) {
      widths.push(width)
      fixedWidth += width
    } else {
      widths.push(0)
      autoColumns++
    }
  }
  
  // Second pass: distribute remaining width
  if (autoColumns > 0) {
    const remainingWidth = availableWidth - fixedWidth
    const autoWidth = remainingWidth / autoColumns
    
    for (let i = 0; i < widths.length; i++) {
      if (widths[i] === 0) {
        widths[i] = autoWidth
      }
    }
  }
  
  return widths
}
```

### 7.2 Row Height Calculation

```typescript
function calculateRowHeights(
  table: Node,
  columnWidths: number[]
): number[] {
  const rows = table.content
  const heights: number[] = []
  
  for (const row of rows) {
    let maxHeight = 0
    
    for (let i = 0; i < row.content.length; i++) {
      const cell = row.content[i]
      const cellHeight = calculateCellHeight(cell, columnWidths[i])
      maxHeight = Math.max(maxHeight, cellHeight)
    }
    
    heights.push(maxHeight)
  }
  
  return heights
}
```

### 7.3 Spanning

Handle column and row spanning:

```typescript
interface CellSpan {
  colspan: number
  rowspan: number
}

function getCellSpan(cell: Node): CellSpan {
  return {
    colspan: cell.attrs.colspan || 1,
    rowspan: cell.attrs.rowspan || 1
  }
}
```

---

## 8. Image Layout

### 8.1 Dimension Calculation

```typescript
function calculateImageDimensions(
  node: Node,
  contentWidth: number
): { width: number; height: number } {
  const attrs = node.attrs
  
  // Use specified dimensions
  if (attrs.width && attrs.height) {
    return { width: attrs.width, height: attrs.height }
  }
  
  // Use natural dimensions
  if (attrs.naturalWidth && attrs.naturalHeight) {
    const ratio = attrs.naturalHeight / attrs.naturalWidth
    const width = Math.min(attrs.naturalWidth, contentWidth)
    return { width, height: width * ratio }
  }
  
  // Default dimensions
  return { width: 400, height: 300 }
}
```

### 8.2 Aspect Ratio

Maintain aspect ratio when resizing:

```typescript
function maintainAspectRatio(
  width: number,
  height: number,
  maxWidth: number
): { width: number; height: number } {
  if (width <= maxWidth) {
    return { width, height }
  }
  
  const ratio = height / width
  return {
    width: maxWidth,
    height: maxWidth * ratio
  }
}
```

---

## 9. Pagination

### 9.1 Page Break Algorithm

```typescript
function computePageBreaks(
  blocks: LayoutBlock[],
  pageHeight: number
): number[] {
  const breaks: number[] = []
  let currentHeight = 0
  
  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i]
    
    if (currentHeight + block.height > pageHeight) {
      breaks.push(i)
      currentHeight = block.height
    } else {
      currentHeight += block.height
    }
  }
  
  return breaks
}
```

### 9.2 Content Distribution

Distribute content across pages:

```typescript
function distributeContent(
  blocks: LayoutBlock[],
  pageHeight: number
): LayoutPage[] {
  const pages: LayoutPage[] = []
  let currentPage: LayoutBlock[] = []
  let currentHeight = 0
  
  for (const block of blocks) {
    if (currentHeight + block.height > pageHeight && currentPage.length > 0) {
      pages.push({
        pageNumber: pages.length + 1,
        blocks: currentPage,
        contentHeight: currentHeight
      })
      currentPage = []
      currentHeight = 0
    }
    
    currentPage.push(block)
    currentHeight += block.height
  }
  
  // Add last page
  if (currentPage.length > 0) {
    pages.push({
      pageNumber: pages.length + 1,
      blocks: currentPage,
      contentHeight: currentHeight
    })
  }
  
  return pages
}
```

### 9.3 Widow/Orphan Control

Prevent widows and orphans:

```typescript
interface WidowOrphanConfig {
  widowLines: number    // min lines at top of page
  orphanLines: number   // min lines at bottom of page
}

function checkWidowOrphan(
  block: LayoutBlock,
  pageNumber: number,
  totalPages: number,
  config: WidowOrphanConfig
): boolean {
  // Check if block is a widow (last line of paragraph on new page)
  if (pageNumber > 1 && block.isLastLine) {
    return block.lineCount >= config.widowLines
  }
  
  // Check if block is an orphan (first line of paragraph on last page)
  if (pageNumber === totalPages && block.isFirstLine) {
    return block.lineCount >= config.orphanLines
  }
  
  return true
}
```

---

## 10. Section Layout

### 10.1 Section Breaks

Handle section breaks with different layout settings:

```typescript
interface Section {
  pageNumber: number
  pageOptions: PageOptions
}

function computeSections(
  document: Document,
  defaultOptions: PageOptions
): Section[] {
  const sections: Section[] = []
  let currentOptions = defaultOptions
  
  for (const node of document.content) {
    if (node.type === 'section') {
      sections.push({
        pageNumber: sections.length + 1,
        pageOptions: node.attrs.pageOptions || currentOptions
      })
      currentOptions = node.attrs.pageOptions || currentOptions
    }
  }
  
  return sections
}
```

### 10.2 Different Page Sizes

Support different page sizes per section:

```typescript
// Section 1: A4 Portrait
{
  size: { width: 21, height: 29.7 },
  orientation: 'portrait'
}

// Section 2: A3 Landscape
{
  size: { width: 42, height: 29.7 },
  orientation: 'landscape'
}
```

### 10.3 Different Margins

Support different margins per section:

```typescript
// Section 1: Standard margins
{
  margin: { top: 2.54, bottom: 2.54, left: 2.54, right: 2.54 }
}

// Section 2: Narrow margins
{
  margin: { top: 1.27, bottom: 1.27, left: 1.27, right: 1.27 }
}
```

---

## 11. Header/Footer

### 11.1 Positioning

```typescript
function getHeaderPosition(
  pageNumber: number,
  totalPages: number,
  config: HeaderFooterConfig
): { top: number; visible: boolean } {
  const visible = shouldShowHeaderFooter(config, pageNumber, totalPages)
  
  return {
    top: config.marginTop || 0,
    visible
  }
}

function getFooterPosition(
  pageNumber: number,
  totalPages: number,
  config: HeaderFooterConfig
): { bottom: number; visible: boolean } {
  const visible = shouldShowHeaderFooter(config, pageNumber, totalPages)
  
  return {
    bottom: config.marginBottom || 0,
    visible
  }
}
```

### 11.2 Content Generation

```typescript
function getHeaderFooterContent(
  config: HeaderFooterConfig,
  pageNumber: number,
  totalPages: number
): HeaderFooterContent {
  const text = config.content?.text || ''
  
  // Replace variables
  const processedText = text
    .replace('{page}', pageNumber.toString())
    .replace('{pages}', totalPages.toString())
  
  return {
    text: processedText,
    logo: config.content?.logo,
    align: config.content?.align || 'center'
  }
}
```

### 11.3 Scope Rules

Control when header/footer is shown:

```typescript
enum HeaderFooterScope {
  ALL = 'all',           // Show on all pages
  FIRST_LAST = 'first_last',  // Show on first and last pages
  ODD_EVEN = 'odd_even'  // Show on odd/even pages
}

function shouldShowHeaderFooter(
  config: HeaderFooterConfig,
  pageNumber: number,
  totalPages: number
): boolean {
  if (!config.enable) return false
  
  switch (config.scope) {
    case HeaderFooterScope.ALL:
      return true
    case HeaderFooterScope.FIRST_LAST:
      return pageNumber === 1 || pageNumber === totalPages
    case HeaderFooterScope.ODD_EVEN:
      return pageNumber % 2 === 1
    default:
      return true
  }
}
```

---

## 12. Performance

### 12.1 Caching

Cache layout results:

```typescript
class LayoutCache {
  private cache: Map<string, LayoutTree>
  
  getKey(nodes: Node[], pageOptions: PageOptions): string {
    // Simple cache key based on node count and page size
    return `${nodes.length}|${pageOptions.size.width}|${pageOptions.size.height}`
  }
  
  get(key: string): LayoutTree | null {
    return this.cache.get(key) || null
  }
  
  set(key: string, layout: LayoutTree): void {
    this.cache.set(key, layout)
  }
  
  invalidate(): void {
    this.cache.clear()
  }
}
```

### 12.2 Incremental Layout

Only recompute changed blocks:

```typescript
function incrementalLayout(
  oldLayout: LayoutTree,
  changedBlocks: LayoutBlock[],
  allBlocks: LayoutBlock[]
): LayoutTree {
  // Find which pages are affected
  const affectedPages = new Set<number>()
  
  for (const block of changedBlocks) {
    affectedPages.add(block.pageNumber)
  }
  
  // Recompute only affected pages
  for (const pageNumber of affectedPages) {
    const page = oldLayout.pages[pageNumber - 1]
    recomputePage(page, allBlocks)
  }
  
  return oldLayout
}
```

### 12.3 Web Worker

Move layout computation to Web Worker:

```typescript
// Main thread
class LayoutWorker {
  private worker: Worker
  
  constructor() {
    this.worker = new Worker('layout-worker.js')
  }
  
  compute(nodes: Node[], pageOptions: PageOptions): Promise<LayoutTree> {
    return new Promise((resolve) => {
      this.worker.onmessage = (e) => resolve(e.data)
      this.worker.postMessage({ type: 'compute', nodes, pageOptions })
    })
  }
}

// Worker thread
self.onmessage = (e) => {
  if (e.data.type === 'compute') {
    const layout = computeLayout(e.data.nodes, e.data.pageOptions)
    self.postMessage(layout)
  }
}
```

### 12.4 Lazy Measurement

Only measure visible blocks:

```typescript
function lazyMeasure(
  blocks: LayoutBlock[],
  visibleRange: { start: number; end: number }
): LayoutBlock[] {
  return blocks.map((block, index) => {
    if (index >= visibleRange.start && index <= visibleRange.end) {
      // Measure actual height
      return { ...block, height: measureBlock(block.node) }
    } else {
      // Use estimated height
      return { ...block, height: estimateBlockHeight(block.node) }
    }
  })
}
```

---

## 13. API Reference

### 13.1 Types

```typescript
// Core types
interface Node { ... }
interface Mark { ... }
interface Document { ... }

// Layout types
interface LayoutTree { ... }
interface LayoutPage { ... }
interface LayoutBlock { ... }

// Configuration types
interface PageOptions { ... }
interface HeaderFooterConfig { ... }
```

### 13.2 Functions

```typescript
// Core functions
function computeLayout(nodes: Node[], options: PageOptions): LayoutTree
function computeAndCache(nodes: Node[], options: PageOptions): LayoutTree

// Query functions
function getPageAtY(y: number, layout: LayoutTree): number
function getYForPage(pageNumber: number, layout: LayoutTree): number

// Measurement functions
function measureText(text: string, style: TextStyle): TextMetrics
function measureBlock(node: Node, contentWidth: number): number

// Line breaking functions
function breakTextIntoLines(text: string, maxWidth: number, style: TextStyle): string[]
```

### 13.3 Classes

```typescript
class LayoutEngine {
  compute(nodes: Node[], options: PageOptions): LayoutTree
  computeAndCache(nodes: Node[], options: PageOptions): LayoutTree
  getPageAtY(y: number, layout: LayoutTree): number
  getYForPage(pageNumber: number, layout: LayoutTree): number
}

class TextMeasurementCache {
  get(text: string, style: TextStyle): TextMetrics | null
  set(text: string, style: TextStyle, metrics: TextMetrics): void
  clear(): void
}

class LayoutCache {
  get(key: string): LayoutTree | null
  set(key: string, layout: LayoutTree): void
  invalidate(): void
}
```

---

## Appendix: References

- [Knuth-Plass Line Breaking Algorithm](https://en.wikipedia.org/wiki/Knuth%E2%80%93Plass_line-breaking_algorithm)
- [Canvas API](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API)
- [Web Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API)
