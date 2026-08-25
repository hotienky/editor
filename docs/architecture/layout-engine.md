# Layout Engine Specification — OOXML-Native

> Version: 3.0
> Date: 2026-08-24
> Status: Active

---

## 1. Overview

Layout Engine tính pagination trực tiếp từ OOXML tree. Input là `OoxmlPackage`, output là `LayoutTree` (mỗi page chứa blocks với positions).

### Design Principles

1. **Twips-based**: Tất cả measurements dùng twips (1/20 pt), không convert sang px sớm
2. **Style cascade**: Mỗi element resolve properties theo chain: docDefaults → style → direct
3. **Section-aware**: Mỗi section có page geometry riêng
4. **Word-compatible**: Line breaking, pagination logic giống Word

---

## 2. Units

```
Word OOXML units:
  twips     = 1/20 pt = 1/1440 inch    (lengths, margins, spacing)
  half-pt   = 1/2 pt                    (font size)
  EMU       = 1/914400 inch             (image dimensions)
  percentage = 1/50 of 1%               (table widths)

Conversions:
  1 cm = 566.93 twips
  1 inch = 1440 twips
  1 pt = 20 twips
  12pt font = 24 half-points
  1 cm = 360000 EMU
```

---

## 3. Pipeline

```
OoxmlPackage
  │
  ├─ 1. Resolve styles per element
  │     docDefaults → Normal → Heading1 → direct rPr
  │
  ├─ 2. Resolve numbering per paragraph
  │     numId → abstractNum → lvl[ilvl] → lvlText
  │
  ├─ 3. Resolve sections
  │     pgSz, pgMar, cols, header/footer references
  │
  ▼
Per-section layout:
  │
  ├─ 4. Measure blocks
  │     Paragraph: text width → lines → height
  │     Table: column widths → row heights → total
  │     Image: EMU dimensions → twips → height
  │
  ├─ 5. Break lines
  │     Word-compatible: space, hyphen, CJK boundary
  │     Justification: distribute extra space
  │
  ├─ 6. Paginate
  │     Greedy algorithm with:
  │     - keepNext: paragraph stays with next
  │     - keepLines: all lines on same page
  │     - pageBreakBefore: force new page
  │     - widowControl: min 2 lines top/bottom
  │
  ├─ 7. Layout headers/footers
  │     3 variants: default, first, even
  │     Per-section header/footer references
  │
  ▼
LayoutTree { pages: LayoutPage[] }
```

---

## 4. Text Measurement

### 4.1 Font Resolution

```typescript
function resolveFont(rFonts: RunFonts, theme: ThemePart): string {
  // Priority: ascii → hAnsi → eastAsia → cs
  // Theme fonts: majorHAnsi → themeMajorFont, minorEastAsia → themeMinorFont
  // Fallback: system fonts
}
```

### 4.2 Character Width

```typescript
function measureCharacter(
  char: string,
  font: string,
  size: number,        // half-points
  bold: boolean,
  italic: boolean
): { widthTwip: number; widthPx: number }

// Uses Canvas API for measurement
// Converts px back to twips using device DPI
```

### 4.3 Run Width

```typescript
function measureRun(
  text: string,
  rPr: ResolvedRunProperties
): RunMetrics {
  // Sum of character advances
  // Apply: spacing (hundredths of pt), kern, scaling
  return { widthTwip, widthPx, heightTwip, ascent, descent }
}
```

---

## 5. Line Breaking

### 5.1 Algorithm

```
Input: runs[], availableWidthTwip, jc, spacing

1. Flatten runs into character stream
2. For each character:
   a. Add char advance to currentWidth
   b. If char is break opportunity (space, hyphen, CJK):
      Record position as potential break
3. If currentWidth > availableWidthTwip:
   a. Break at last recorded opportunity
   b. If no opportunity: break at previous character
4. Apply justification (if jc = 'both'):
   Distribute extra space across expandable characters
5. Return lines[]
```

### 5.2 Break Opportunities

| Type | Characters | Example |
|---|---|---|
| Space | U+0020 | "word break" |
| Hyphen | U+002D, U+2010 | "co-worker" |
| CJK | U+4E00-U+9FFF, U+3040-U+309F | "日本語" |
| Zero-width space | U+200B | "word​break" |

---

## 6. Pagination

### 6.1 Inputs

```typescript
interface PageDefaults {
  pgSz: { w: number; h: number }           // twips
  pgMar: {
    top: number; right: number; bottom: number; left: number
    header: number; footer: number; gutter: number
  }
  cols: { num: number; space: number }     // columns config
}
```

### 6.2 Algorithm

```
For each section:
  1. Calculate content height:
     contentHeight = pgSz.h - pgMar.top - pgMar.bottom
     If header: contentHeight -= headerHeight + pgMar.header
     If footer: contentHeight -= footerHeight + pgMar.footer

  2. For each block in section:
     a. If block.height <= remainingHeight:
        Add to current page
        remainingHeight -= block.height
     b. Else:
        Start new page
        Check keepNext, keepLines, pageBreakBefore
        Add block to new page

  3. Apply widowControl:
     If paragraph has only 2 lines and split across pages:
     Move both lines to next page
```

---

## 7. Header/Footer Layout

### 7.1 Variant Selection

```
Per page, per section:
  1. If section.titlePg && pageNumber === 1:
     → Use first header/footer
  2. If section.evenAndOddHeaders && pageNumber % 2 === 0:
     → Use even header/footer
  3. Otherwise:
     → Use default header/footer
```

### 7.2 Content Layout

Header/footer content is OOXML paragraphs, same layout rules as body text:
- Measure, break lines, paginate within header/footer area
- Support images, tables, tabs, page numbers

---

## 8. Performance

### 8.1 Incremental Layout

```typescript
class IncrementalLayout {
  // Track dirty sections
  markDirty(sectionIndex: number): void

  // Only re-layout dirty sections
  computeIncremental(
    doc: OoxmlPackage,
    dirtySections: Set<number>
  ): LayoutTree
}
```

### 8.2 Worker Offload

```typescript
// Main thread
const worker = new Worker('ooxml-layout-worker.js')
worker.postMessage({ type: 'layout', package: ooxmlPackage })
worker.onmessage = (e) => render(e.data)

// Worker thread
self.onmessage = (e) => {
  const layout = new OoxmlLayoutEngine().compute(e.data.package)
  self.postMessage(layout)
}
```
