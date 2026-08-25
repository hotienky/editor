# Render Engine Specification — OOXML-Native

> Version: 3.0
> Date: 2026-08-24
> Status: Active

---

## 1. Overview

Render Engine chuyển Layout Tree thành Canvas rendering. Input là `LayoutTree` (tính từ OOXML), output là pixel trên màn hình.

### Design Principles

1. **Canvas-based**: Render trên `<canvas>` element, không dùng DOM
2. **Viewport virtualization**: Chỉ render visible pages + buffer
3. **Font-accurate**: Dùng đúng font từ OOXML document
4. **Hi-DPI support**: Render ở device pixel ratio

---

## 2. Architecture

```
Layout Tree
  │
  ├─ Viewport Virtualizer → visible pages [n, n+1, n+2, ...]
  │
  ▼
For each visible page:
  │
  ├─ Canvas Painter
  │   ├─ paintBackground(page background, borders)
  │   ├─ paintHeader(header content)
  │   ├─ paintContent(page blocks)
  │   │   ├─ paintParagraph(para layout, resolved styles)
  │   │   ├─ paintTable(table layout, borders, cells)
  │   │   ├─ paintImage(image layout, data URL)
  │   │   └─ paintHyperlink(link range, color)
  │   └─ paintFooter(footer content)
  │
  ▼
Canvas display
```

---

## 3. Canvas Painter

### 3.1 Page Painting

```typescript
class OoxmlPainter {
  paintPage(
    ctx: CanvasRenderingContext2D,
    page: LayoutPage,
    package: OoxmlPackage,
    zoom: number
  ): void {
    // 1. Clear and draw page background
    ctx.save()
    ctx.scale(zoom, zoom)

    // 2. Draw page borders
    this.paintPageBorders(ctx, page)

    // 3. Draw header
    if (page.header) {
      this.paintHeaderFooter(ctx, page.header, 'header')
    }

    // 4. Draw content blocks
    for (const block of page.blocks) {
      this.paintBlock(ctx, block, package)
    }

    // 5. Draw footer
    if (page.footer) {
      this.paintHeaderFooter(ctx, page.footer, 'footer')
    }

    ctx.restore()
  }
}
```

### 3.2 Paragraph Painting

```typescript
private paintParagraph(
  ctx: CanvasRenderingContext2D,
  para: ParagraphLayout,
  package: OoxmlPackage
): void {
  const resolvedStyle = package.styles.resolveParagraph(para.pPr)

  for (const line of para.lines) {
    for (const run of line.runs) {
      const resolvedRun = package.styles.resolveCharacter(run.rPr)

      // Set font
      ctx.font = this.buildFontString(resolvedRun)
      ctx.fillStyle = resolvedRun.color || '#000000'

      // Draw text
      ctx.fillText(run.text, run.x, run.y)

      // Draw decorations
      if (resolvedRun.u) this.drawUnderline(ctx, run, resolvedRun.u)
      if (resolvedRun.strike) this.drawStrikethrough(ctx, run)
      if (resolvedRun.highlight) this.drawHighlight(ctx, run, resolvedRun.highlight)
    }
  }
}
```

### 3.3 Table Painting

```typescript
private paintTable(
  ctx: CanvasRenderingContext2D,
  table: TableLayout,
  package: OoxmlPackage
): void {
  // Draw cell backgrounds
  for (const cell of table.cells) {
    if (cell.shd) {
      ctx.fillStyle = cell.shd.fill
      ctx.fillRect(cell.x, cell.y, cell.width, cell.height)
    }
  }

  // Draw borders
  this.drawTableBorders(ctx, table)

  // Paint cell content
  for (const cell of table.cells) {
    ctx.save()
    ctx.translate(cell.x, cell.y)
    for (const block of cell.content) {
      this.paintBlock(ctx, block, package)
    }
    ctx.restore()
  }
}
```

---

## 4. Font Handling

### 4.1 Font Resolution

```typescript
function resolveFontForRun(
  rPr: RunProperties,
  package: OoxmlPackage
): string {
  // 1. Check rFonts attributes
  const fonts = rPr.rFonts
  if (fonts) {
    // Priority: ascii → hAnsi → eastAsia → cs
    return fonts.ascii || fonts.hAnsi || fonts.eastAsia || fonts.cs
  }

  // 2. Check style's rFonts
  const style = package.styles.resolveCharacter(rPr.rStyle)
  if (style?.rFonts) {
    return style.rFonts.ascii || style.rFonts.hAnsi
  }

  // 3. Check theme fonts
  if (package.theme) {
    return resolveThemeFont(package.theme, 'minorHAnsi')
  }

  // 4. System fallback
  return 'Times New Roman'
}
```

### 4.2 Font Loading

```typescript
class FontLoader {
  // Load fonts referenced in document
  async loadFonts(package: OoxmlPackage): Promise<void> {
    const fonts = this.extractFontNames(package)
    for (const font of fonts) {
      await document.fonts.load(`12px "${font}"`)
    }
  }

  // Check if font is loaded
  isFontLoaded(font: string): boolean {
    return document.fonts.check(`12px "${font}"`)
  }
}
```

---

## 5. Viewport Virtualization

### 5.1 Visible Pages

```typescript
class ViewportVirtualizer {
  getVisiblePages(
    scrollTop: number,
    containerHeight: number,
    layoutTree: LayoutTree,
    zoom: number,
    buffer: number = 2
  ): number[] {
    const pages: number[] = []
    const pageHeight = layoutTree.pageHeight * zoom

    for (let i = 0; i < layoutTree.totalPages; i++) {
      const pageTop = i * pageHeight
      const pageBottom = pageTop + pageHeight

      if (pageBottom >= scrollTop - buffer * pageHeight &&
          pageTop <= scrollTop + containerHeight + buffer * pageHeight) {
        pages.push(i)
      }
    }

    return pages
  }
}
```

### 5.2 Canvas Pool

```typescript
class CanvasPool {
  private pool: HTMLCanvasElement[]

  acquire(): HTMLCanvasElement {
    return this.pool.pop() || document.createElement('canvas')
  }

  release(canvas: HTMLCanvasElement): void {
    canvas.width = 0
    canvas.height = 0
    this.pool.push(canvas)
  }
}
```

---

## 6. Selection Rendering

### 6.1 Selection Highlight

```typescript
private paintSelection(
  ctx: CanvasRenderingContext2D,
  selection: Selection,
  layout: LayoutTree
): void {
  ctx.fillStyle = 'rgba(0, 120, 215, 0.3)'  // Word blue

  for (const range of selection.ranges) {
    const rects = this.getSelectionRects(range, layout)
    for (const rect of rects) {
      ctx.fillRect(rect.x, rect.y, rect.width, rect.height)
    }
  }
}
```

### 6.2 Caret

```typescript
private paintCaret(
  ctx: CanvasRenderingContext2D,
  position: ScreenPosition,
  focused: boolean
): void {
  ctx.strokeStyle = focused ? '#000000' : '#888888'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(position.x, position.y)
  ctx.lineTo(position.x, position.y + position.height)
  ctx.stroke()
}
```
