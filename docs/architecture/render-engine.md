# Render Engine Specification

> Version: 1.0
> Date: 2026-08-07
> Status: Draft

---

## Table of Contents

1. [Overview](#1-overview)
2. [Architecture](#2-architecture)
3. [Page Renderer](#3-page-renderer)
4. [Viewport Virtualizer](#4-viewport-virtualizer)
5. [Header/Footer Renderer](#5-headerfooter-renderer)
6. [Virtual Scrolling](#6-virtual-scrolling)
7. [Framework Adapters](#7-framework-adapters)
8. [Performance](#8-performance)
9. [API Reference](#9-api-reference)

---

## 1. Overview

### 1.1 Purpose

The Render Engine converts Layout Tree into HTML/CSS for display in the browser.

### 1.2 Architecture

```
Layout Tree
    ↓
┌─────────────────────────────┐
│       Page Renderer         │  Generate HTML/CSS for each page
└─────────────────────────────┘
    ↓
┌─────────────────────────────┐
│    Viewport Virtualizer     │  Determine which pages to render
└─────────────────────────────┘
    ↓
┌─────────────────────────────┐
│  Header/Footer Renderer     │  Render header/footer content
└─────────────────────────────┘
    ↓
┌─────────────────────────────┐
│     DOM Update              │  Update the DOM
└─────────────────────────────┘
```

### 1.3 Design Principles

1. **Lazy Rendering**: Only render visible pages
2. **Virtual Scrolling**: Recycle DOM elements
3. **Framework Agnostic**: Core logic has no framework dependency
4. **Print Ready**: Generate print-friendly HTML/CSS

---

## 2. Architecture

### 2.1 Components

```
@kindy/render
├── PageRenderer           # Generate HTML/CSS for a single page
├── ViewportVirtualizer    # Determine visible pages
├── HeaderFooterRenderer   # Render header/footer
├── PrintRenderer          # Render for print/export
└── index.ts              # Public API
```

### 2.2 Data Flow

```
Layout Tree
    ↓
ViewportVirtualizer.getVisiblePages(scrollTop, containerHeight)
    ↓
[Page1, Page2, Page3, Page4, Page5]
    ↓
For each page:
  PageRenderer.renderPage(layoutPage)
    ↓
  HTML/CSS string
    ↓
  Insert into DOM
```

---

## 3. Page Renderer

### 3.1 Purpose

Generate HTML/CSS for a single page.

### 3.2 API

```typescript
class PageRenderer {
  // Generate page styles
  getPageStyles(layoutPage: LayoutPage): CSSProperties
  
  // Generate content area styles
  getContentStyles(layoutPage: LayoutPage): CSSProperties
  
  // Generate complete page HTML
  renderPage(layoutPage: LayoutPage, contentHtml: string): string
  
  // Generate print styles
  getPrintStyles(layoutPage: LayoutPage): string
}
```

### 3.3 Page HTML Structure

```html
<div class="kindy-print-page" style="...">
  <!-- Header (optional) -->
  <div class="kindy-print-header" style="...">
    <!-- Header content -->
  </div>
  
  <!-- Content area -->
  <div class="kindy-print-page-content" style="...">
    <!-- Page content -->
  </div>
  
  <!-- Footer (optional) -->
  <div class="kindy-print-footer" style="...">
    <!-- Footer content -->
  </div>
</div>
```

### 3.4 Page Styles

```typescript
function getPageStyles(layoutPage: LayoutPage): CSSProperties {
  return {
    width: `${pageWidth}cm`,
    height: `${pageHeight}cm`,
    padding: `${margin.top}cm ${margin.right}cm ${margin.bottom}cm ${margin.left}cm`,
    boxSizing: 'border-box',
    pageBreakAfter: 'always',
    position: 'relative',
    background: backgroundColor,
    overflow: 'hidden'
  }
}
```

### 3.5 Content Styles

```typescript
function getContentStyles(layoutPage: LayoutPage): CSSProperties {
  return {
    position: 'relative',
    minHeight: 0,
    flex: 1
  }
}
```

---

## 4. Viewport Virtualizer

### 4.1 Purpose

Determine which pages to render based on scroll position.

### 4.2 API

```typescript
class ViewportVirtualizer {
  // Update viewport state
  updateLayout(layoutTree: LayoutTree): void
  updateZoom(zoomLevel: number): void
  updateScrollTop(scrollTop: number): void
  
  // Get visible pages
  getVisiblePages(): number[]
  
  // Check if page is visible
  isVisible(pageNumber: number): boolean
  
  // Subscribe to viewport changes
  subscribe(callback: (pages: number[]) => void): () => void
}
```

### 4.3 Algorithm

```typescript
function getVisiblePages(
  scrollTop: number,
  containerHeight: number,
  layoutTree: LayoutTree,
  zoomLevel: number,
  buffer: number = 2
): number[] {
  const visiblePages: number[] = []
  const zoom = zoomLevel / 100
  
  for (let i = 0; i < layoutTree.totalPages; i++) {
    const pageTop = getPageTop(i, layoutTree) * zoom
    const pageBottom = pageTop + getPageHeight(i, layoutTree) * zoom
    
    // Check if page is visible (with buffer)
    if (pageBottom >= scrollTop - buffer * pageHeight &&
        pageTop <= scrollTop + containerHeight + buffer * pageHeight) {
      visiblePages.push(i)
    }
  }
  
  return visiblePages
}
```

---

## 5. Header/Footer Renderer

### 5.1 Purpose

Render header and footer content for each page.

### 5.2 API

```typescript
class HeaderFooterRenderer {
  // Render header
  renderHeader(pageNumber: number, totalPages: number): string
  
  // Render footer
  renderFooter(pageNumber: number, totalPages: number): string
  
  // Render both
  renderBoth(pageNumber: number, totalPages: number): {
    header: string
    footer: string
  }
}
```

### 5.3 Header HTML

```html
<div class="kindy-print-header" style="...">
  <!-- Single layout -->
  <div style="display: flex; align-items: center; justify-content: center;">
    <img src="logo.png" style="height: 32px;" />
    <span>Header text</span>
  </div>
  
  <!-- Split layout -->
  <div style="display: flex; justify-content: space-between;">
    <div>Left text</div>
    <div>Right text</div>
  </div>
</div>
```

### 5.4 Footer HTML

```html
<div class="kindy-print-footer" style="...">
  <!-- Page number -->
  <div style="text-align: center;">
    <span>Page 1 of 10</span>
  </div>
</div>
```

---

## 6. Virtual Scrolling

### 6.1 Purpose

Only render visible pages to improve performance.

### 6.2 Implementation

```typescript
class VirtualScroller {
  private container: HTMLElement
  private renderedPages: Map<number, HTMLElement>
  private viewport: ViewportVirtualizer
  
  constructor(container: HTMLElement) {
    this.container = container
    this.renderedPages = new Map()
    this.viewport = new ViewportVirtualizer()
    
    // Listen to scroll events
    container.addEventListener('scroll', this.onScroll.bind(this))
  }
  
  onScroll() {
    const scrollTop = this.container.scrollTop
    const containerHeight = this.container.clientHeight
    
    this.viewport.updateScrollTop(scrollTop)
    const visiblePages = this.viewport.getVisiblePages()
    
    this.renderPages(visiblePages)
  }
  
  renderPages(pages: number[]) {
    // Remove pages that are no longer visible
    for (const [pageNumber, element] of this.renderedPages) {
      if (!pages.includes(pageNumber)) {
        element.remove()
        this.renderedPages.delete(pageNumber)
      }
    }
    
    // Add pages that are now visible
    for (const pageNumber of pages) {
      if (!this.renderedPages.has(pageNumber)) {
        const element = this.createPageElement(pageNumber)
        this.container.appendChild(element)
        this.renderedPages.set(pageNumber, element)
      }
    }
  }
  
  createPageElement(pageNumber: number): HTMLElement {
    const div = document.createElement('div')
    div.innerHTML = this.renderPage(pageNumber)
    return div.firstElementChild as HTMLElement
  }
}
```

### 6.3 Buffer Configuration

```typescript
interface VirtualScrollConfig {
  buffer: number        // Number of pages to render outside viewport
  minimumVisible: number // Minimum pages to render
  recycleThreshold: number // When to recycle elements
}

const defaultConfig: VirtualScrollConfig = {
  buffer: 2,
  minimumVisible: 3,
  recycleThreshold: 10
}
```

---

## 7. Framework Adapters

### 7.1 React Adapter

```typescript
// @kindy/react
import { PageRenderer } from '@kindy/render'

interface PageProps {
  layoutPage: LayoutPage
  contentHtml: string
}

function Page({ layoutPage, contentHtml }: PageProps) {
  const renderer = new PageRenderer()
  const html = renderer.renderPage(layoutPage, contentHtml)
  
  return <div dangerouslySetInnerHTML={{ __html: html }} />
}

interface DocumentProps {
  layoutTree: LayoutTree
  visiblePages: number[]
}

function Document({ layoutTree, visiblePages }: DocumentProps) {
  return (
    <div className="kindy-document">
      {visiblePages.map(pageNumber => (
        <Page
          key={pageNumber}
          layoutPage={layoutTree.pages[pageNumber]}
          contentHtml={getPageContent(pageNumber)}
        />
      ))}
    </div>
  )
}
```

### 7.2 Vue Adapter

```typescript
// @kindy/vue
import { PageRenderer } from '@kindy/render'

const PageComponent = {
  props: {
    layoutPage: Object,
    contentHtml: String
  },
  setup(props) {
    const renderer = new PageRenderer()
    const html = computed(() => 
      renderer.renderPage(props.layoutPage, props.contentHtml)
    )
    
    return { html }
  },
  template: `<div v-html="html"></div>`
}

const DocumentComponent = {
  props: {
    layoutTree: Object,
    visiblePages: Array
  },
  components: { Page: PageComponent },
  template: `
    <div class="kindy-document">
      <Page
        v-for="pageNumber in visiblePages"
        :key="pageNumber"
        :layout-page="layoutTree.pages[pageNumber]"
        :content-html="getPageContent(pageNumber)"
      />
    </div>
  `
}
```

---

## 8. Performance

### 8.1 DOM Recycling

Reuse DOM elements instead of creating new ones:

```typescript
class DOMRecycler {
  private pool: Map<string, HTMLElement[]>
  
  acquire(tagName: string): HTMLElement {
    const pool = this.pool.get(tagName) || []
    if (pool.length > 0) {
      return pool.pop()!
    }
    return document.createElement(tagName)
  }
  
  release(element: HTMLElement): void {
    const tagName = element.tagName.toLowerCase()
    const pool = this.pool.get(tagName) || []
    pool.push(element)
    this.pool.set(tagName, pool)
  }
}
```

### 8.2 Batch Updates

Batch DOM updates to avoid layout thrashing:

```typescript
class BatchUpdater {
  private updates: (() => void)[] = []
  private scheduled = false
  
  add(update: () => void): void {
    this.updates.push(update)
    if (!this.scheduled) {
      this.schedule()
    }
  }
  
  schedule(): void {
    this.scheduled = true
    requestAnimationFrame(() => {
      this.flush()
      this.scheduled = false
    })
  }
  
  flush(): void {
    for (const update of this.updates) {
      update()
    }
    this.updates = []
  }
}
```

### 8.3 Lazy Rendering

Only render pages when they enter the viewport:

```typescript
function shouldRender(
  pageNumber: number,
  visiblePages: number[],
  renderedPages: Set<number>
): boolean {
  // Already rendered
  if (renderedPages.has(pageNumber)) {
    return false
  }
  
  // Not visible
  if (!visiblePages.includes(pageNumber)) {
    return false
  }
  
  return true
}
```

---

## 9. API Reference

### 9.1 Types

```typescript
interface LayoutTree { ... }
interface LayoutPage { ... }
interface LayoutBlock { ... }
interface PageOptions { ... }
interface CSSProperties { ... }
```

### 9.2 Classes

```typescript
class PageRenderer {
  getPageStyles(layoutPage: LayoutPage): CSSProperties
  getContentStyles(layoutPage: LayoutPage): CSSProperties
  renderPage(layoutPage: LayoutPage, contentHtml: string): string
  getPrintStyles(layoutPage: LayoutPage): string
}

class ViewportVirtualizer {
  updateLayout(layoutTree: LayoutTree): void
  updateZoom(zoomLevel: number): void
  updateScrollTop(scrollTop: number): void
  getVisiblePages(): number[]
  isVisible(pageNumber: number): boolean
  subscribe(callback: (pages: number[]) => void): () => void
}

class HeaderFooterRenderer {
  renderHeader(pageNumber: number, totalPages: number): string
  renderFooter(pageNumber: number, totalPages: number): string
  renderBoth(pageNumber: number, totalPages: number): { header: string; footer: string }
}
```

### 9.3 Functions

```typescript
function renderPage(layoutPage: LayoutPage, contentHtml: string): string
function renderHeader(pageNumber: number, totalPages: number): string
function renderFooter(pageNumber: number, totalPages: number): string
function getVisiblePages(scrollTop: number, containerHeight: number, layoutTree: LayoutTree): number[]
```

---

## Appendix: References

- [Virtual Scrolling](https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API)
- [requestAnimationFrame](https://developer.mozilla.org/en-US/docs/Web/API/window/requestAnimationFrame)
- [CSS Paged Media](https://developer.mozilla.org/en-US/docs/Web/CSS/@page)
