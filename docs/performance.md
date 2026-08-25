# Hiệu năng & OOXML Fidelity

## Mục tiêu kép

Kindy Editor phải đạt **2 mục tiêu cùng lúc**:

1. **Performance**: Mở/nhập/sửa tài liệu lớn mượt mà
2. **Fidelity**: Kết quả hiển thị và export phải giống Microsoft Word nhất có thể

---

## OOXML Fidelity — Vấn đề thực tế

### Tài liệu SharePoint

Tài liệu trên SharePoint thường được tạo bởi Microsoft Word nên chứa đầy đủ OOXML features:

| Feature | Ảnh hưởng khi mất |
|---|---|
| Character styles (Hyperlink, Strong) | Link hiển thị sai format |
| Numbering lvlText ("Điều %1.", "(a)") | Danh sách numbered mất định dạng |
| Theme fonts (majorHAnsi, minorEastAsia) | Sai font toàn bộ document |
| Table styles | Bảng mất format template |
| Floating images | Ảnh logo/positioned collapse thành inline |
| Section breaks (continuous) | Mất layout multi-section |
| Headers/Footers per section | Sai header/footer trên mỗi trang |
| Page borders | Mất viền trang |
| Columns | Mất layout multi-column |

### Gap Analysis hiện tại

| # | Feature | Implemented | Missing | Impact |
|---|---------|------------|---------|--------|
| 1 | **Styles** | Paragraph styles + basedOn cascade | Character styles, table styles | **High** |
| 2 | **Numbering** | Basic bullet/number | `lvlText` patterns, restart/override | **High** |
| 3 | **Sections** | pgSz, pgMar, orientation, header/footer | Multi-column, page borders | **Medium** |
| 4 | **Tables** | Grid widths, vMerge, gridSpan, cell margins | Nested tables, table styles | **Medium** |
| 5 | **Track Changes** | `w:ins`/`w:del` round-trip | Move, format revisions | **Low** |
| 6 | **Images** | Inline, VML, AlternateContent | Floating, text wrapping | **Medium** |
| 7 | **Headers/Footers** | 3 variants, images | Complex fields | **Low** |
| 8 | **Fonts** | Per-run rFonts | Theme fonts, fallback chain | **Medium** |
| 9 | **Page geometry** | pgSz, pgMar, pgNumType | Page borders, columns | **Low** |
| 10 | **Text metrics** | Line height, tab stops | Word-compatible measurement | **Medium** |

---

## Priority Order —那些 SharePoint documents break

### P0 — Critical

1. **Character style resolution** — Hyperlink, Strong, Intense Reference
2. **Numbering lvlText patterns** — "Điều %1.", "(a)", "1.1.", "I.", "(I)"
3. **Theme fonts** — `majorHAnsi`, `minorEastAsia` references

### P1 — High

4. **Floating images** — logos, positioned images, watermarks
5. **Table styles** — template formatting
6. **Font fallback chain** — multiple fonts per run

### P2 — Medium

7. **Page borders** — decorative elements
8. **Multi-column layouts** — newsletter-style documents
9. **Footnotes/Endnotes** — academic/legal documents

---

## Performance — OOXML-native approach

### Tại sao OOXML-native cũng giúp performance

| ProseMirror approach | OOXML-native approach |
|---|---|
| Parse OOXML → ProseMirror (convert) | Parse OOXML → OoxmlPackage (trực tiếp) |
| Layout từ ProseMirror nodes | Layout từ OOXML properties |
| Save: serialize ProseMirror → OOXML | Save: serialize OoxmlPackage → OOXML |
| Double work cho round-trip | Single parse, single serialize |

### Performance targets

| Metric | Current | Target |
|---|---|---|
| Import 100 trang | ~3s | ≤ 3s |
| Import 500 trang | ~15s | ≤ 15s |
| Typing latency p95 | ~30ms | ≤ 50ms |
| Autosave (delta) | ~200ms | ≤ 500ms |
| Memory 500 trang | ~150MB | ≤ 200MB |

### Optimization strategies

1. **Streaming parse**: Parse OOXML chunks, yield blocks incrementally
2. **Lazy style resolution**: Only resolve styles for visible paragraphs
3. **Incremental layout**: Only re-layout dirty sections
4. **Worker offload**: Parse, layout, serialize in Web Workers
5. **Delta storage**: Only save changed operations

---

## Benchmark — DOCX from SharePoint

### Test fixtures cần có

| # | Source | Description | Features tested |
|---|---|---|---|
| 1 | Simple contract | 10 trang, text + headings | Basic |
| 2 | Complex contract | 50 trang, tables + numbering | Tables, lists |
| 3 | Legal document | 100 trang, multi-section | Sections, headers/footers |
| 4 | Template with styles | 20 trang, custom styles | Style cascade |
| 5 | Document with images | 30 trang, inline + floating | Images |
| 6 | Track changes doc | 20 trang, revisions | Revisions |
| 7 | Vietnamese government | 80 trang, "Điều %1." numbering | Numbering lvlText |
| 8 | Corporate template | 40 trang, theme fonts | Theme resolution |

### Comparison method

```
1. Open DOCX in Microsoft Word → screenshot each page
2. Open DOCX in Kindy → screenshot each page
3. Pixel diff comparison
4. Target: < 5px deviation on text positioning
5. Target: < 10px deviation on image positioning
```

---

## Checklist trước production

- [ ] Round-trip test: DOCX → Kindy → DOCX → Word (structural match)
- [ ] Visual test: Compare screenshots with Word (pixel diff)
- [ ] P0 features: Character styles, numbering lvlText, theme fonts
- [ ] P1 features: Floating images, table styles
- [ ] Performance: Import + typing + autosave targets met
- [ ] SharePoint documents: Test with real files from SharePoint
- [ ] Vietnamese documents: Test with "Điều %1." numbering
- [ ] Font loading: Correct fonts loaded from document
- [ ] Edge cases: Empty paragraphs, nested tables, complex merges
