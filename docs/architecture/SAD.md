# Software Architecture Document — Kindy Editor v3.0

> Version: 3.0
> Date: 2026-08-24
> Status: Active
> Author: Kindy Team

---

## Mục lục

1. [Overview](#1-overview)
2. [Architecture Principles](#2-architecture-principles)
3. [System Architecture](#3-system-architecture)
4. [OOXML Document Model](#4-ooxml-document-model)
5. [Style Resolution](#5-style-resolution)
6. [Numbering Engine](#6-numbering-engine)
7. [Layout Engine](#7-layout-engine)
8. [Render Engine](#8-render-engine)
9. [Storage & Delta](#9-storage--delta)
10. [Collaboration](#10-collaboration)
11. [Round-trip Fidelity](#11-round-trip-fidelity)
12. [Non-functional Requirements](#12-non-functional-requirements)

---

## 1. Overview

### 1.1 Purpose

Kindy Editor là Canvas-based document editor SDK cho web, thiết kế để mở và chỉnh sửa tài liệu DOCX từ SharePoint/Microsoft Word với **độ tương thích cao nhất có thể**.

### 1.2 Architecture Decision

**OOXML-Native Architecture**: OOXML tree là canonical state trong bộ nhớ.

```
Không dùng ProseMirror JSON làm canonical state.
Không dùng `docx` npm cho core parsing.
OOXML parsed trực tiếp → OoxmlPackage → Layout → Canvas.
```

### 1.3 Scope

- Import/export DOCX với fidelity cao
- Editing trực tiếp trên OOXML tree
- Layout/pagination theo đúng Word metrics
- Track changes, comments, headers/footers
- Collaboration via OT trên OOXML tree

---

## 2. Architecture Principles

### 2.1 OOXML is Canonical

```typescript
// MỤC TIÊU: OOXML tree là single source of truth
interface OoxmlPackage {
  document: DocumentPart    // word/document.xml
  styles: StylesPart        // word/styles.xml
  numbering: NumberingPart  // word/numbering.xml
  // ...
}
```

- **Import**: Parse OOXML → OoxmlPackage (không convert sang format khác)
- **Export**: Serialize OoxmlPackage → OOXML bytes (không reconstruct)
- **Editing**: Modify OoxmlPackage trực tiếp
- **Storage**: Save OoxmlPackage (hoặc delta)

### 2.2 Preserve Everything

```typescript
// Mọi element không hỗ trợ → giữ nguyên gốc
interface Paragraph {
  pPr?: ParagraphProperties
  content: (Run | Hyperlink)[]
  _raw?: Element  // XML gốc, giữ lại để export
}
```

### 2.3 Layout from Properties

```typescript
// Layout tính từ OOXML properties, không từ display format
// twips, half-points, EMU — units gốc của Word
const TWIPS_PER_CM = 566.93
const HALF_PT_PER_CM = 28.35
```

### 2.4 Round-trip Validation

```
DOCX gốc → Kindy parse → Kindy serialize → DOCX xuất lại
                  ↓                              ↓
           Visual comparison              Byte comparison
           (pixel diff < threshold)       (structural match)
```

---

## 3. System Architecture

### 3.1 Layer Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                   Presentation (Vue 3)                       │
│  WordEditor · DocumentLibrary · Toolbar · Viewport           │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                   Editing Engine                             │
│  Transaction · Selection · Undo/Redo · Input Handler         │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                   OOXML Document Model                       │
│  OoxmlPackage · StyleResolver · NumberingEngine              │
│  SectionManager · RevisionEngine · CommentEngine             │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                   Layout Engine                              │
│  TextMeasure(twips) · LineBreak · Pagination · HeaderFooter  │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                   Render Layer                               │
│  CanvasPainter · ViewportVirtualizer · SelectionModel        │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                   Storage & IO                               │
│  OOXML Parser · OOXML Serializer · DeltaStorage · AutoSave   │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 Data Flow

```
SharePoint DOCX
  │
  ▼
OOXML Parser (fflate + DOMParser)
  │
  ▼
OoxmlPackage (canonical state in memory)
  │
  ├─ StyleResolver.resolve() → resolved properties per element
  ├─ NumberingEngine.resolve() → list text per paragraph
  ├─ SectionManager.resolve() → page geometry per section
  │
  ▼
OOXML Layout Engine
  │
  ├─ TextMeasure.measureRun() → width in twips
  ├─ LineBreak.breakParagraph() → lines
  ├─ Pagination.paginate() → pages with blocks
  ├─ HeaderFooterLayout.layout() → header/footer per page
  │
  ▼
Layout Tree
  │
  ▼
Canvas Painter
  │
  ├─ paintPage() → draw paragraphs, tables, images
  ├─ paintHeaderFooter() → draw header/footer content
  │
  ▼
Browser Display
```

---

## 4. OOXML Document Model

### 4.1 Package Structure

DOCX file là ZIP archive (OPC format):

```
document.docx (ZIP)
├── [Content_Types].xml
├── _rels/.rels
├── word/
│   ├── document.xml          ← Main content
│   ├── styles.xml            ← Style definitions
│   ├── numbering.xml         ← List definitions
│   ├── settings.xml          ← Document settings
│   ├── fontTable.xml         ← Font declarations
│   ├── theme/theme1.xml      ← Theme colors/fonts
│   ├── _rels/document.xml.rels
│   ├── header1.xml           ← Header sub-documents
│   ├── footer1.xml           ← Footer sub-documents
│   ├── comments.xml          ← Comments
│   ├── footnotes.xml         ← Footnotes
│   ├── endnotes.xml          ← Endnotes
│   └── media/                ← Images
```

### 4.2 Type System

```typescript
// Block-level
type BlockElement = Paragraph | Table | SdtBlock

// Paragraph
interface Paragraph {
  pPr?: ParagraphProperties
  content: (Run | Hyperlink | SdtInline)[]
  _raw?: Element
}

// Run
interface Run {
  rPr?: RunProperties
  content: (Text | Break | Tab | Drawing | Picture)[]
}

// Table
interface Table {
  tblPr?: TableProperties
  tblGrid: GridColumn[]
  content: TableRow[]    // rows
}
// TableRow → TableCell[] → content: (Paragraph | Table)[] (nested tables!)
```

### 4.3 Key Properties

**Paragraph Properties** (40+ properties):
- `pStyle`, `keepNext`, `keepLines`, `pageBreakBefore`, `widowControl`
- `numPr` (numbering reference), `spacing`, `ind`, `jc`, `tabs`
- `shd`, `pBdr`, `sectPr` (section break), `outlineLevel`

**Run Properties** (40+ properties):
- `rStyle`, `rFonts`, `b`, `i`, `u`, `strike`, `sz`, `color`
- `highlight`, `shd`, `vertAlign`, `spacing`, `kern`

**Table Properties**:
- `tblStyle`, `tblW`, `tblInd`, `tblBorders`, `jc`, `tblLook`
- `tblGrid` → `gridCol` widths

**Cell Properties**:
- `gridSpan`, `vMerge`, `tcW`, `tcMar`, `shd`, `vAlign`

---

## 5. Style Resolution

### 5.1 Cascade Chain

```
w:docDefaults (styles.xml)
  → w:rPrDefault / w:pPrDefault
    → w:style[styleId="Normal"]
      → w:style[styleId="Heading1"] (basedOn="Normal")
        → w:pStyle (from w:pPr)
          → w:rPr (direct formatting on w:r)
```

### 5.2 Resolution Rules

```typescript
class StyleResolver {
  // Resolve paragraph style
  resolveParagraph(pStyleId?: string): ResolvedParagraphStyle

  // Resolve character style (on run)
  resolveCharacter(rStyleId?: string): ResolvedCharacterStyle

  // Properties merge order:
  // 1. docDefaults
  // 2. basedOn chain (recursive, with cycle detection)
  // 3. Current style properties
  // 4. Direct formatting (highest priority)
}
```

### 5.3 Style Types

| Type | Scope | Example |
|---|---|---|
| Paragraph | Block-level | Normal, Heading1, ListParagraph |
| Character | Inline | Hyperlink, Strong, Emphasis |
| Table | Table-wide | TableGrid, ListTable |
| Numbering | List definition | NoList, ArticleNumbering |

---

## 6. Numbering Engine

### 6.1 OOXML Numbering Structure

```xml
<w:numbering>
  <w:abstractNum w:abstractNumId="0">
    <w:lvl w:ilvl="0">
      <w:numFmt w:val="decimal"/>
      <w:lvlText w:val="%1."/>
      <w:lvlJc w:val="left"/>
    </w:lvl>
    <w:lvl w:ilvl="1">
      <w:numFmt w:val="lowerLetter"/>
      <w:lvlText w:val="(%2)"/>
    </w:lvl>
  </w:abstractNum>
  <w:num w:numId="1">
    <w:abstractNumId w:val="0"/>
    <w:lvlOverride w:ilvl="0">
      <w:startOverride w:val="1"/>
    </w:lvlOverride>
  </w:num>
</w:numbering>
```

### 6.2 Resolution

```typescript
class NumberingEngine {
  // Paragraph references: w:pPr → w:numPr → { numId, ilvl }
  // Resolution: numId → abstractNumId → lvl[ilvl] → lvlText

  resolve(numPr: NumberingProperties): string
  // Returns: "Điều 1." or "(a)" or "1.1." etc.

  // Handle restart
  getRestartInfo(numId: number, ilvl: number): RestartInfo
}
```

---

## 7. Layout Engine

### 7.1 Units

```
Word uses twips (twentieth of a point):
  1 twip = 1/20 pt = 1/1440 inch
  1 cm = 566.93 twips
  1 inch = 1440 twips

Font size in half-points:
  12pt = 24 half-points

Images in EMU:
  1 EMU = 1/914400 inch
  1 cm = 360000 EMU
```

### 7.2 Text Measurement

```typescript
class OoxmlTextMeasure {
  // Measure run width in twips (for line breaking)
  measureRun(text: string, rPr: ResolvedRunProperties): RunMetrics {
    // 1. Resolve font (rFonts → theme → system fallback)
    // 2. Get font metrics (ascent, descent, avgCharWidth)
    // 3. Calculate width: sum of character advances
    // 4. Apply kerning, spacing, scaling
    return { widthTwip, widthPx, heightTwip, ascent, descent }
  }
}
```

### 7.3 Line Breaking

```typescript
class LineBreaker {
  // Word-compatible line breaking
  breakParagraph(
    runs: Run[],
    availableWidthTwip: number,
    jc: Justification,
    spacing: Spacing
  ): Line[]

  // Break opportunities: space, hyphen, CJK character boundary
  // Justification: distribute extra space across expandable chars
}
```

### 7.4 Pagination

```typescript
class OoxmlPagination {
  // Section-aware pagination
  paginate(sections: SectionLayout[], defaults: PageDefaults): Page[]

  // Properties applied:
  // - keepNext: paragraph stays with next paragraph
  // - keepLines: all lines of paragraph on same page
  // - pageBreakBefore: force page break
  // - widowControl: min lines at top/bottom of page
  // - sectPr: page geometry, columns
}
```

### 7.5 Header/Footer Layout

```typescript
class HeaderFooterLayout {
  // Three variants per section
  getHeader(pageNumber: number, section: Section): HeaderLayout
  getFooter(pageNumber: number, section: Section): FooterLayout

  // Selection logic:
  // 1. If titlePg && pageNumber === 1 → first header
  // 2. If evenAndOddHeaders && pageNumber % 2 === 0 → even header
  // 3. Otherwise → default header
}
```

---

## 8. Render Engine

### 8.1 Canvas Painter

```typescript
class OoxmlPainter {
  paintPage(ctx: CanvasRenderingContext2D, page: LayoutPage): void

  // For each block in page:
  //   - Resolve final properties (style cascade)
  //   - Draw text with correct font, size, color
  //   - Draw decorations (underline, strikethrough, highlights)
  //   - Draw images with correct position and size
  //   - Draw table borders and cell backgrounds
}
```

### 8.2 Selection Model

```typescript
class OoxmlSelection {
  // Map screen (x,y) → Character Position (CP) in OOXML
  hitTest(x: number, y: number, layout: LayoutTree): CharacterPosition

  // Map CP → screen coordinates
  getCaretPosition(cp: CharacterPosition, layout: LayoutTree): ScreenPosition

  // Arrow key navigation (Word-compatible behavior)
  moveLeft(sel: Selection): Selection
  moveRight(sel: Selection): Selection
  moveUp(sel: Selection): Selection
  moveDown(sel: Selection): Selection
  moveWordLeft(sel: Selection): Selection
  moveWordRight(sel: Selection): Selection
  moveToLineStart(sel: Selection): Selection
  moveToLineEnd(sel: Selection): Selection
}
```

---

## 9. Storage & Delta

### 9.1 Delta Storage

```typescript
class OoxmlDeltaStorage {
  // Create delta from OOXML changes
  createDelta(previous: OoxmlPackage, current: OoxmlPackage): OoxmlDelta

  // Apply delta to OOXML package
  applyDelta(base: OoxmlPackage, delta: OoxmlDelta): OoxmlPackage

  // Delta format: array of operations on OOXML tree
  // { type: 'insert' | 'delete' | 'replace', path: number[], content: OoxmlNode }
}
```

### 9.2 Autosave

```typescript
class OoxmlAutoSave {
  // Delta-based autosave
  updateState(doc: OoxmlPackage): void  // Track changes
  forceSave(): Promise<void>            // Debounced delta save

  // Performance target: < 500ms for 500-page documents
}
```

---

## 10. Collaboration

### 10.1 OT on OOXML Tree

```typescript
class OoxmlOT {
  // Transform two concurrent operations
  transform(op1: Operation, op2: Operation): [Operation, Operation]

  // Works on OOXML Character Positions (CP)
  // Each operation specifies: position in OOXML tree + content change
}
```

### 10.2 Track Changes

```typescript
// OOXML stores revisions inline:
// <w:ins w:id="0" w:author="Author" w:date="2024-01-01">
//   <w:r><w:t>inserted text</w:t></w:r>
// </w:ins>

class RevisionEngine {
  recordInsert(range: CharacterRange, content: OoxmlContent, author: string): void
  recordDelete(range: CharacterRange, author: string): void
  acceptRevision(doc: OoxmlPackage, revisionId: string): OoxmlPackage
  rejectRevision(doc: OoxmlPackage, revisionId: string): OoxmlPackage
}
```

---

## 11. Round-trip Fidelity

### 11.1 Validation Method

```bash
# Round-trip test
DOCX_original → Kindy parse → Kindy serialize → DOCX_roundtrip

# Visual comparison
compare DOCX_original vs DOCX_roundtrip in Word
# pixel diff < threshold = PASS
```

### 11.2 Feature Preservation

| Feature | Status | Notes |
|---|---|---|
| Paragraphs + styles | ✅ Full | Cascade resolved |
| Character styles | 🔨 TODO | P0 priority |
| Numbering lvlText | 🔨 TODO | P0 priority |
| Theme fonts | 🔨 TODO | P0 priority |
| Tables (grid/merge) | ✅ Full | Nested tables ✅ |
| Table styles | 🔨 TODO | P1 priority |
| Sections | ✅ Full | pgSz, pgMar, cols |
| Headers/Footers | ✅ Full | 3 variants |
| Inline images | ✅ Full | DrawingML + VML |
| Floating images | 🔨 TODO | P1 priority |
| Track changes | ✅ Full | ins/del round-trip |
| Comments | ✅ Full | Thread + replies |
| Page geometry | ✅ Full | twips-based |
| Tab stops | ✅ Full | With leaders |

---

## 12. Non-functional Requirements

### 12.1 Fidelity

| Metric | Target |
|---|---|
| Round-trip structural match | > 95% for SharePoint documents |
| Visual similarity vs Word | < 5px deviation on text positioning |
| Numbering accuracy | 100% for common patterns |
| Style preservation | 100% for paragraph + character styles |

### 12.2 Performance

| Metric | Target |
|---|---|
| Import 100-page DOCX | ≤ 3s |
| Import 500-page DOCX | ≤ 15s |
| Typing latency p95 | ≤ 50ms |
| Autosave (delta) | ≤ 500ms |
| Memory 500 pages | ≤ 200MB |

### 12.3 Compatibility

| Source | Requirement |
|---|---|
| Microsoft Word 2016+ | Full support |
| SharePoint Online | Full support |
| Google Docs (DOCX export) | High compatibility |
| LibreOffice (DOCX export) | Medium compatibility |

---

## Appendix: References

- [ECMA-376](https://www.ecma-international.org/publications-and-standards/standards/ecma-376/) — OOXML standard (5 parts, 6755+ pages)
- [MS-DOCX](https://learn.microsoft.com/en-us/openspecs/office_standards/ms-docx) — Word extensions
- [ooxml.dev](https://ooxml.dev) — Interactive spec explorer
- [SuperDoc](https://superdoc.dev) — Open-source OOXML-native renderer
- [Open XML SDK](https://learn.microsoft.com/en-us/office/open-xml/open-xml-sdk) — .NET reference
