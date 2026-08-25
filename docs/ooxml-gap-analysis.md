# OOXML Fidelity Gap Analysis

> Date: 2026-08-24
> Status: Current

---

## Executive Summary

Phân tích chi tiết những gì Kindy Editor hiện tại **làm được** và **chưa làm được** so với Microsoft Word khi xử lý DOCX files.

**Top 3 vấn đề nghiêm trọng nhất cho SharePoint documents:**

1. **Character styles chưa resolve** — Hyperlink, Strong, Intense Reference → formatting sai
2. **Numbering lvlText mất** — "Điều %1.", "(a)", "1.1." → tất cả numbered list hiển thị sai
3. **Theme fonts chưa resolve** — `majorHAnsi`, `minorEastAsia` → sai font toàn bộ document

---

## Gap Analysis Chi tiết

### 1. STYLES — Impact: HIGH

**Hiện tại (`src/codecs/docx.ts:516-567`):**
- ✅ Parse `docDefaults`, `pPrDefault`, `rPrDefault`
- ✅ Resolve paragraph styles với `basedOn` chain (có cycle detection)
- ✅ Merge paragraph format: defaults → style → direct
- ✅ Tab stop deduplication

**Thiếu:**
- ❌ **Character styles (`w:type="character"`)** — Line 530 filter: `if (wordAttribute(style, 'type') !== 'paragraph') continue` → character styles bị ignore hoàn toàn
- ❌ **Table styles (`w:type="table"`)** — Cũng bị filter ở line 530
- ❌ **Linked styles** — Paragraph + run defaults
- ❌ **Numbering styles** — Không parse
- ❌ **Latent styles / style aliases** — Không handle

**Ví dụ thực tế:**
```xml
<!-- Word document: hyperlink -->
<w:p>
  <w:r>
    <w:rPr>
      <w:rStyle w:val="Hyperlink"/>  <!-- character style -->
    </w:rPr>
    <w:t>Click here</w:t>
  </w:r>
</w:p>

<!-- Kindy hiện tại: không resolve "Hyperlink" style -->
<!-- → text hiển thị như plain text, không có underline/blue color -->
```

---

### 2. NUMBERING — Impact: HIGH

**Hiện tại (`src/codecs/docx.ts:709-725`):**
- ✅ Parse `numId` → abstract kind (bullet | number)
- ✅ List nesting theo `ilvl`
- ✅ Export hardcoded `%1.` through `%9.`

**Thiếu:**
- ❌ **`w:lvlText` patterns** — "%1.%2.", "(a)", "I.", "(I)", "Article %1" bị discard
- ❌ **Restart rules** (`w:numRestart`) — restart/continue/never
- ❌ **Override numbering** (`w:lvlOverride` → `w:startOverride`)
- ❌ **Format types** — Chỉ có decimal + bullet. Thiếu: upperLetter, lowerLetter, upperRoman, lowerRoman, decimalZero, chineseCounting...
- ❌ **Restart at specific level** — `ilvl` going backward không restart parent

**Ví dụ thực tế:**
```xml
<!-- Vietnamese government document -->
<w:numbering>
  <w:abstractNum w:abstractNumId="0">
    <w:lvl w:ilvl="0">
      <w:numFmt w:val="decimal"/>
      <w:lvlText w:val="Điều %1."/>  <!-- MẤT khi import -->
    </w:lvl>
    <w:lvl w:ilvl="1">
      <w:numFmt w:val="lowerLetter"/>
      <w:lvlText w:val="(%2)"/>  <!-- MẤT khi import -->
    </w:lvl>
  </w:abstractNum>
</w:numbering>

<!-- Kindy import: hiển thị "1." thay vì "Điều 1." -->
<!-- Kindy export: mất format gốc, hardcode "%1." -->
```

---

### 3. SECTION BREAKS — Impact: MEDIUM

**Hiện tại (`src/codecs/docx.ts:1187-1219`):**
- ✅ Parse `pgSz`, `pgMar`, orientation
- ✅ Parse `pgNumType` start
- ✅ Parse `w:titlePg` (different first page)
- ✅ Parse `w:headerReference`/`w:footerReference` (default/first/even)
- ✅ Multiple sections tracked

**Thiếu:**
- ❌ **`w:cols`** (multi-column) — Không parse
- ❌ **Page borders** (`w:pgBorders`) — Không parse
- ⚠️ **Continuous break** — Supported nhưng content flow (column-based) không handle

**Impact:** Multi-column layout hiếm trong hợp đồng. Header/footer per section hoạt động tốt.

---

### 4. TABLES — Impact: MEDIUM-HIGH

**Hiện tại (`src/codecs/docx.ts:995-1129`):**
- ✅ Parse `tblGrid`, `gridCol` widths
- ✅ Parse `tblW`, `tblInd`, `tblBorders`, alignment
- ✅ `vMerge` với restart/continue
- ✅ `gridSpan` (colspan)
- ✅ Per-cell: `tcW`, `tcMar`, `vAlign`, `shd`
- ✅ `tblHeader`, `cantSplit`

**Thiếu:**
- ❌ **Nested tables** — Line 1102-1104 filter: `child.localName === 'p'` → table inside cell bị drop
- ❌ **Table styles** (`w:tblStyle`) — Không parse/apply
- ❌ **Table borders per edge** — Chỉ lấy first visible border
- ❌ **Cell borders** — Không parse
- ❌ **Table caption** (`w:tblCaption`) — Không handle

**Ví dụ:**
```xml
<!-- Nested table in real document -->
<w:tc>
  <w:tbl>
    <w:tblGrid>...</w:tblGrid>
    <w:tr><w:tc><w:p>...</w:p></w:tc></w:tr>
  </w:tbl>
</w:tc>

<!-- Kindy: inner table bị drop hoàn toàn -->
```

---

### 5. TRACK CHANGES — Impact: LOW-MEDIUM

**Hiện tại (`src/codecs/docx.ts:813-821`):**
- ✅ `w:ins` / `w:del` round-trip
- ✅ v2.2 profile support
- ✅ Tested in `docx.test.js:406-430`

**Thiếu:**
- ❌ **Move-from/move-to** — Treated as delete+insert
- ❌ **Paragraph revisions** (`w:pPrChange`) — Not handled
- ❌ **Format revisions** (`w:rPrChange`) — Not handled
- ❌ **Cell/table revisions** — Not handled

---

### 6. IMAGES — Impact: MEDIUM

**Hiện tại (`src/codecs/docx.ts:643-707`):**
- ✅ Inline images (`wp:inline`)
- ✅ VML images (`v:imagedata`)
- ✅ `mc:AlternateContent` fallback
- ✅ Image dimensions from `wp:extent` (EMU)
- ✅ Image data as data URLs

**Thiếu:**
- ❌ **Floating images** (`wp:anchor`) — Detected at line 214-219 nhưng flattened to inline
- ❌ **Text wrapping** — `wp:wrapNone`, `wp:wrapSquare`, etc.
- ❌ **Image position** — `wp:positionH`, `wp:positionV`
- ❌ **Image cropping** (`a:srcRect`)
- ❌ **Image rotation**

---

### 7. HEADERS/FOOTERS — Impact: LOW

**Hiện tại (`src/codecs/docx.ts:1157-1185`):**
- ✅ Three variants: default, first, even
- ✅ Different first page (`w:titlePg`)
- ✅ Different odd/even (`w:evenAndOddHeaders`)
- ✅ Header/footer images (via `parseRelatedDocument`)
- ✅ Export writes all three variants
- ✅ Tested in `docx.test.js:338-404`

**Thiếu:**
- ⚠️ **Complex fields** — `PageNumber.CURRENT` hardcoded, NUMPAGES/DATE lost

---

### 8. FONTS — Impact: MEDIUM

**Hiện tại (`src/codecs/docx.ts:462-463, 476-479`):**
- ✅ Parse `rFonts`: ascii, hAnsi, eastAsia, cs
- ✅ Store in `textStyle.fontFamily` mark
- ✅ Vietnamese font preference (eastAsia)

**Thiếu:**
- ❌ **Theme fonts** — `w:themeFont` references not resolved
- ❌ **Font substitutions** — `w:font` with `w:hint`
- ❌ **Font fallback chain** — Only first font name used

---

### 9. PAGE GEOMETRY — Impact: LOW

**Hiện tại (`src/codecs/docx.ts:1195-1206`):**
- ✅ `pgSz` w/h, orientation, landscape normalization
- ✅ `pgMar` all margins in twips → cm
- ✅ `pgNumType` start
- ✅ Tested in `docx.test.js:68-109, 327-336`

**Thiếu:**
- ❌ **Page borders** (`w:pgBorders`)
- ❌ **Page color** (`w:background`)
- ❌ **Line numbers** (`w:lnNumType`)

---

### 10. TEXT METRICS — Impact: MEDIUM

**Hiện tại:**
- ✅ Line height stored (twips or proportional)
- ✅ Tab stops preserved with position/alignment
- ✅ Indentation in twips

**Thiếu:**
- ❌ **No actual text measurement** — No canvas-based width calculation
- ❌ **Kerning, tracking** — Run-level `w:spacing` not parsed
- ⚠️ **Line spacing** — `atLeast` vs `exact` distinction partial

---

## Feature Preservation Matrix

| Feature | Import | Editing | Export | Fidelity |
|---|---|---|---|---|
| Paragraphs + styles | ✅ | ✅ | ✅ | 100% |
| Character styles | ❌ | ❌ | ✅ | 0% → cần fix |
| Numbering lvlText | ❌ | ✅ | ❌ | 0% → cần fix |
| Theme fonts | ❌ | ❌ | ✅ | 0% → cần fix |
| Tables (grid/merge) | ✅ | ✅ | ✅ | 95% |
| Table styles | ❌ | ❌ | ✅ | 0% → cần fix |
| Sections | ✅ | ✅ | ✅ | 95% |
| Headers/Footers | ✅ | ✅ | ✅ | 95% |
| Inline images | ✅ | ✅ | ✅ | 100% |
| Floating images | ❌ | ⚠️ | ✅ | 0% → cần fix |
| Track changes (ins/del) | ✅ | ✅ | ✅ | 90% |
| Comments | ✅ | ✅ | ✅ | 90% |
| Page geometry | ✅ | ✅ | ✅ | 100% |
| Tab stops | ✅ | ✅ | ✅ | 100% |
| Page borders | ❌ | — | ❌ | 0% |
| Columns | ❌ | ⚠️ | ❌ | 0% |
| Footnotes/Endnotes | ❌ | ⚠️ | ❌ | 0% |

---

## Priority Fix Order

### P0 — Critical (SharePoint documents break)

1. `Character styles` — resolve `w:rStyle` references
2. `Numbering lvlText` — parse `w:lvlText` patterns
3. `Theme fonts` — resolve theme font references

### P1 — High (Significant fidelity loss)

4. `Floating images` — parse `wp:anchor` + text wrapping
5. `Table styles` — parse `w:tblStyle` and apply
6. `Font fallback chain` — use all font names

### P2 — Medium (Polish)

7. `Page borders` — parse `w:pgBorders`
8. `Multi-column` — parse `w:cols`
9. `Footnotes/Endnotes` — parse sub-documents

### P3 — Nice-to-have

10. `Complex fields` — TOC, DATE, NUMPAGES
11. `Content controls (SDT)` — form fields
12. `Equations` — Office MathML
